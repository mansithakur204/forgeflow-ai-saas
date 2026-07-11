// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Execution Context Types
// Runtime state and service contracts for workflow execution.
// ─────────────────────────────────────────────────────────────────────────────

import type { ExecutionLogger } from "@/engine/types/logs";
import type {
  ExecutionEnvironment,
  ExecutionTrigger,
  WorkflowRunStatus,
} from "@/engine/types/execution";
import type { WorkflowDefinition } from "@/engine/types/workflow-graph";

export interface ExecutionMetadata {
  startedAt: string;
  correlationId: string;
  workflowName: string;
}

export interface ExecutionServices {
  logger: ExecutionLogger;
}

export interface ExecutionContextSnapshot {
  runId: string;
  workflowId: string;
  workflowVersion: number;
  initiatedBy: string;
  environment: ExecutionEnvironment;
  status: WorkflowRunStatus;
  trigger: ExecutionTrigger;
  variables: Record<string, unknown>;
  nodeOutputs: Record<string, Record<string, unknown>>;
  metadata: ExecutionMetadata;
}

export interface CreateExecutionContextInput {
  runId: string;
  workflow: WorkflowDefinition;
  initiatedBy: string;
  trigger: ExecutionTrigger;
  environment?: ExecutionEnvironment;
  services: ExecutionServices;
  correlationId?: string;
}
