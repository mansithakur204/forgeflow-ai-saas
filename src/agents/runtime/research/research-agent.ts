// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Research Agent
// Implements Knowledge retrieval (RAG), Unified Memory, and Context compilation.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAgent } from "../base-agent";
import type { AgentStatus, AgentRole } from "../../types/agent";
import type { AgentSession } from "../../types/session";
import type {
  ResearchConfiguration,
  ResearchContext,
  ResearchResult,
  ResearchStatus,
  ResearchKnowledgeReference,
  ResearchMemoryReference,
  ResearchRankedSource,
} from "../../types/research";
import { UnifiedMemoryRetrievalEngine } from "../memory/unified-memory-retrieval";

export class ResearchAgent extends BaseAgent {
  private configOverride: ResearchConfiguration = {};
  private memoryRetrievalEngine?: UnifiedMemoryRetrievalEngine;
  private customKnowledgeSearchFn?: (query: string) => Promise<ResearchKnowledgeReference[]>;

  constructor() {
    super({
      id: "research-agent",
      metadata: {
        id: "research-agent",
        name: "Research Agent",
        description: "Specialized agent for knowledge retrieval, memory queries, and context consolidation.",
        version: "2.0.0",
        author: "ForgeFlow AI",
      },
      capabilities: {
        canPlan: false,
        canExecute: false,
        canSearchCode: true,
        canEditCode: false,
        canAccessMemory: true,
        canUseTools: true,
      },
      role: "researcher" as AgentRole,
    });
  }

  /**
   * Overrides search constraints and result counts.
   */
  setConfiguration(config: ResearchConfiguration): void {
    this.configOverride = {
      maxKnowledgeResults: 5,
      maxMemoryResults: 5,
      minScoreThreshold: 0.5,
      enableRAG: true,
      ...config,
    };
  }

  /**
   * Task 14.3C: Bind UnifiedMemoryRetrievalEngine
   */
  registerMemoryRetrievalEngine(engine: UnifiedMemoryRetrievalEngine): void {
    this.memoryRetrievalEngine = engine;
  }

  /**
   * Task 14.3B: Bind custom Knowledge Search Handler
   */
  registerKnowledgeSearchHandler(handler: (query: string) => Promise<ResearchKnowledgeReference[]>): void {
    this.customKnowledgeSearchFn = handler;
  }

  async executeStep(session: AgentSession, input: string) {
    const logger: any = session.context.variables.logger || console;
    const agentId = this.getConfig().id;

    // ── Telemetry: Emit RESEARCH_STARTED ──
    logger.info(`Research agent started execution`, { event: "RESEARCH_STARTED", query: input }, agentId);

    // Initialize Research Context (Task 14.3A)
    const context: ResearchContext = {
      query: input,
      variables: { ...session.context.variables },
      status: "searching_knowledge" as ResearchStatus,
      foundKnowledgeSources: [],
      foundMemoryEntries: [],
    };

    const maxKnowledge = this.configOverride.maxKnowledgeResults ?? 5;
    const maxMemory = this.configOverride.maxMemoryResults ?? 5;
    const scoreThreshold = this.configOverride.minScoreThreshold ?? 0.5;

    // ── Task 14.3B: Knowledge Search & Telemetry: Emit KNOWLEDGE_SEARCH_STARTED ──
    logger.info(`Knowledge retrieval search started`, { event: "KNOWLEDGE_SEARCH_STARTED", query: input }, agentId);

    let knowledgeRefs: ResearchKnowledgeReference[] = [];
    if (this.customKnowledgeSearchFn) {
      const allRefs = await this.customKnowledgeSearchFn(input);
      knowledgeRefs = allRefs.filter(ref => ref.score >= scoreThreshold).slice(0, maxKnowledge);
    } else {
      // Mocked Vector/RAG citation response if no custom handler is bound
      knowledgeRefs = [
        {
          sourceId: "doc-forge-api",
          title: "ForgeFlow REST API specifications",
          score: 0.92,
          citation: "[Forge API Ref L42] - Endpoint authentication relies on Integration SDK Connection Manager.",
        },
        {
          sourceId: "doc-workflow-runner",
          title: "Workflow Engine Execution Guide",
          score: 0.78,
          citation: "[Workflow Runner Sec 3] - Nodes are topologically ordered based on dependency graph validation.",
        },
        {
          sourceId: "doc-knowledge-rag",
          title: "RAG Vector Store Integration Manual",
          score: 0.65,
          citation: "[RAG Guide Ch 2] - Query embeddings are generated using the standard Embedding Provider.",
        },
      ].filter(ref => ref.score >= scoreThreshold).slice(0, maxKnowledge);
    }

    context.foundKnowledgeSources = knowledgeRefs.map(ref => ref.sourceId);

    // ── Task 14.3C: Memory Search & Telemetry: Emit MEMORY_SEARCH_STARTED ──
    context.status = "searching_memory";
    logger.info(`Memory retrieval search started`, { event: "MEMORY_SEARCH_STARTED", query: input }, agentId);

    let memoryRefs: ResearchMemoryReference[] = [];
    if (this.memoryRetrievalEngine) {
      // Query the unified memory retrieval engine
      const conversationId = String(session.context.variables.conversationId || "global");
      const memoryEntries = await this.memoryRetrievalEngine.retrieve(
        input,
        { conversationId, minImportance: scoreThreshold },
        {},
        maxMemory
      );
      memoryRefs = memoryEntries.map(entry => ({
        memoryId: entry.id,
        content: entry.value,
        score: entry.importance,
        timestamp: entry.updatedAt,
      }));
    } else {
      // Mocked Working/Conv memory context reference
      memoryRefs = [
        {
          memoryId: "mem-step-1",
          content: "Planner Agent generated sequential plan plan-7849.",
          score: 0.85,
          timestamp: new Date().toISOString(),
        },
        {
          memoryId: "mem-step-2",
          content: "Previous Slack Executor node was refactored and registered successfully.",
          score: 0.72,
          timestamp: new Date().toISOString(),
        },
      ].filter(ref => ref.score >= scoreThreshold).slice(0, maxMemory);
    }

    context.foundMemoryEntries = memoryRefs.map(ref => ref.memoryId);

    // ── Task 14.3D: Context Builder & Telemetry: Emit CONTEXT_BUILT ──
    context.status = "building_context";

    // Deduplicate and rank sources
    const rankedSources: ResearchRankedSource[] = [];
    knowledgeRefs.forEach(ref => {
      rankedSources.push({ name: ref.title, score: ref.score, type: "knowledge" });
    });
    memoryRefs.forEach(ref => {
      rankedSources.push({ name: `Memory: ${ref.memoryId}`, score: ref.score, type: "memory" });
    });

    // Sort ranked sources descending
    rankedSources.sort((a, b) => b.score - a.score);

    // Consolidated context content (Deduplicated context string)
    const uniqueSegments = new Set<string>();
    knowledgeRefs.forEach(ref => uniqueSegments.add(ref.citation));
    memoryRefs.forEach(ref => uniqueSegments.add(ref.content));

    const consolidatedContext = Array.from(uniqueSegments).join("\n\n");

    // Calculate overall confidence score
    const scores = [...knowledgeRefs.map(k => k.score), ...memoryRefs.map(m => m.score)];
    const confidenceScore = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 1.0;

    logger.info(`Research context compilation complete`, {
      event: "CONTEXT_BUILT",
      knowledgeCount: knowledgeRefs.length,
      memoryCount: memoryRefs.length,
      confidenceScore,
    }, agentId);

    context.status = "completed";

    // ── Telemetry: Emit RESEARCH_COMPLETED ──
    logger.info(`Research agent finished execution`, { event: "RESEARCH_COMPLETED", confidenceScore }, agentId);

    const researchResult: ResearchResult = {
      query: input,
      context: consolidatedContext,
      knowledgeReferences: knowledgeRefs,
      memoryReferences: memoryRefs,
      rankedSources,
      confidenceScore,
      success: true,
    };

    return {
      output: `Research context compiled successfully. Score: ${confidenceScore}. Found ${knowledgeRefs.length} knowledge refs and ${memoryRefs.length} memory refs.`,
      newStatus: "completed" as AgentStatus,
      metadata: {
        researchResult,
        researchContext: context,
      },
    };
  }
}
