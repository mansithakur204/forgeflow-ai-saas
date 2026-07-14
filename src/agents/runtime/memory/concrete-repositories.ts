// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Memory Repository Implementations (Lifecycle-aware)
// ─────────────────────────────────────────────────────────────────────────────

import type { IMemoryRepository } from "./memory-repository.interface";
import type { MemoryEntry, MemorySearchQuery } from "../../types/memory";

export class InMemoryMemoryRepository implements IMemoryRepository {
  private store = new Map<string, MemoryEntry>();

  async create(
    entry: Omit<MemoryEntry, "createdAt" | "updatedAt" | "expiresAt"> & { expiresAt?: string | null }
  ): Promise<MemoryEntry> {
    const now = new Date().toISOString();
    
    // Base metadata initialization
    const metadata = {
      source: entry.metadata?.source || "unknown",
      workflowId: entry.metadata?.workflowId,
      agentId: entry.metadata?.agentId,
      conversationId: entry.metadata?.conversationId,
      importance: entry.metadata?.importance || "medium",
      createdAt: now,
      updatedAt: now,
      accessCount: 1,
      lastAccessAt: now,
      ttl: entry.metadata?.ttl,
      tags: entry.metadata?.tags || [],
      version: 1,
    };

    const created: MemoryEntry = {
      ...entry,
      metadata,
      createdAt: now,
      updatedAt: now,
      expiresAt: entry.expiresAt ?? null,
    } as MemoryEntry;
    
    this.store.set(entry.id, created);
    return created;
  }

  async update(
    id: string,
    updates: Partial<Omit<MemoryEntry, "id" | "scope" | "type" | "createdAt">>
  ): Promise<MemoryEntry> {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Memory record with ID "${id}" does not exist`);
    }

    const now = new Date().toISOString();
    
    // Incremental versioning
    const nextVersion = (existing.metadata?.version || 1) + 1;
    const metadata = {
      ...existing.metadata,
      ...updates.metadata,
      updatedAt: now,
      version: nextVersion,
    };

    const updated: MemoryEntry = {
      ...existing,
      ...updates,
      metadata,
      updatedAt: now,
    } as MemoryEntry;
    
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async getById(id: string): Promise<MemoryEntry | null> {
    const existing = this.store.get(id);
    if (existing) {
      if (!existing.metadata) {
        existing.metadata = {};
      }
      existing.metadata.accessCount = (Number(existing.metadata.accessCount ?? 0)) + 1;
      existing.metadata.lastAccessAt = new Date().toISOString();
      return { ...existing };
    }
    return null;
  }

  async search(query: MemorySearchQuery): Promise<MemoryEntry[]> {
    let list = Array.from(this.store.values());
    const now = Date.now();

    list = list.filter((entry) => {
      if (!query.includeExpired && entry.expiresAt && new Date(entry.expiresAt).getTime() < now) {
        return false;
      }
      if (query.type && entry.type !== query.type) return false;
      if (query.scope && entry.scope !== query.scope) return false;
      if (query.key && entry.key.toLowerCase() !== query.key.toLowerCase()) return false;
      if (query.minImportance && entry.importance < query.minImportance) return false;
      return true;
    });

    if (query.limit) {
      list = list.slice(0, query.limit);
    }
    return list;
  }

  async createMany(
    entries: (Omit<MemoryEntry, "createdAt" | "updatedAt" | "expiresAt"> & { expiresAt?: string | null })[]
  ): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];
    for (const entry of entries) {
      results.push(await this.create(entry));
    }
    return results;
  }

  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.store.delete(id);
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async archive(id: string): Promise<MemoryEntry> {
    return this.update(id, {
      metadata: {
        archived: true,
      } as any,
    });
  }

  async expire(id: string): Promise<MemoryEntry> {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Memory record with ID "${id}" does not exist`);
    }
    const now = new Date().toISOString();
    return this.update(id, {
      expiresAt: now,
    } as any);
  }
}

export class PostgresMemoryRepository implements IMemoryRepository {
  async create(entry: any): Promise<any> {
    return entry;
  }
  async update(id: string, updates: any): Promise<any> {
    return {} as any;
  }
  async delete(id: string): Promise<void> {}
  async getById(id: string): Promise<any> {
    return null;
  }
  async search(query: any): Promise<any[]> {
    return [];
  }
  async createMany(entries: any[]): Promise<any[]> {
    return [];
  }
  async deleteMany(ids: string[]): Promise<void> {}
  async clear(): Promise<void> {}
  async archive(id: string): Promise<any> {
    return {} as any;
  }
  async expire(id: string): Promise<any> {
    return {} as any;
  }
}

export class RedisMemoryRepository implements IMemoryRepository {
  async create(entry: any): Promise<any> {
    return entry;
  }
  async update(id: string, updates: any): Promise<any> {
    return {} as any;
  }
  async delete(id: string): Promise<void> {}
  async getById(id: string): Promise<any> {
    return null;
  }
  async search(query: any): Promise<any[]> {
    return [];
  }
  async createMany(entries: any[]): Promise<any[]> {
    return [];
  }
  async deleteMany(ids: string[]): Promise<void> {}
  async clear(): Promise<void> {}
  async archive(id: string): Promise<any> {
    return {} as any;
  }
  async expire(id: string): Promise<any> {
    return {} as any;
  }
}
