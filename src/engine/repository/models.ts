// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Persistence Domain Models
// ─────────────────────────────────────────────────────────────────────────────

import type {
  WorkflowRunStatus,
  ExecutionEnvironment,
  ExecutionTrigger,
} from "@/engine/types/execution";
import type {
  TimelineLogLevel,
  TimelineEventType,
  TimelineEntryStatus,
} from "@/engine/types/timeline-types";

// ── Persistent Execution Domain Model ────────────────────────────────────────

export interface PersistentExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: WorkflowRunStatus;
  environment: ExecutionEnvironment;
  initiatedBy: string;
  trigger: ExecutionTrigger;
  startedAt: string | null;
  completedAt: string | null;
  failedNodeId: string | null;
  errorMessage: string | null;
  
  /** Extensible key-value metadata bag for execution parameters or system tags */
  metadata: Record<string, unknown>;
  
  /** Retention info bound to this execution */
  retention: RetentionMetadata;
}

// ── Persistent Timeline Entry Domain Model ───────────────────────────────────

export interface PersistentTimelineEntry {
  id: string;
  workflowId: string;
  executionId: string;
  nodeId: string | null;
  timestamp: string;
  sequenceNumber: number;
  level: TimelineLogLevel;
  eventType: TimelineEventType;
  message: string;
  status: TimelineEntryStatus;
  durationMs: number | null;
  
  /** Rich, structured payloads such as AI usage, HTTP status codes, variables */
  metadata: Record<string, unknown>;
}

// ── Retention Metadata ───────────────────────────────────────────────────────

export interface RetentionMetadata {
  createdAt: string;
  expiresAt: string | null;
  isArchived: boolean;
  archivedAt: string | null;
}

// ── Index Specifications for Future Persisted DB Optimization ─────────────────

export interface DatabaseIndexDefinition {
  name: string;
  tableName: string;
  fields: string[];
  isUnique?: boolean;
}

export const EXECUTION_DB_INDEXES: DatabaseIndexDefinition[] = [
  {
    name: "idx_execution_workflow_id",
    tableName: "executions",
    fields: ["workflowId"],
  },
  {
    name: "idx_execution_status",
    tableName: "executions",
    fields: ["status"],
  },
  {
    name: "idx_execution_started_at",
    tableName: "executions",
    fields: ["startedAt"],
  },
];

export const TIMELINE_DB_INDEXES: DatabaseIndexDefinition[] = [
  {
    name: "idx_timeline_execution_id",
    tableName: "timeline_entries",
    fields: ["executionId"],
  },
  {
    name: "idx_timeline_node_id",
    tableName: "timeline_entries",
    fields: ["executionId", "nodeId"],
  },
  {
    name: "idx_timeline_level",
    tableName: "timeline_entries",
    fields: ["level"],
  },
  {
    name: "idx_timeline_timestamp",
    tableName: "timeline_entries",
    fields: ["timestamp"],
  },
];
