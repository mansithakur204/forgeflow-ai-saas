// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Execution Domain Types
// Run records and status enums for the workflow engine.
// ─────────────────────────────────────────────────────────────────────────────

import type { NodeTypeId } from "@/lib/workflow-data";

export type WorkflowRunStatus =
  | "pending"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

export type NodeExecutionStatus =
  | "pending"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "retry_scheduled";

export type ExecutionEnvironment = "preview" | "production";

export type TriggerType = "manual" | "webhook" | "schedule" | "api";

export interface ExecutionTrigger {
  type: TriggerType;
  payload: unknown;
  receivedAt: string;
}

export interface WorkflowRun {
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
}

export interface NodeExecution {
  id: string;
  runId: string;
  nodeId: string;
  nodeTypeId: NodeTypeId;
  status: NodeExecutionStatus;
  attempt: number;
  startedAt: string | null;
  completedAt: string | null;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  errorMessage: string | null;
}

export interface PortOutputValue {
  portId: string;
  value: unknown;
}
