// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — In-Memory Repositories (Instrumented)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  IExecutionLogRepository,
  ITimelineRepository,
  PaginationOptions,
  PaginatedResult,
  LogSearchFilter,
  TimelineSearchFilter,
  RetentionConfig,
  RetentionMetrics,
} from "./interfaces";
import type { ExecutionLogEntry } from "@/engine/types/logs";
import type { TimelineEntry } from "@/engine/types/timeline-types";
import { RepositoryMonitoringService } from "./monitoring-service";

// ── Helper: Apply Pagination ──────────────────────────────────────────────────

function paginate<T>(items: readonly T[], options?: PaginationOptions): PaginatedResult<T> {
  const limit = options?.limit ?? 50;
  let offset = options?.offset ?? 0;

  if (options?.cursor) {
    try {
      const decoded = parseInt(Buffer.from(options.cursor, "base64").toString("utf-8"), 10);
      if (!isNaN(decoded)) {
        offset = decoded;
      }
    } catch {
      // Fallback
    }
  }

  const sliced = items.slice(offset, offset + limit);
  const hasMore = offset + limit < items.length;
  const nextCursor = hasMore
    ? Buffer.from((offset + limit).toString()).toString("base64")
    : undefined;

  return {
    items: sliced,
    totalCount: items.length,
    nextCursor,
    hasMore,
  };
}

// ── InMemoryExecutionLogRepository ───────────────────────────────────────────

export class InMemoryExecutionLogRepository implements IExecutionLogRepository {
  private logs: ExecutionLogEntry[] = [];
  
  private readonly indexByExecution = new Map<string, ExecutionLogEntry[]>();
  private readonly indexByWorkflow = new Map<string, ExecutionLogEntry[]>();

  async save(entry: ExecutionLogEntry): Promise<ExecutionLogEntry> {
    const start = Date.now();
    let isError = false;
    try {
      const existingIndex = this.logs.findIndex((l) => l.id === entry.id);
      if (existingIndex > -1) {
        const old = this.logs[existingIndex];
        this.logs[existingIndex] = { ...entry };
        this.removeFromIndexes(old);
      } else {
        this.logs.push({ ...entry });
      }
      this.addToIndexes(entry);
      return entry;
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("save", Date.now() - start, isError);
    }
  }

  async saveBatch(entries: ExecutionLogEntry[]): Promise<void> {
    const start = Date.now();
    let isError = false;
    try {
      for (const entry of entries) {
        await this.save(entry);
      }
      RepositoryMonitoringService.emitEvent("Batch Saved", { 
        count: String(entries.length),
        entity: "ExecutionLogEntry" 
      });
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("saveBatch", Date.now() - start, isError);
    }
  }

  async update(id: string, entry: Partial<ExecutionLogEntry>): Promise<ExecutionLogEntry> {
    const start = Date.now();
    let isError = false;
    try {
      const idx = this.logs.findIndex((l) => l.id === id);
      if (idx === -1) {
        throw new Error(`Execution log with ID "${id}" not found`);
      }
      const old = this.logs[idx];
      const updated = { ...old, ...entry } as ExecutionLogEntry;
      this.logs[idx] = updated;
      
      this.removeFromIndexes(old);
      this.addToIndexes(updated);
      return updated;
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("update", Date.now() - start, isError);
    }
  }

  async updateBatch(updates: { id: string; changes: Partial<ExecutionLogEntry> }[]): Promise<void> {
    const start = Date.now();
    let isError = false;
    try {
      for (const update of updates) {
        await this.update(update.id, update.changes);
      }
      RepositoryMonitoringService.emitEvent("Batch Updated", { 
        count: String(updates.length),
        entity: "ExecutionLogEntry" 
      });
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("updateBatch", Date.now() - start, isError);
    }
  }

  async delete(id: string): Promise<void> {
    const start = Date.now();
    let isError = false;
    try {
      const idx = this.logs.findIndex((l) => l.id === id);
      if (idx > -1) {
        const old = this.logs[idx];
        this.logs.splice(idx, 1);
        this.removeFromIndexes(old);
      }
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("delete", Date.now() - start, isError);
    }
  }

  async deleteBatch(ids: string[]): Promise<void> {
    const start = Date.now();
    let isError = false;
    try {
      for (const id of ids) {
        await this.delete(id);
      }
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("deleteBatch", Date.now() - start, isError);
    }
  }

  async findByExecution(
    executionId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExecutionLogEntry>> {
    const start = Date.now();
    let isError = false;
    try {
      const filtered = this.indexByExecution.get(executionId) ?? [];
      return paginate(filtered, options);
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("findByExecution", Date.now() - start, isError);
    }
  }

  async findByWorkflow(
    workflowId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExecutionLogEntry>> {
    const start = Date.now();
    let isError = false;
    try {
      const filtered = this.indexByWorkflow.get(workflowId) ?? [];
      return paginate(filtered, options);
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("findByWorkflow", Date.now() - start, isError);
    }
  }

  async search(
    filter: LogSearchFilter,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExecutionLogEntry>> {
    const start = Date.now();
    let isError = false;
    try {
      let result: ExecutionLogEntry[];

      if (filter.runId) {
        result = [...(this.indexByExecution.get(filter.runId) ?? [])];
      } else if (filter.workflowId) {
        result = [...(this.indexByWorkflow.get(filter.workflowId) ?? [])];
      } else {
        result = [...this.logs];
      }

      if (filter.nodeId) {
        result = result.filter((l) => l.nodeId === filter.nodeId);
      }
      if (filter.status) {
        result = result.filter((l) => String(l.data?.status ?? "").toLowerCase() === filter.status!.toLowerCase());
      }
      if (filter.eventType) {
        result = result.filter((l) => String(l.data?.event ?? "").toLowerCase() === filter.eventType!.toLowerCase());
      }
      if (filter.level) {
        result = result.filter((l) => l.level === filter.level);
      }
      if (filter.provider) {
        result = result.filter((l) => String(l.data?.provider ?? "").toLowerCase() === filter.provider!.toLowerCase());
      }
      if (filter.startTime) {
        const startTime = new Date(filter.startTime).getTime();
        result = result.filter((l) => new Date(l.timestamp).getTime() >= startTime);
      }
      if (filter.endTime) {
        const endTime = new Date(filter.endTime).getTime();
        result = result.filter((l) => new Date(l.timestamp).getTime() <= endTime);
      }
      if (filter.query) {
        const q = filter.query.toLowerCase();
        result = result.filter((l) => l.message.toLowerCase().includes(q));
      }

      result.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      RepositoryMonitoringService.emitEvent("Search Executed", { 
        entity: "ExecutionLogEntry",
        query: filter.query ?? "" 
      });

      return paginate(result, options);
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("search", Date.now() - start, isError);
    }
  }

  async count(filter: LogSearchFilter): Promise<number> {
    const start = Date.now();
    let isError = false;
    try {
      const searchRes = await this.search(filter, { limit: Number.MAX_SAFE_INTEGER });
      return searchRes.totalCount;
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("count", Date.now() - start, isError);
    }
  }

  async applyRetentionPolicy(config: RetentionConfig): Promise<RetentionMetrics> {
    const start = Date.now();
    let isError = false;
    try {
      RepositoryMonitoringService.emitEvent("Cleanup Started", { entity: "ExecutionLogEntry" });
      
      const now = Date.now();
      const maxAgeMs = config.maxAgeDays * 24 * 60 * 60 * 1000;
      let totalCleared = 0;
      
      if (config.autoCleanupEnabled) {
        const originalLogs = [...this.logs];
        const keptLogs: ExecutionLogEntry[] = [];

        for (const log of originalLogs) {
          const age = now - new Date(log.timestamp).getTime();
          const exceedsAge = age > maxAgeMs;
          if (!exceedsAge) {
            keptLogs.push(log);
          } else {
            totalCleared++;
            this.removeFromIndexes(log);
          }
        }

        this.logs = keptLogs;
        
        if (this.logs.length > config.maxEntriesCount) {
          const surplus = this.logs.length - config.maxEntriesCount;
          const toRemove = this.logs.slice(0, surplus);
          this.logs = this.logs.slice(surplus);
          
          for (const log of toRemove) {
            totalCleared++;
            this.removeFromIndexes(log);
          }
        }
      }
      
      const metrics = {
        totalCleared,
        totalArchived: 0,
        lastRunTimestamp: new Date().toISOString(),
      };

      RepositoryMonitoringService.emitEvent("Cleanup Completed", { 
        entity: "ExecutionLogEntry",
        cleared: String(totalCleared) 
      });

      return metrics;
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("applyRetentionPolicy", Date.now() - start, isError);
    }
  }

  // ── Health Interfaces ──────────────────────────────────────────────────────

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async ping(): Promise<void> {
    // Standard quick validation ping
  }

  providerName(): string {
    return "inmemory";
  }

  // ── Index Helpers ──────────────────────────────────────────────────────────

  private addToIndexes(entry: ExecutionLogEntry): void {
    const execId = entry.runId;
    if (execId) {
      const list = this.indexByExecution.get(execId) ?? [];
      list.push(entry);
      this.indexByExecution.set(execId, list);
    }

    const wfId = entry.data?.workflowId as string | undefined;
    if (wfId) {
      const list = this.indexByWorkflow.get(wfId) ?? [];
      list.push(entry);
      this.indexByWorkflow.set(wfId, list);
    }
  }

  private removeFromIndexes(entry: ExecutionLogEntry): void {
    const execId = entry.runId;
    if (execId) {
      const list = this.indexByExecution.get(execId);
      if (list) {
        this.indexByExecution.set(execId, list.filter((l) => l.id !== entry.id));
      }
    }

    const wfId = entry.data?.workflowId as string | undefined;
    if (wfId) {
      const list = this.indexByWorkflow.get(wfId);
      if (list) {
        this.indexByWorkflow.set(wfId, list.filter((l) => l.id !== entry.id));
      }
    }
  }
}

// ── InMemoryTimelineRepository ───────────────────────────────────────────────

export class InMemoryTimelineRepository implements ITimelineRepository {
  private entries: TimelineEntry[] = [];

  private readonly indexByExecution = new Map<string, TimelineEntry[]>();
  private readonly indexByWorkflow = new Map<string, TimelineEntry[]>();

  async save(entry: TimelineEntry): Promise<TimelineEntry> {
    const start = Date.now();
    let isError = false;
    try {
      const existingIndex = this.entries.findIndex((e) => e.id === entry.id);
      if (existingIndex > -1) {
        const old = this.entries[existingIndex];
        this.entries[existingIndex] = { ...entry };
        this.removeFromIndexes(old);
      } else {
        this.entries.push({ ...entry });
      }
      this.addToIndexes(entry);
      return entry;
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("save", Date.now() - start, isError);
    }
  }

  async saveBatch(entries: TimelineEntry[]): Promise<void> {
    const start = Date.now();
    let isError = false;
    try {
      for (const entry of entries) {
        await this.save(entry);
      }
      RepositoryMonitoringService.emitEvent("Batch Saved", { 
        count: String(entries.length),
        entity: "TimelineEntry" 
      });
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("saveBatch", Date.now() - start, isError);
    }
  }

  async update(id: string, entry: Partial<TimelineEntry>): Promise<TimelineEntry> {
    const start = Date.now();
    let isError = false;
    try {
      const idx = this.entries.findIndex((e) => e.id === id);
      if (idx === -1) {
        throw new Error(`Timeline entry with ID "${id}" not found`);
      }
      const old = this.entries[idx];
      const updated = { ...old, ...entry } as TimelineEntry;
      this.entries[idx] = updated;

      this.removeFromIndexes(old);
      this.addToIndexes(updated);
      return updated;
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("update", Date.now() - start, isError);
    }
  }

  async updateBatch(updates: { id: string; changes: Partial<TimelineEntry> }[]): Promise<void> {
    const start = Date.now();
    let isError = false;
    try {
      for (const update of updates) {
        await this.update(update.id, update.changes);
      }
      RepositoryMonitoringService.emitEvent("Batch Updated", { 
        count: String(updates.length),
        entity: "TimelineEntry" 
      });
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("updateBatch", Date.now() - start, isError);
    }
  }

  async delete(id: string): Promise<void> {
    const start = Date.now();
    let isError = false;
    try {
      const idx = this.entries.findIndex((e) => e.id === id);
      if (idx > -1) {
        const old = this.entries[idx];
        this.entries.splice(idx, 1);
        this.removeFromIndexes(old);
      }
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("delete", Date.now() - start, isError);
    }
  }

  async deleteBatch(ids: string[]): Promise<void> {
    const start = Date.now();
    let isError = false;
    try {
      for (const id of ids) {
        await this.delete(id);
      }
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("deleteBatch", Date.now() - start, isError);
    }
  }

  async findByExecution(
    executionId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<TimelineEntry>> {
    const start = Date.now();
    let isError = false;
    try {
      const filtered = this.indexByExecution.get(executionId) ?? [];
      return paginate(filtered, options);
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("findByExecution", Date.now() - start, isError);
    }
  }

  async findByWorkflow(
    workflowId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<TimelineEntry>> {
    const start = Date.now();
    let isError = false;
    try {
      const filtered = this.indexByWorkflow.get(workflowId) ?? [];
      return paginate(filtered, options);
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("findByWorkflow", Date.now() - start, isError);
    }
  }

  async search(
    filter: TimelineSearchFilter,
    options?: PaginationOptions
  ): Promise<PaginatedResult<TimelineEntry>> {
    const start = Date.now();
    let isError = false;
    try {
      let result: TimelineEntry[];

      if (filter.executionId) {
        result = [...(this.indexByExecution.get(filter.executionId) ?? [])];
      } else if (filter.workflowId) {
        result = [...(this.indexByWorkflow.get(filter.workflowId) ?? [])];
      } else {
        result = [...this.entries];
      }

      if (filter.nodeId) {
        result = result.filter((e) => e.nodeId === filter.nodeId);
      }
      if (filter.status) {
        result = result.filter((e) => e.status.toLowerCase() === filter.status!.toLowerCase());
      }
      if (filter.eventType) {
        result = result.filter((e) => e.eventType.toLowerCase() === filter.eventType!.toLowerCase());
      }
      if (filter.eventTypes && filter.eventTypes.length > 0) {
        const allowed = new Set(filter.eventTypes);
        result = result.filter((e) => allowed.has(e.eventType));
      }
      if (filter.statuses && filter.statuses.length > 0) {
        const allowed = new Set(filter.statuses);
        result = result.filter((e) => allowed.has(e.status));
      }
      if (filter.minLevel) {
        result = result.filter((e) => e.level === filter.minLevel);
      }
      if (filter.provider) {
        result = result.filter((e) => String(e.metadata?.provider ?? "").toLowerCase() === filter.provider!.toLowerCase());
      }
      if (filter.startTime || filter.after) {
        const startLimit = filter.startTime || filter.after!;
        result = result.filter((e) => e.timestamp >= startLimit);
      }
      if (filter.endTime || filter.before) {
        const endLimit = filter.endTime || filter.before!;
        result = result.filter((e) => e.timestamp <= endLimit);
      }
      if (filter.query) {
        const q = filter.query.toLowerCase();
        result = result.filter(
          (e) =>
            e.message.toLowerCase().includes(q) ||
            JSON.stringify(e.metadata).toLowerCase().includes(q)
        );
      }

      result.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

      RepositoryMonitoringService.emitEvent("Search Executed", { 
        entity: "TimelineEntry",
        query: filter.query ?? "" 
      });

      return paginate(result, options);
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("search", Date.now() - start, isError);
    }
  }

  async count(filter: TimelineSearchFilter): Promise<number> {
    const start = Date.now();
    let isError = false;
    try {
      const searchRes = await this.search(filter, { limit: Number.MAX_SAFE_INTEGER });
      return searchRes.totalCount;
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("count", Date.now() - start, isError);
    }
  }

  async applyRetentionPolicy(config: RetentionConfig): Promise<RetentionMetrics> {
    const start = Date.now();
    let isError = false;
    try {
      RepositoryMonitoringService.emitEvent("Cleanup Started", { entity: "TimelineEntry" });
      
      const now = Date.now();
      const maxAgeMs = config.maxAgeDays * 24 * 60 * 60 * 1000;
      let totalCleared = 0;
      
      if (config.autoCleanupEnabled) {
        const originalEntries = [...this.entries];
        const keptEntries: TimelineEntry[] = [];

        for (const entry of originalEntries) {
          const age = now - new Date(entry.timestamp).getTime();
          const exceedsAge = age > maxAgeMs;
          if (!exceedsAge) {
            keptEntries.push(entry);
          } else {
            totalCleared++;
            this.removeFromIndexes(entry);
          }
        }

        this.entries = keptEntries;
        
        if (this.entries.length > config.maxEntriesCount) {
          const surplus = this.entries.length - config.maxEntriesCount;
          const toRemove = this.entries.slice(0, surplus);
          this.entries = this.entries.slice(surplus);

          for (const entry of toRemove) {
            totalCleared++;
            this.removeFromIndexes(entry);
          }
        }
      }
      
      const metrics = {
        totalCleared,
        totalArchived: 0,
        lastRunTimestamp: new Date().toISOString(),
      };

      RepositoryMonitoringService.emitEvent("Cleanup Completed", { 
        entity: "TimelineEntry",
        cleared: String(totalCleared) 
      });

      return metrics;
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      RepositoryMonitoringService.recordOperation("applyRetentionPolicy", Date.now() - start, isError);
    }
  }

  // ── Health Interfaces ──────────────────────────────────────────────────────

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async ping(): Promise<void> {
    // Immediate response
  }

  providerName(): string {
    return "inmemory";
  }

  // ── Index Helpers ──────────────────────────────────────────────────────────

  private addToIndexes(entry: TimelineEntry): void {
    const execId = entry.executionId;
    if (execId) {
      const list = this.indexByExecution.get(execId) ?? [];
      list.push(entry);
      this.indexByExecution.set(execId, list);
    }

    const wfId = entry.workflowId;
    if (wfId) {
      const list = this.indexByWorkflow.get(wfId) ?? [];
      list.push(entry);
      this.indexByWorkflow.set(wfId, list);
    }
  }

  private removeFromIndexes(entry: TimelineEntry): void {
    const execId = entry.executionId;
    if (execId) {
      const list = this.indexByExecution.get(execId);
      if (list) {
        this.indexByExecution.set(execId, list.filter((e) => e.id !== entry.id));
      }
    }

    const wfId = entry.workflowId;
    if (wfId) {
      const list = this.indexByWorkflow.get(wfId);
      if (list) {
        this.indexByWorkflow.set(wfId, list.filter((e) => e.id !== entry.id));
      }
    }
  }
}

// ── InMemoryExecutionRepository ──────────────────────────────────────────────

export class InMemoryExecutionRepository {
  readonly logs = new InMemoryExecutionLogRepository();
  readonly timeline = new InMemoryTimelineRepository();
}
