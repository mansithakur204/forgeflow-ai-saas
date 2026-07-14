// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Parallel Execution typings
// defines ExecutionBranch, ExecutionBarrier, and SynchronizationContext.
// ─────────────────────────────────────────────────────────────────────────────

export interface ExecutionBranch {
  branchId: string;
  taskIds: string[];
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt?: string;
  completedAt?: string;
  error?: string;
  durationMs?: number;
}

export interface ExecutionBarrier {
  barrierId: string;
  dependencyBranchIds: string[];
  satisfiedBranchIds: string[];
  isSatisfied: boolean;
}

export interface SynchronizationContext {
  syncId: string;
  activeBranches: ExecutionBranch[];
  barriers: ExecutionBarrier[];
  variables: Record<string, unknown>;
}
