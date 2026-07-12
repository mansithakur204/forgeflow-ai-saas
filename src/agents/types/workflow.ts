import type { ExecutionPlan, PlanningTask } from "./planning";

export type WorkflowStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled"
  | "rolling_back";

export interface WorkflowMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  latencyMs: number;
  progress: number; // Percentage: 0 to 100
}

export interface WorkflowHistoryEntry {
  timestamp: string;
  taskId: string;
  action: string;
  status: string;
  details: string;
}

export interface WorkflowCheckpoint {
  id: string;
  timestamp: string;
  taskStates: Record<string, string>;
  contextSnapshot: Record<string, unknown>;
}

export interface AgentWorkflowSession {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  plan: ExecutionPlan;
  context: Record<string, unknown>;
  metrics: WorkflowMetrics;
  history: WorkflowHistoryEntry[];
  checkpoints: WorkflowCheckpoint[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecutionContext {
  variables: Record<string, unknown>;
  tempMemory: Record<string, unknown>;
  checkpointSnapshot?: WorkflowCheckpoint;
}
