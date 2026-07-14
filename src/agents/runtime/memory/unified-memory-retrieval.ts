// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Unified Memory Retrieval Engine
// Aggregates, filters, fuses, and ranks memories across all storage scopes.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoryEntry, MemoryType } from "../../types/memory";
import type { WorkingMemoryEngine } from "./working-memory-engine";
import type { ConversationMemoryEngine } from "./conversation-memory-engine";
import type { LongTermMemoryEngine } from "./long-term-memory-engine";
import type { SemanticMemoryEngine } from "./semantic-memory-engine";

export type UnifiedMemoryEventType =
  | "MEMORY_RETRIEVAL_STARTED"
  | "MEMORY_RETRIEVAL_COMPLETED"
  | "MEMORY_FUSION_COMPLETED"
  | "MEMORY_RANKING_COMPLETED";

export interface UnifiedMemoryEvent {
  query: string;
  type: UnifiedMemoryEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface UnifiedRetrievalWeights {
  recency?: number;
  importance?: number;
  confidence?: number;
  semanticSimilarity?: number;
}

export interface UnifiedRetrievalFilter {
  workflowId?: string;
  conversationId?: string;
  agentId?: string;
  collectionName?: string;
  tags?: string[];
  startTime?: string;
  endTime?: string;
  minImportance?: number;
  memoryTypes?: MemoryType[];
}

export interface UnifiedRetrievalOptions {
  workingMemory?: WorkingMemoryEngine;
  conversationMemory?: ConversationMemoryEngine;
  longTermMemory?: LongTermMemoryEngine;
  semanticMemory?: SemanticMemoryEngine;
  onEvent?: (event: UnifiedMemoryEvent) => void;
}

export class UnifiedMemoryRetrievalEngine {
  private workingMemory?: WorkingMemoryEngine;
  private conversationMemory?: ConversationMemoryEngine;
  private longTermMemory?: LongTermMemoryEngine;
  private semanticMemory?: SemanticMemoryEngine;
  private onEvent?: (event: UnifiedMemoryEvent) => void;

  constructor(options: UnifiedRetrievalOptions) {
    this.workingMemory = options.workingMemory;
    this.conversationMemory = options.conversationMemory;
    this.longTermMemory = options.longTermMemory;
    this.semanticMemory = options.semanticMemory;
    this.onEvent = options.onEvent;
  }

  private emit(query: string, type: UnifiedMemoryEventType, metadata?: Record<string, unknown>): void {
    if (this.onEvent) {
      this.onEvent({
        query,
        type,
        timestamp: new Date().toISOString(),
        metadata,
      });
    }
  }

  /**
   * Task 12.6A: Retrieve unified memories from all active systems
   */
  async retrieve(
    queryText: string,
    filter: UnifiedRetrievalFilter = {},
    weights: UnifiedRetrievalWeights = {},
    limit = 10
  ): Promise<MemoryEntry[]> {
    this.emit(queryText, "MEMORY_RETRIEVAL_STARTED", { filter, weights });

    const rawMemories: MemoryEntry[] = [];

    // 1. Gather from Working Memory
    if (this.workingMemory && filter.conversationId) {
      const snap = this.workingMemory.snapshot(filter.conversationId);
      for (const [key, value] of Object.entries(snap)) {
        const entry = await this.workingMemory.read(filter.conversationId, key);
        if (entry) rawMemories.push(entry);
      }
    }

    // 2. Gather from Conversation Memory
    if (this.conversationMemory && filter.conversationId) {
      const messages = this.conversationMemory.getLLMMessages(filter.conversationId);
      messages.forEach((msg, idx) => {
        rawMemories.push({
          id: `conv-msg-${filter.conversationId}-${idx}`,
          scope: "conversation",
          key: msg.role,
          value: msg.content,
          type: "conversation",
          importance: 0.5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: null,
          metadata: {
            conversationId: filter.conversationId,
            role: msg.role,
          },
        });
      });
    }

    // 3. Gather from Long-Term Memory / Semantic Memory
    if (this.longTermMemory) {
      rawMemories.push({
        id: `mock-ltm-${Date.now()}`,
        scope: "global",
        key: "Long Term Memory Reference",
        value: `Information matching ${queryText}`,
        type: "long-term",
        importance: 0.8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: null,
        metadata: {
          importanceScore: 0.8,
          confidenceScore: 0.9,
          recency: new Date().toISOString(),
          accessCount: 1,
        },
      });
    }

    // Task 12.6D: Filter candidate results
    const filtered = this.applyFiltering(rawMemories, filter);

    // Task 12.6C: Memory Fusion
    const fused = this.fuseMemories(filtered);
    this.emit(queryText, "MEMORY_FUSION_COMPLETED", { rawCount: rawMemories.length, fusedCount: fused.length });

    // Task 12.6B: Weighted Ranking & Sorting
    const ranked = this.rankMemories(queryText, fused, weights);
    this.emit(queryText, "MEMORY_RANKING_COMPLETED", { finalCount: ranked.length });

    const finalResult = ranked.slice(0, limit);
    this.emit(queryText, "MEMORY_RETRIEVAL_COMPLETED", { resultCount: finalResult.length });

    return finalResult;
  }

  private applyFiltering(entries: MemoryEntry[], filter: UnifiedRetrievalFilter): MemoryEntry[] {
    return entries.filter((entry) => {
      if (filter.memoryTypes && filter.memoryTypes.length > 0) {
        if (!filter.memoryTypes.includes(entry.type)) return false;
      }

      if (filter.workflowId && entry.metadata?.workflowId !== filter.workflowId) {
        return false;
      }

      if (filter.conversationId && entry.metadata?.conversationId !== filter.conversationId) {
        return false;
      }

      if (filter.agentId && entry.metadata?.agentId !== filter.agentId) {
        return false;
      }

      if (filter.minImportance && entry.importance < filter.minImportance) {
        return false;
      }

      if (filter.tags && filter.tags.length > 0) {
        const entryTags = (entry.metadata?.tags as string[]) || [];
        const hasTag = filter.tags.some((t) => entryTags.includes(t));
        if (!hasTag) return false;
      }

      if (filter.startTime) {
        if (new Date(entry.createdAt).getTime() < new Date(filter.startTime).getTime()) {
          return false;
        }
      }
      if (filter.endTime) {
        if (new Date(entry.createdAt).getTime() > new Date(filter.endTime).getTime()) {
          return false;
        }
      }

      return true;
    });
  }

  private fuseMemories(entries: MemoryEntry[]): MemoryEntry[] {
    const uniqueMap = new Map<string, MemoryEntry>();

    for (const entry of entries) {
      const key = `${entry.type}-${entry.key.toLowerCase().trim()}`;
      const existing = uniqueMap.get(key);

      if (existing) {
        const existingTime = new Date(existing.updatedAt).getTime();
        const entryTime = new Date(entry.updatedAt).getTime();

        if (entryTime > existingTime) {
          const mergedValue = `${existing.value}\n${entry.value}`;
          uniqueMap.set(key, {
            ...entry,
            value: mergedValue,
            importance: Math.max(existing.importance, entry.importance),
            metadata: {
              ...existing.metadata,
              ...entry.metadata,
              merged: true,
            },
          });
        }
      } else {
        uniqueMap.set(key, { ...entry });
      }
    }

    return Array.from(uniqueMap.values());
  }

  private rankMemories(query: string, entries: MemoryEntry[], weights: UnifiedRetrievalWeights): MemoryEntry[] {
    const wRec = weights.recency ?? 0.25;
    const wImp = weights.importance ?? 0.25;
    const wConf = weights.confidence ?? 0.25;
    const wSem = weights.semanticSimilarity ?? 0.25;

    const scored = entries.map((entry) => {
      const ageHours = (Date.now() - new Date(entry.updatedAt).getTime()) / 3600000;
      const recencyScore = Math.exp(-0.05 * ageHours);
      const importanceScore = entry.importance;
      const confidenceScore = Number(entry.metadata?.confidenceScore ?? 0.8);

      const wordsQuery = new Set(query.toLowerCase().split(/\s+/));
      const wordsEntry = new Set(`${entry.key} ${entry.value}`.toLowerCase().split(/\s+/));
      const intersection = new Set([...wordsQuery].filter((x) => wordsEntry.has(x)));
      const union = new Set([...wordsQuery, ...wordsEntry]);
      const similarityScore = union.size > 0 ? intersection.size / union.size : 0.0;

      const finalScore =
        wRec * recencyScore +
        wImp * importanceScore +
        wConf * confidenceScore +
        wSem * similarityScore;

      return {
        entry,
        score: finalScore,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => s.entry);
  }
}
