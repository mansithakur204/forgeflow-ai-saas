// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Execution Timeline Domain Types
// Structured, extensible model for capturing the complete lifecycle of every
// workflow execution. Designed for future persistence (PostgreSQL / Redis).
// ─────────────────────────────────────────────────────────────────────────────

// ── Log Levels ───────────────────────────────────────────────────────────────

export type TimelineLogLevel =
  | "TRACE"
  | "DEBUG"
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "CRITICAL";

/** Numeric severity for comparison and filtering. */
export const TIMELINE_LOG_LEVEL_SEVERITY: Record<TimelineLogLevel, number> = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  SUCCESS: 3,
  WARNING: 4,
  ERROR: 5,
  CRITICAL: 6,
};

// ── Event Types ──────────────────────────────────────────────────────────────

export type TimelineEventType =
  | "WORKFLOW_STARTED"
  | "WORKFLOW_COMPLETED"
  | "WORKFLOW_FAILED"
  | "WORKFLOW_CANCELLED"
  | "NODE_STARTED"
  | "NODE_COMPLETED"
  | "NODE_FAILED"
  | "NODE_SKIPPED"
  | "AI_REQUEST_STARTED"
  | "AI_RESPONSE_RECEIVED"
  | "AI_RETRY"
  | "AI_TIMEOUT"
  | "HTTP_REQUEST"
  | "HTTP_RESPONSE"
  | "WEBHOOK_RECEIVED"
  | "CUSTOM_EVENT";

// ── Timeline Entry Status ────────────────────────────────────────────────────

export type TimelineEntryStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";

// ── Timeline Entry ───────────────────────────────────────────────────────────

export interface TimelineEntry {
  /** Unique entry identifier. */
  readonly id: string;
  /** Workflow this entry belongs to. */
  readonly workflowId: string;
  /** Execution run this entry belongs to. */
  readonly executionId: string;
  /** Node this entry relates to (null for workflow-level events). */
  readonly nodeId: string | null;
  /** ISO-8601 timestamp. */
  readonly timestamp: string;
  /** Monotonically increasing sequence within an execution. */
  readonly sequenceNumber: number;
  /** Structured log level. */
  readonly level: TimelineLogLevel;
  /** Structured event type. */
  readonly eventType: TimelineEventType;
  /** Human-readable message. */
  readonly message: string;
  /** Current status at the time of the event. */
  readonly status: TimelineEntryStatus;
  /** Duration in milliseconds (populated for completed/failed events). */
  readonly durationMs: number | null;
  /** Extensible metadata bag. */
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ── Filtering ────────────────────────────────────────────────────────────────

export interface TimelineFilter {
  /** Filter by execution run ID. */
  executionId?: string;
  /** Filter by node ID. */
  nodeId?: string;
  /** Minimum log level (inclusive). */
  minLevel?: TimelineLogLevel;
  /** Filter by specific event types. */
  eventTypes?: readonly TimelineEventType[];
  /** Filter by status. */
  statuses?: readonly TimelineEntryStatus[];
  /** Only entries after this ISO timestamp. */
  after?: string;
  /** Only entries before this ISO timestamp. */
  before?: string;
  /** Maximum number of entries to return. */
  limit?: number;
  /** Offset for pagination. */
  offset?: number;
}

// ── Grouping ─────────────────────────────────────────────────────────────────

export type TimelineGrouping = "execution" | "node";

// ── Storage Interface ────────────────────────────────────────────────────────

/**
 * Abstraction over timeline entry persistence.
 * The default implementation is in-memory; swap for PostgreSQL/Redis later.
 */
export interface ITimelineStorage {
  append(entry: TimelineEntry): void;
  getByExecution(executionId: string): readonly TimelineEntry[];
  getByNode(executionId: string, nodeId: string): readonly TimelineEntry[];
  query(filter: TimelineFilter): readonly TimelineEntry[];
  clear(executionId: string): void;
  clearAll(): void;
}
