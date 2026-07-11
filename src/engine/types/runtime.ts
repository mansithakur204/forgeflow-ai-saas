// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Runtime Types
// Contracts for queue jobs, node execution, and workflow runner operations.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ExecutionEnvironment,
  ExecutionTrigger,
  NodeExecution,
  NodeExecutionStatus,
  WorkflowRun,
} from "@/engine/types/execution";
import type { WorkflowDefinition, WorkflowNode } from "@/engine/types/workflow-graph";

export interface NodeExecutionResult {
  nodeId: string;
  runId: string;
  status: NodeExecutionStatus;
  attempt: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  errorMessage: string | null;
}

export interface NodeExecutionInput {
  runId: string;
  node: WorkflowNode;
  inputs: Record<string, unknown>;
  attempt: number;
}

export type NodeExecutor = (input: NodeExecutionInput) => Promise<Record<string, unknown>>;

export type ExecutionQueueJobType = "workflow" | "node";

export interface ExecutionQueueJob {
  id: string;
  type: ExecutionQueueJobType;
  runId: string;
  nodeId: string | null;
  enqueuedAt: string;
}

export interface ExecutionQueueOptions {
  maxConcurrency?: number;
}

export interface ExecutionQueueStats {
  size: number;
  activeCount: number;
  maxConcurrency: number;
  hasCapacity: boolean;
}

export interface StartWorkflowInput {
  runId: string;
  workflow: WorkflowDefinition;
  initiatedBy: string;
  trigger: ExecutionTrigger;
  environment?: ExecutionEnvironment;
}

export interface WorkflowRunSnapshot {
  run: WorkflowRun;
  nodeExecutions: NodeExecution[];
}

import type { ReadonlyExecutorRegistry } from "@/engine/types/executor";

export interface WorkflowRunnerOptions {
  executor: NodeExecutor;
  queue?: ExecutionQueueOptions;
  executorRegistry?: ReadonlyExecutorRegistry;
}

export interface ActiveRunControl {
  cancelRequested: boolean;
  stopRequested: boolean;
}
