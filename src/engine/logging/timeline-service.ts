// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Execution Timeline Service
// Centralized service for appending, retrieving, filtering, and grouping
// structured timeline entries. Storage-agnostic via ITimelineStorage.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ITimelineStorage,
  TimelineEntry,
  TimelineEntryStatus,
  TimelineEventType,
  TimelineFilter,
  TimelineLogLevel,
} from "@/engine/types/timeline-types";
import { TIMELINE_LOG_LEVEL_SEVERITY } from "@/engine/types/timeline-types";
import { RepositoryProvider } from "@/engine/repository/provider";
import type { ITimelineRepository } from "@/engine/repository/interfaces";

// ── In-Memory Storage Implementation ─────────────────────────────────────────

const DEFAULT_MAX_ENTRIES_PER_RUN = 10_000;

class InMemoryTimelineStorage implements ITimelineStorage {
  private readonly store = new Map<string, TimelineEntry[]>();
  private readonly maxEntriesPerRun: number;

  constructor(maxEntriesPerRun = DEFAULT_MAX_ENTRIES_PER_RUN) {
    this.maxEntriesPerRun = maxEntriesPerRun;
  }

  append(entry: TimelineEntry): void {
    const entries = this.store.get(entry.executionId) ?? [];
    if (entries.length >= this.maxEntriesPerRun) {
      // Drop oldest entries beyond the cap (FIFO eviction)
      entries.shift();
    }
    entries.push(entry);
    this.store.set(entry.executionId, entries);
  }

  getByExecution(executionId: string): readonly TimelineEntry[] {
    return this.store.get(executionId) ?? [];
  }

  getByNode(executionId: string, nodeId: string): readonly TimelineEntry[] {
    const entries = this.store.get(executionId) ?? [];
    return entries.filter((e) => e.nodeId === nodeId);
  }

  query(filter: TimelineFilter): readonly TimelineEntry[] {
    let entries: TimelineEntry[];

    if (filter.executionId) {
      entries = [...(this.store.get(filter.executionId) ?? [])];
    } else {
      entries = [];
      for (const bucket of this.store.values()) {
        entries.push(...bucket);
      }
      // Sort cross-execution queries by timestamp
      entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    return applyFilter(entries, filter);
  }

  clear(executionId: string): void {
    this.store.delete(executionId);
  }

  clearAll(): void {
    this.store.clear();
  }
}

// ── Filter Logic ─────────────────────────────────────────────────────────────

function applyFilter(
  entries: readonly TimelineEntry[],
  filter: TimelineFilter
): readonly TimelineEntry[] {
  let result = [...entries];

  if (filter.nodeId) {
    result = result.filter((e) => e.nodeId === filter.nodeId);
  }

  if (filter.minLevel) {
    const minSeverity = TIMELINE_LOG_LEVEL_SEVERITY[filter.minLevel];
    result = result.filter(
      (e) => TIMELINE_LOG_LEVEL_SEVERITY[e.level] >= minSeverity
    );
  }

  if (filter.eventTypes && filter.eventTypes.length > 0) {
    const allowed = new Set<TimelineEventType>(filter.eventTypes);
    result = result.filter((e) => allowed.has(e.eventType));
  }

  if (filter.statuses && filter.statuses.length > 0) {
    const allowed = new Set<TimelineEntryStatus>(filter.statuses);
    result = result.filter((e) => allowed.has(e.status));
  }

  if (filter.after) {
    const afterTs = filter.after;
    result = result.filter((e) => e.timestamp > afterTs);
  }

  if (filter.before) {
    const beforeTs = filter.before;
    result = result.filter((e) => e.timestamp < beforeTs);
  }

  const offset = filter.offset ?? 0;
  const limit = filter.limit ?? result.length;

  return result.slice(offset, offset + limit);
}

// ── Timeline Service ─────────────────────────────────────────────────────────

export class TimelineService {
  private readonly timelineRepo: ITimelineRepository;
  private readonly sequenceCounters = new Map<string, number>();
  private readonly syncStore = new Map<string, TimelineEntry[]>();
  private readonly maxEntriesPerRun = DEFAULT_MAX_ENTRIES_PER_RUN;

  constructor(timelineRepo?: ITimelineRepository) {
    this.timelineRepo = timelineRepo ?? RepositoryProvider.getTimelineRepository();
  }

  /**
   * Returns the next sequence number for a given execution.
   * Guaranteed monotonically increasing within a single execution.
   */
  nextSequence(executionId: string): number {
    const current = this.sequenceCounters.get(executionId) ?? 0;
    const next = current + 1;
    this.sequenceCounters.set(executionId, next);
    return next;
  }

  /**
   * Append a fully-formed timeline entry.
   */
  append(entry: TimelineEntry): void {
    // Write to local cache for synchronous backward compatibility
    const entries = this.syncStore.get(entry.executionId) ?? [];
    if (entries.length >= this.maxEntriesPerRun) {
      entries.shift();
    }
    entries.push(entry);
    this.syncStore.set(entry.executionId, entries);

    // Persist asynchronously via the timeline repository interface
    this.timelineRepo.save(entry).catch((err) => {
      console.error(`[TimelineService] Failed to persist timeline entry ${entry.id}:`, err);
    });
  }

  /**
   * Create and append an entry in a single call.
   */
  record(params: {
    workflowId: string;
    executionId: string;
    nodeId?: string | null;
    level: TimelineLogLevel;
    eventType: TimelineEventType;
    message: string;
    status: TimelineEntryStatus;
    durationMs?: number | null;
    metadata?: Record<string, unknown>;
  }): TimelineEntry {
    const entry: TimelineEntry = {
      id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workflowId: params.workflowId,
      executionId: params.executionId,
      nodeId: params.nodeId ?? null,
      timestamp: new Date().toISOString(),
      sequenceNumber: this.nextSequence(params.executionId),
      level: params.level,
      eventType: params.eventType,
      message: params.message,
      status: params.status,
      durationMs: params.durationMs ?? null,
      metadata: Object.freeze({ ...(params.metadata ?? {}) }),
    };

    this.append(entry);
    return entry;
  }

  /**
   * Get all entries for an execution, sorted by sequence number.
   */
  getEntries(executionId: string): readonly TimelineEntry[] {
    return this.syncStore.get(executionId) ?? [];
  }

  /**
   * Get entries for a specific node within an execution.
   */
  getEntriesByNode(
    executionId: string,
    nodeId: string
  ): readonly TimelineEntry[] {
    const entries = this.syncStore.get(executionId) ?? [];
    return entries.filter((e) => e.nodeId === nodeId);
  }

  /**
   * Query entries with filtering, pagination, and level thresholds.
   */
  filter(filter: TimelineFilter): readonly TimelineEntry[] {
    let entries: TimelineEntry[];

    if (filter.executionId) {
      entries = [...(this.syncStore.get(filter.executionId) ?? [])];
    } else {
      entries = [];
      for (const bucket of this.syncStore.values()) {
        entries.push(...bucket);
      }
      // Sort cross-execution queries by timestamp
      entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    return applyFilter(entries, filter);
  }

  /**
   * Group entries by node ID for a given execution.
   */
  getGroupedByNode(
    executionId: string
  ): Map<string, readonly TimelineEntry[]> {
    const entries = this.getEntries(executionId);
    const grouped = new Map<string, TimelineEntry[]>();

    for (const entry of entries) {
      const key = entry.nodeId ?? "__workflow__";
      const group = grouped.get(key) ?? [];
      group.push(entry);
      grouped.set(key, group);
    }

    return grouped;
  }

  /**
   * Clear all entries for an execution. Resets sequence counter.
   */
  clear(executionId: string): void {
    this.syncStore.delete(executionId);
    this.sequenceCounters.delete(executionId);
  }

  /**
   * Clear all stored timeline data.
   */
  clearAll(): void {
    this.syncStore.clear();
    this.sequenceCounters.clear();
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

/**
 * Shared singleton instance for the application.
 * Components and services should import this rather than creating their own.
 */
export const timelineService = new TimelineService();
