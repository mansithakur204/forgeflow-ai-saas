import type { AgentTask } from "./orchestration";

export type PlanStatus = "pending" | "running" | "completed" | "failed";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type ExecutionStrategyType = "sequential" | "parallel" | "adaptive";

export interface ExecutionStrategy {
  type: ExecutionStrategyType;
  maxParallelism?: number;
  stopOnFailure: boolean;
}

export interface PlanningTask extends Omit<AgentTask, "status"> {
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  recoveryStrategy?: "retry" | "replan" | "fail" | "ignore";
  inputVariables: string[]; // context variables this task consumes
  outputVariables: string[]; // context variables this task produces
}

export interface ExecutionPlan {
  id: string;
  objective: string;
  tasks: PlanningTask[];
  strategy: ExecutionStrategy;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HandoffRequest {
  fromAgentId: string;
  toAgentId: string;
  taskId: string;
  payload: Record<string, unknown>;
}

export interface HandoffResult {
  success: boolean;
  transferredData: Record<string, unknown>;
  error?: string;
}

// ── Planner Agent Domain Typings ──────────────────────────────────────────────

export type PlanningStatus =
  | "idle"
  | "analyzing"
  | "decomposing"
  | "generating"
  | "completed"
  | "failed";

export interface PlannerConfiguration {
  maxTasks?: number;
  allowParallelExecution?: boolean;
  strategyType?: ExecutionStrategyType;
  defaultMaxRetries?: number;
}

export interface PlanningContext {
  goal: string;
  variables: Record<string, unknown>;
  constraints: string[];
  successCriteria: string[];
  priority: "low" | "medium" | "high" | "critical";
  planningStatus: PlanningStatus;
}

export interface AgentPlanningResult {
  planId: string;
  plan: ExecutionPlan;
  goalAnalyzed: boolean;
  detectedIntent: string;
  detectedCategory: string;
  success: boolean;
  error?: string;
}
