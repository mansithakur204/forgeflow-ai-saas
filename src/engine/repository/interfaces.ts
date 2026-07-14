// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Persistence & Monitoring Layer Interfaces
// ─────────────────────────────────────────────────────────────────────────────

import type { ExecutionLogEntry, LogLevel } from "@/engine/types/logs";
import type { TimelineEntry, TimelineFilter } from "@/engine/types/timeline-types";

// ── Pagination Models ────────────────────────────────────────────────────────

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: readonly T[];
  totalCount: number;
  nextCursor?: string;
  hasMore: boolean;
}

// ── Search Filters ───────────────────────────────────────────────────────────

export interface LogSearchFilter {
  workflowId?: string;
  runId?: string;
  nodeId?: string;
  status?: string;
  eventType?: string;
  level?: LogLevel;
  provider?: string;
  startTime?: string;
  endTime?: string;
  query?: string;
}

export interface TimelineSearchFilter extends TimelineFilter {
  workflowId?: string;
  provider?: string;
  query?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  eventType?: string;
}

// ── Retention Models ─────────────────────────────────────────────────────────

export interface RetentionConfig {
  maxAgeDays: number;
  maxEntriesCount: number;
  autoCleanupEnabled: boolean;
  archiveEnabled: boolean;
}

export interface RetentionMetrics {
  totalCleared: number;
  totalArchived: number;
  lastRunTimestamp: string | null;
}

// ── Telemetry & Health Interfaces (Sprint 10.3D) ─────────────────────────────

export interface ITelemetryProvider {
  trackEvent(name: string, properties?: Record<string, string>): void;
  trackMetric(name: string, value: number, properties?: Record<string, string>): void;
  trackException(error: Error, severity?: "INFO" | "WARNING" | "ERROR" | "CRITICAL", properties?: Record<string, string>): void;
  trackDependency(
    name: string,
    target: string,
    type: string,
    durationMs: number,
    success: boolean,
    properties?: Record<string, string>
  ): void;
  trackTrace(message: string, level?: "VERBOSE" | "INFO" | "WARNING" | "ERROR", properties?: Record<string, string>): void;
  flush(): Promise<void>;
}

export interface IRepositoryHealth {
  isHealthy(): Promise<boolean>;
  ping(): Promise<void>;
  providerName(): string;
}

// ── Repository Monitoring Model ──────────────────────────────────────────────

export interface RepositoryMonitorState {
  currentProvider: string;
  repositoryStatus: "healthy" | "unhealthy" | "unknown";
  lastHealthCheck: string | null;
  averageLatencyMs: number;
  errorCount: number;
}

// ── Database Adapter Interface ───────────────────────────────────────────────

export interface IDatabaseAdapter {
  insert<T>(table: string, data: T): Promise<T>;
  insertBatch<T>(table: string, data: T[]): Promise<void>;
  update<T>(table: string, id: string, data: Partial<T>): Promise<T>;
  updateBatch<T>(table: string, updates: { id: string; changes: Partial<T> }[]): Promise<void>;
  delete(table: string, id: string): Promise<void>;
  deleteBatch(table: string, ids: string[]): Promise<void>;
  select<T>(table: string, filter: any, options?: any): Promise<T[]>;
  count(table: string, filter: any): Promise<number>;
  ping(): Promise<void>;
}

// ── Transaction Abstraction ──────────────────────────────────────────────────

export interface IDbTransaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface ITransactionManager {
  beginTransaction(): Promise<IDbTransaction>;
}

// ── Repository Interfaces ────────────────────────────────────────────────────

export interface IExecutionLogRepository extends IRepositoryHealth {
  save(entry: ExecutionLogEntry): Promise<ExecutionLogEntry>;
  saveBatch(entries: ExecutionLogEntry[]): Promise<void>;
  update(id: string, entry: Partial<ExecutionLogEntry>): Promise<ExecutionLogEntry>;
  updateBatch(updates: { id: string; changes: Partial<ExecutionLogEntry> }[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteBatch(ids: string[]): Promise<void>;
  
  findByExecution(
    executionId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExecutionLogEntry>>;
  
  findByWorkflow(
    workflowId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExecutionLogEntry>>;
  
  search(
    filter: LogSearchFilter,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExecutionLogEntry>>;
  
  count(filter: LogSearchFilter): Promise<number>;
  
  applyRetentionPolicy(config: RetentionConfig): Promise<RetentionMetrics>;
}

export interface ITimelineRepository extends IRepositoryHealth {
  save(entry: TimelineEntry): Promise<TimelineEntry>;
  saveBatch(entries: TimelineEntry[]): Promise<void>;
  update(id: string, entry: Partial<TimelineEntry>): Promise<TimelineEntry>;
  updateBatch(updates: { id: string; changes: Partial<TimelineEntry> }[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteBatch(ids: string[]): Promise<void>;
  
  findByExecution(
    executionId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<TimelineEntry>>;
  
  findByWorkflow(
    workflowId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<TimelineEntry>>;
  
  search(
    filter: TimelineSearchFilter,
    options?: PaginationOptions
  ): Promise<PaginatedResult<TimelineEntry>>;
  
  count(filter: TimelineSearchFilter): Promise<number>;
  
  applyRetentionPolicy(config: RetentionConfig): Promise<RetentionMetrics>;
}
