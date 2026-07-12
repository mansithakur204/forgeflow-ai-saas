import type { IMemoryProvider } from "./memory-provider.interface";
import type { MemoryEntry } from "../../types/memory";
import { MemoryRetrievalEngine } from "./memory-retrieval";

export class WorkingMemoryManager {
  private provider: IMemoryProvider;

  constructor(provider: IMemoryProvider) {
    this.provider = provider;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs ? new Date(Date.now() + ttlMs).toISOString() : null;
    const entry: MemoryEntry = {
      id: `working-${key}-${Date.now()}`,
      type: "working",
      key,
      value,
      importance: 0.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt,
    };
    await this.provider.store(entry);
  }

  async get(key: string): Promise<string | null> {
    const query = { type: "working" as const, key };
    const matches = await this.provider.search(query);
    return matches.length > 0 ? matches[0].value : null;
  }

  async clear(): Promise<void> {
    const list = await this.provider.search({ type: "working" });
    for (const e of list) {
      await this.provider.delete(e.id);
    }
  }
}

export class ConversationMemory {
  private provider: IMemoryProvider;

  constructor(provider: IMemoryProvider) {
    this.provider = provider;
  }

  async addMessage(sessionId: string, sender: string, message: string): Promise<void> {
    const entry: MemoryEntry = {
      id: `msg-${sessionId}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type: "conversation",
      key: sender,
      value: message,
      importance: 0.4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: null,
      metadata: {
        tags: [`session:${sessionId}`],
      },
    };
    await this.provider.store(entry);
  }

  async getHistory(sessionId: string): Promise<MemoryEntry[]> {
    const query = {
      type: "conversation" as const,
      tags: [`session:${sessionId}`],
    };
    const results = await this.provider.search(query);
    return results.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }
}

export class EpisodicMemory {
  private provider: IMemoryProvider;
  private retrieval: MemoryRetrievalEngine;

  constructor(provider: IMemoryProvider) {
    this.provider = provider;
    this.retrieval = new MemoryRetrievalEngine(provider);
  }

  async recordEpisode(
    taskId: string,
    description: string,
    outcome: string,
    success: boolean
  ): Promise<void> {
    const importance = this.retrieval.calculateImportance(taskId, outcome);
    const entry: MemoryEntry = {
      id: `episode-${taskId}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type: "episodic",
      key: taskId,
      value: `Description: ${description} | Outcome: ${outcome}`,
      importance,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: null,
      metadata: { success },
    };
    await this.provider.store(entry);
  }

  async getEpisode(taskId: string): Promise<MemoryEntry | null> {
    const query = { type: "episodic" as const, key: taskId };
    const results = await this.provider.search(query);
    return results.length > 0 ? results[0] : null;
  }
}

export class SemanticMemory {
  private provider: IMemoryProvider;

  constructor(provider: IMemoryProvider) {
    this.provider = provider;
  }

  async learnFact(key: string, fact: string): Promise<void> {
    const entry: MemoryEntry = {
      id: `semantic-${key.toLowerCase().trim()}`,
      type: "semantic",
      key,
      value: fact,
      importance: 0.7,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: null,
    };
    await this.provider.store(entry);
  }

  async recallFact(key: string): Promise<string | null> {
    const query = { type: "semantic" as const, key };
    const results = await this.provider.search(query);
    return results.length > 0 ? results[0].value : null;
  }
}

export class LongTermMemoryManager {
  public episodic: EpisodicMemory;
  public semantic: SemanticMemory;
  private provider: IMemoryProvider;

  constructor(provider: IMemoryProvider) {
    this.provider = provider;
    this.episodic = new EpisodicMemory(provider);
    this.semantic = new SemanticMemory(provider);
  }

  async search(query: string, limit: number = 5): Promise<MemoryEntry[]> {
    const retrieval = new MemoryRetrievalEngine(this.provider);
    return retrieval.retrieveRelevant({
      keywords: query.split(" "),
      limit,
    });
  }
}
