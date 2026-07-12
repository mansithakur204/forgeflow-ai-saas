import type { IMemoryProvider } from "./memory-provider.interface";
import {
  WorkingMemoryManager,
  ConversationMemory,
  LongTermMemoryManager,
} from "./memory-managers";
import { MemoryRetrievalEngine } from "./memory-retrieval";
import { MemoryCompression } from "./memory-compression";
import type { MemoryStatistics, MemoryDiagnostics } from "../../types/memory";
import type { AgentSession } from "../../types/session";

export class AgentMemorySystem {
  public working: WorkingMemoryManager;
  public conversation: ConversationMemory;
  public longTerm: LongTermMemoryManager;

  private provider: IMemoryProvider;
  private retrieval: MemoryRetrievalEngine;
  private compression: MemoryCompression;

  constructor(provider: IMemoryProvider) {
    this.provider = provider;
    this.working = new WorkingMemoryManager(provider);
    this.conversation = new ConversationMemory(provider);
    this.longTerm = new LongTermMemoryManager(provider);
    this.retrieval = new MemoryRetrievalEngine(provider);
    this.compression = new MemoryCompression(provider);
  }

  getProvider(): IMemoryProvider {
    return this.provider;
  }

  getRetrievalEngine(): MemoryRetrievalEngine {
    return this.retrieval;
  }

  getCompressionEngine(): MemoryCompression {
    return this.compression;
  }

  /**
   * Integrates with an AgentSession to inject relevant long-term memory facts.
   */
  async initializeSessionContext(session: AgentSession, queryKeywords: string[]): Promise<void> {
    const relevantMemories = await this.longTerm.search(queryKeywords.join(" "), 3);

    if (relevantMemories.length > 0) {
      session.context.tempMemory = session.context.tempMemory || {};
      session.context.tempMemory.retrievedMemories = relevantMemories.map(
        (m) => `[Key: ${m.key}] ${m.value}`
      );
    }
  }

  /**
   * Records execution outcome and message logs in episodic and conversation memory.
   */
  async finalizeStepExecution(
    sessionId: string,
    agentId: string,
    stepDescription: string,
    output: string,
    success: boolean
  ): Promise<void> {
    // 1. Add dialogue exchanges
    await this.conversation.addMessage(sessionId, "user", stepDescription);
    await this.conversation.addMessage(sessionId, agentId, output);

    // 2. Log episodic experience
    const episodeId = `${agentId}-step-${Date.now()}`;
    await this.longTerm.episodic.recordEpisode(episodeId, stepDescription, output, success);
  }

  async getStats(): Promise<MemoryStatistics> {
    return this.provider.getStats();
  }

  async getDiagnostics(): Promise<MemoryDiagnostics> {
    return this.provider.getDiagnostics();
  }
}
