// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Long-Term Memory Engine
// Manages durable, persistent memory nodes across agents and workflows.
// ─────────────────────────────────────────────────────────────────────────────

import type { IMemoryRepository } from "./memory-repository.interface";
import type { MemoryEntry } from "../../types/memory";

export type LongTermMemoryEventType =
  | "LONG_TERM_MEMORY_CREATED"
  | "LONG_TERM_MEMORY_UPDATED"
  | "LONG_TERM_MEMORY_MERGED"
  | "LONG_TERM_MEMORY_ARCHIVED"
  | "LONG_TERM_MEMORY_EXPIRED";

export interface LongTermMemoryEvent {
  entryId: string;
  type: LongTermMemoryEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface LongTermMemoryMetadata {
  importanceScore: number;
  confidenceScore: number;
  recency: string;
  frequency: number;
  accessCount: number;
  decayFactor: number;
  sourceReliability: number;
  relationships?: string[];
  conflictsWith?: string[];
  archived?: boolean;
}

export interface LongTermMemoryOptions {
  repository: IMemoryRepository;
  onEvent?: (event: LongTermMemoryEvent) => void;
}

export class LongTermMemoryEngine {
  private repository: IMemoryRepository;
  private onEvent?: (event: LongTermMemoryEvent) => void;

  constructor(options: LongTermMemoryOptions) {
    this.repository = options.repository;
    this.onEvent = options.onEvent;
  }

  private emit(entryId: string, type: LongTermMemoryEventType, metadata?: Record<string, unknown>): void {
    if (this.onEvent) {
      this.onEvent({
        entryId,
        type,
        timestamp: new Date().toISOString(),
        metadata,
      });
    }
  }

  /**
   * Task 12.4A: Create Memory
   */
  async create(
    key: string,
    value: string,
    importanceScore = 0.5,
    confidenceScore = 0.8,
    sourceReliability = 0.9,
    ttlSeconds?: number
  ): Promise<MemoryEntry> {
    const now = new Date().toISOString();
    const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : null;

    const entryId = `ltm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const metadata: LongTermMemoryMetadata = {
      importanceScore,
      confidenceScore,
      recency: now,
      frequency: 1,
      accessCount: 1,
      decayFactor: 0.1,
      sourceReliability,
      relationships: [],
      conflictsWith: [],
      archived: false,
    };

    const entry: MemoryEntry = {
      id: entryId,
      scope: "global",
      key,
      value,
      type: "long-term",
      importance: importanceScore,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      metadata: metadata as any,
    };

    const saved = await this.repository.create(entry);
    this.emit(entryId, "LONG_TERM_MEMORY_CREATED", { key });
    return saved;
  }

  /**
   * Task 12.4A: Update Memory
   */
  async update(id: string, value: string): Promise<MemoryEntry> {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error(`Long-term memory entry "${id}" does not exist`);
    }

    const now = new Date().toISOString();
    const currentMeta = (existing.metadata || {}) as unknown as LongTermMemoryMetadata;
    const metadata: LongTermMemoryMetadata = {
      ...currentMeta,
      recency: now,
      frequency: (currentMeta.frequency || 0) + 1,
      accessCount: (currentMeta.accessCount || 0) + 1,
    };

    const updated = await this.repository.update(id, {
      value,
      updatedAt: now,
      metadata: metadata as any,
    });

    this.emit(id, "LONG_TERM_MEMORY_UPDATED");
    return updated;
  }

  /**
   * Task 12.4A: Archive Memory
   */
  async archive(id: string): Promise<MemoryEntry> {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error(`Long-term memory entry "${id}" does not exist`);
    }

    const currentMeta = (existing.metadata || {}) as unknown as LongTermMemoryMetadata;
    const metadata: LongTermMemoryMetadata = {
      ...currentMeta,
      archived: true,
    };

    const updated = await this.repository.update(id, {
      metadata: metadata as any,
    });

    this.emit(id, "LONG_TERM_MEMORY_ARCHIVED");
    return updated;
  }

  /**
   * Task 12.4A: Delete Memory
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Task 12.4A: Expire Memory
   */
  async expire(id: string): Promise<MemoryEntry> {
    const entry = await this.repository.expire(id);
    this.emit(id, "LONG_TERM_MEMORY_EXPIRED");
    return entry;
  }

  /**
   * Task 12.4A: Restore Memory
   */
  async restore(id: string): Promise<MemoryEntry> {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error(`Long-term memory entry "${id}" does not exist`);
    }

    const currentMeta = (existing.metadata || {}) as unknown as LongTermMemoryMetadata;
    const metadata: LongTermMemoryMetadata = {
      ...currentMeta,
      archived: false,
    };

    return this.repository.update(id, {
      metadata: metadata as any,
    });
  }

  /**
   * Task 12.4A: Merge Memories
   */
  async merge(targetId: string, sourceId: string): Promise<MemoryEntry> {
    const target = await this.repository.getById(targetId);
    const source = await this.repository.getById(sourceId);

    if (!target || !source) {
      throw new Error("Target and source entries must exist to perform merge operations");
    }

    const mergedValue = `${target.value}\n[Merged Context]: ${source.value}`;
    const targetMeta = (target.metadata || {}) as unknown as LongTermMemoryMetadata;
    const sourceMeta = (source.metadata || {}) as unknown as LongTermMemoryMetadata;

    const relationships = Array.from(
      new Set([...(targetMeta.relationships || []), sourceId, ...(sourceMeta.relationships || [])])
    );
    const averageReliability = (targetMeta.sourceReliability + sourceMeta.sourceReliability) / 2;

    const metadata: LongTermMemoryMetadata = {
      ...targetMeta,
      relationships,
      sourceReliability: averageReliability,
      frequency: (targetMeta.frequency || 1) + (sourceMeta.frequency || 1),
    };

    const updated = await this.repository.update(targetId, {
      value: mergedValue,
      metadata: metadata as any,
    });

    await this.repository.delete(sourceId);
    this.emit(targetId, "LONG_TERM_MEMORY_MERGED", { sourceId });
    return updated;
  }

  /**
   * Task 12.4A: Split Memory
   */
  async split(id: string, delimiter: string): Promise<MemoryEntry[]> {
    const target = await this.repository.getById(id);
    if (!target) {
      throw new Error(`Long-term memory entry "${id}" does not exist`);
    }

    const parts = target.value.split(delimiter);
    if (parts.length <= 1) {
      return [target];
    }

    const results: MemoryEntry[] = [];
    await this.repository.delete(id);

    for (let i = 0; i < parts.length; i++) {
      const partValue = parts[i].trim();
      if (partValue === "") continue;
      const part = await this.create(
        `${target.key}_part_${i + 1}`,
        partValue,
        target.importance,
        0.8,
        0.9
      );
      results.push(part);
    }

    return results;
  }

  /**
   * Task 12.4B: Importance Scoring recency decay halflife calculator
   */
  getDecayedScore(metadata: LongTermMemoryMetadata): number {
    const elapsedHours = (Date.now() - new Date(metadata.recency).getTime()) / 3600000;
    return metadata.importanceScore * Math.exp(-metadata.decayFactor * elapsedHours);
  }

  /**
   * Task 12.4C: Memory Consolidation - Duplicate and Conflict Detection
   */
  async consolidate(): Promise<void> {
    const list = await this.repository.search({ type: "long-term", includeExpired: false });

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];

        if (a.key.toLowerCase().trim() === b.key.toLowerCase().trim()) {
          await this.merge(a.id, b.id);
          continue;
        }

        const valA = a.value.toLowerCase();
        const valB = b.value.toLowerCase();
        if (
          a.key.startsWith(b.key) &&
          ((valA.includes("success") && valB.includes("fail")) ||
            (valA.includes("fail") && valB.includes("success")))
        ) {
          const aMeta = (a.metadata || {}) as unknown as LongTermMemoryMetadata;
          const bMeta = (b.metadata || {}) as unknown as LongTermMemoryMetadata;

          aMeta.conflictsWith = Array.from(new Set([...(aMeta.conflictsWith || []), b.id]));
          bMeta.conflictsWith = Array.from(new Set([...(bMeta.conflictsWith || []), a.id]));

          await this.repository.update(a.id, { metadata: aMeta as any });
          await this.repository.update(b.id, { metadata: bMeta as any });
        }
      }
    }
  }

  /**
   * Task 12.4D: Auto Cleanup of expired entries
   */
  async autoCleanup(): Promise<number> {
    const list = await this.repository.search({ type: "long-term", includeExpired: true });
    const now = Date.now();
    let cleanedCount = 0;

    for (const entry of list) {
      if (entry.expiresAt && new Date(entry.expiresAt).getTime() < now) {
        await this.repository.delete(entry.id);
        this.emit(entry.id, "LONG_TERM_MEMORY_EXPIRED");
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}
