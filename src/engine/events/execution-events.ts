// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Execution Event Contracts
// Typed event payloads for workflow and node lifecycle. No emitter implementation.
// ─────────────────────────────────────────────────────────────────────────────

import type { NodeExecutionStatus, WorkflowRunStatus } from "@/engine/types/execution";
import type { NodeExecutionResult } from "@/engine/types/runtime";

export type WorkflowEventType =
  | "workflow.pending"
  | "workflow.queued"
  | "workflow.started"
  | "workflow.completed"
  | "workflow.failed"
  | "workflow.cancelled"
  | "workflow.stopped";

export type NodeEventType =
  | "node.pending"
  | "node.queued"
  | "node.started"
  | "node.completed"
  | "node.failed"
  | "node.skipped"
  | "node.retry_scheduled";

export type ExecutionEventType = WorkflowEventType | NodeEventType;

export interface ExecutionEventBase {
  readonly type: ExecutionEventType;
  readonly runId: string;
  readonly timestamp: string;
}

export interface WorkflowStatusEvent extends ExecutionEventBase {
  readonly type: WorkflowEventType;
  readonly workflowId: string;
  readonly previousStatus: WorkflowRunStatus;
  readonly status: WorkflowRunStatus;
}

export interface WorkflowStartedEvent extends ExecutionEventBase {
  readonly type: "workflow.started";
  readonly workflowId: string;
  readonly workflowVersion: number;
  readonly initiatedBy: string;
}

export interface WorkflowCompletedEvent extends ExecutionEventBase {
  readonly type: "workflow.completed";
  readonly workflowId: string;
  readonly durationMs: number;
}

export interface WorkflowFailedEvent extends ExecutionEventBase {
  readonly type: "workflow.failed";
  readonly workflowId: string;
  readonly failedNodeId: string | null;
  readonly errorMessage: string;
}

export interface WorkflowCancelledEvent extends ExecutionEventBase {
  readonly type: "workflow.cancelled";
  readonly workflowId: string;
  readonly reason: "user_cancel" | "stop_requested";
}

export interface WorkflowStoppedEvent extends ExecutionEventBase {
  readonly type: "workflow.stopped";
  readonly workflowId: string;
  readonly completedNodeCount: number;
  readonly skippedNodeCount: number;
}

export interface NodeStatusEvent extends ExecutionEventBase {
  readonly type: NodeEventType;
  readonly nodeId: string;
  readonly previousStatus: NodeExecutionStatus;
  readonly status: NodeExecutionStatus;
}

export interface NodeStartedEvent extends ExecutionEventBase {
  readonly type: "node.started";
  readonly nodeId: string;
  readonly nodeTypeId: string;
  readonly attempt: number;
}

export interface NodeCompletedEvent extends ExecutionEventBase {
  readonly type: "node.completed";
  readonly nodeId: string;
  readonly result: NodeExecutionResult;
}

export interface NodeFailedEvent extends ExecutionEventBase {
  readonly type: "node.failed";
  readonly nodeId: string;
  readonly attempt: number;
  readonly errorMessage: string;
  readonly retryable: boolean;
}

export interface NodeSkippedEvent extends ExecutionEventBase {
  readonly type: "node.skipped";
  readonly nodeId: string;
  readonly reason: "upstream_failure" | "cancelled" | "stop_requested" | "condition";
}

export interface NodeRetryScheduledEvent extends ExecutionEventBase {
  readonly type: "node.retry_scheduled";
  readonly nodeId: string;
  readonly attempt: number;
  readonly retryAt: string;
}

export type WorkflowExecutionEvent =
  | WorkflowStatusEvent
  | WorkflowStartedEvent
  | WorkflowCompletedEvent
  | WorkflowFailedEvent
  | WorkflowCancelledEvent
  | WorkflowStoppedEvent;

export type NodeExecutionEvent =
  | NodeStatusEvent
  | NodeStartedEvent
  | NodeCompletedEvent
  | NodeFailedEvent
  | NodeSkippedEvent
  | NodeRetryScheduledEvent;

export type ExecutionEvent = WorkflowExecutionEvent | NodeExecutionEvent;
