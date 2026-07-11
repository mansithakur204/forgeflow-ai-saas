// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Executor Domain Types
// Production contracts for node executors, validation, and structured results.
// ─────────────────────────────────────────────────────────────────────────────

import type { ExecutionContext } from "@/engine/context/execution-context";
import type { WorkflowNode } from "@/engine/types/workflow-graph";

export type ExecutorNodeTypeId = string;

export type ExecutorCategory =
  | "trigger"
  | "logic"
  | "ai"
  | "http"
  | "integration";

export interface ExecutorPortDefinition {
  id: string;
  label: string;
  multiple?: boolean;
}

export interface NodeExecutorMetadata {
  nodeTypeId: ExecutorNodeTypeId;
  category: ExecutorCategory;
  version: string;
  displayName: string;
  description: string;
  inputPorts: readonly ExecutorPortDefinition[];
  outputPorts: readonly ExecutorPortDefinition[];
  supportsCancellation: boolean;
  supportsRetry: boolean;
}

export interface ExecutorValidationIssue {
  code: string;
  message: string;
  field?: string;
}

export interface ExecutorValidationInput {
  node: WorkflowNode;
  context?: ExecutionContext;
}

export interface ExecutorValidationResult {
  valid: boolean;
  errors: readonly ExecutorValidationIssue[];
}

export interface ExecutorAbortSignal {
  readonly aborted: boolean;
}

export interface ExecutorExecutionInput {
  node: WorkflowNode;
  context: ExecutionContext;
  inputs: Record<string, unknown>;
  signal: ExecutorAbortSignal;
  attempt: number;
}

export interface ExecutorErrorDetail {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}

export interface ExecutorExecutionResult {
  success: boolean;
  outputs: Record<string, unknown>;
  metadata: Record<string, unknown>;
  error: ExecutorErrorDetail | null;
}

export interface INodeExecutor {
  getMetadata(): NodeExecutorMetadata;
  validate(input: ExecutorValidationInput): ExecutorValidationResult;
  execute(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult>;
  cancel(executionId: string): Promise<void>;
}

export interface ReadonlyExecutorRegistry {
  get(nodeTypeId: ExecutorNodeTypeId): INodeExecutor | undefined;
  has(nodeTypeId: ExecutorNodeTypeId): boolean;
  list(): readonly NodeExecutorMetadata[];
  size(): number;
}
