// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Pluggable Memory Providers (Stubs)
// ─────────────────────────────────────────────────────────────────────────────

import type { IMemoryProvider } from "./memory-provider.interface";
import type {
  MemoryEntry,
  MemorySearchQuery,
  MemoryStatistics,
  MemoryDiagnostics,
} from "../../types/memory";

export class PostgresMemoryProvider implements IMemoryProvider {
  private id: string;

  constructor(id = "postgres-memory") {
    this.id = id;
  }

  getId(): string {
    return this.id;
  }

  async store(entry: MemoryEntry): Promise<void> {
    console.log("[PostgresMemoryProvider] Store requested (architectural placeholder)", entry.id);
  }

  async retrieve(id: string): Promise<MemoryEntry | null> {
    return null;
  }

  async search(query: MemorySearchQuery): Promise<MemoryEntry[]> {
    return [];
  }

  async delete(id: string): Promise<void> {}

  async clear(): Promise<void> {}

  async getStats(): Promise<MemoryStatistics> {
    return {
      totalEntries: 0,
      entriesByType: {
        working: 0,
        "long-term": 0,
        conversation: 0,
        episodic: 0,
        semantic: 0,
      },
      bytesUsed: 0,
      hitsCount: 0,
      missesCount: 0,
    };
  }

  async getDiagnostics(): Promise<MemoryDiagnostics> {
    return {
      providerId: this.id,
      uptimeSeconds: 0,
      isHealthy: true,
    };
  }

  async listEntries(): Promise<MemoryEntry[]> {
    return [];
  }
}

export class RedisMemoryProvider implements IMemoryProvider {
  private id: string;

  constructor(id = "redis-memory") {
    this.id = id;
  }

  getId(): string {
    return this.id;
  }

  async store(entry: MemoryEntry): Promise<void> {
    console.log("[RedisMemoryProvider] Store requested (architectural placeholder)", entry.id);
  }

  async retrieve(id: string): Promise<MemoryEntry | null> {
    return null;
  }

  async search(query: MemorySearchQuery): Promise<MemoryEntry[]> {
    return [];
  }

  async delete(id: string): Promise<void> {}

  async clear(): Promise<void> {}

  async getStats(): Promise<MemoryStatistics> {
    return {
      totalEntries: 0,
      entriesByType: {
        working: 0,
        "long-term": 0,
        conversation: 0,
        episodic: 0,
        semantic: 0,
      },
      bytesUsed: 0,
      hitsCount: 0,
      missesCount: 0,
    };
  }

  async getDiagnostics(): Promise<MemoryDiagnostics> {
    return {
      providerId: this.id,
      uptimeSeconds: 0,
      isHealthy: true,
    };
  }

  async listEntries(): Promise<MemoryEntry[]> {
    return [];
  }
}
