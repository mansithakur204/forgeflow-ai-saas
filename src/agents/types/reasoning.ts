import type { ExecutionPlan } from "./planning";

export type GoalStatus = "pending" | "active" | "completed" | "failed" | "abandoned";

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  parentId: string | null;
  subGoalIds: string[];
  assignedAgentId: string | null;
  tasks: string[]; // Associated task IDs from execution plans
  createdAt: string;
  updatedAt: string;
}

export interface PlanningRequest {
  id: string;
  objective: string;
  context: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface PlanningResult {
  id: string;
  success: boolean;
  goals: Goal[];
  plan: ExecutionPlan | null;
  error?: string | null;
  metrics: {
    decompositionTimeMs: number;
    optimizationTimeMs: number;
    totalPlanningTimeMs: number;
  };
}

export interface IPlanner {
  getId(): string;
  plan(request: PlanningRequest): Promise<PlanningResult>;
}
