import type {
  MemoryEntry,
  MemorySearchQuery,
  MemoryStatistics,
  MemoryDiagnostics,
} from "../../types/memory";

export interface IMemoryProvider {
  getId(): string;
  store(entry: MemoryEntry): Promise<void>;
  retrieve(id: string): Promise<MemoryEntry | null>;
  search(query: MemorySearchQuery): Promise<MemoryEntry[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<MemoryStatistics>;
  getDiagnostics(): Promise<MemoryDiagnostics>;
}

export class InMemoryMemoryProvider implements IMemoryProvider {
  private id: string;
  private storeMap = new Map<string, MemoryEntry>();
  private startTime = Date.now();
  private hits = 0;
  private misses = 0;

  constructor(id: string = "default-inmemory") {
    this.id = id;
  }

  getId(): string {
    return this.id;
  }

  async store(entry: MemoryEntry): Promise<void> {
    this.storeMap.set(entry.id, { ...entry });
  }

  async retrieve(id: string): Promise<MemoryEntry | null> {
    const entry = this.storeMap.get(id);
    if (entry) {
      // Check expiration
      if (entry.expiresAt && new Date(entry.expiresAt).getTime() < Date.now()) {
        this.misses++;
        return null;
      }
      this.hits++;
      return { ...entry };
    }
    this.misses++;
    return null;
  }

  async search(query: MemorySearchQuery): Promise<MemoryEntry[]> {
    const list = Array.from(this.storeMap.values());
    const now = Date.now();

    let filtered = list.filter((entry) => {
      // Filter out expired unless explicitly requested
      if (!query.includeExpired && entry.expiresAt && new Date(entry.expiresAt).getTime() < now) {
        return false;
      }

      if (query.type && entry.type !== query.type) {
        return false;
      }
      if (query.key && entry.key.toLowerCase() !== query.key.toLowerCase()) {
        return false;
      }
      if (query.minImportance && entry.importance < query.minImportance) {
        return false;
      }

      if (query.tags && query.tags.length > 0) {
        const entryTags = (entry.metadata?.tags as string[]) || [];
        const hasTag = query.tags.some((tag) => entryTags.includes(tag));
        if (!hasTag) return false;
      }

      if (query.keywords && query.keywords.length > 0) {
        const text = `${entry.key} ${entry.value}`.toLowerCase();
        const matchesKeyword = query.keywords.some((word) => text.includes(word.toLowerCase()));
        if (!matchesKeyword) return false;
      }

      return true;
    });

    // Sort by importance descending
    filtered.sort((a, b) => b.importance - a.importance);

    if (query.limit) {
      filtered = filtered.slice(0, query.limit);
    }

    return filtered.map((entry) => ({ ...entry }));
  }

  async delete(id: string): Promise<void> {
    this.storeMap.delete(id);
  }

  async clear(): Promise<void> {
    this.storeMap.clear();
  }

  async getStats(): Promise<MemoryStatistics> {
    const totalEntries = this.storeMap.size;
    const entriesByType: Record<string, number> = {
      working: 0,
      "long-term": 0,
      conversation: 0,
      episodic: 0,
      semantic: 0,
    };

    let bytesUsed = 0;
    for (const entry of this.storeMap.values()) {
      entriesByType[entry.type] = (entriesByType[entry.type] || 0) + 1;
      bytesUsed += Buffer.byteLength(entry.key + entry.value, "utf8");
    }

    return {
      totalEntries,
      entriesByType: entriesByType as any,
      bytesUsed,
      hitsCount: this.hits,
      missesCount: this.misses,
    };
  }

  async getDiagnostics(): Promise<MemoryDiagnostics> {
    return {
      providerId: this.id,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      isHealthy: true,
    };
  }
}
