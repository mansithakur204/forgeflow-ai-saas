// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Execution State Machine
// Validates and applies workflow and node lifecycle transitions.
// ─────────────────────────────────────────────────────────────────────────────

import { RuntimeError } from "@/engine/errors/runtime-errors";
import type { NodeExecutionStatus, WorkflowRunStatus } from "@/engine/types/execution";

const WORKFLOW_TRANSITIONS: Readonly<
  Record<WorkflowRunStatus, readonly WorkflowRunStatus[]>
> = {
  pending: ["queued", "cancelled"],
  queued: ["running", "cancelled"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
  timed_out: [],
};

const NODE_TRANSITIONS: Readonly<
  Record<NodeExecutionStatus, readonly NodeExecutionStatus[]>
> = {
  pending: ["queued", "skipped"],
  queued: ["running", "skipped"],
  running: ["completed", "failed", "retry_scheduled"],
  completed: [],
  failed: [],
  skipped: [],
  retry_scheduled: ["queued", "failed", "skipped"],
};

const TERMINAL_WORKFLOW_STATUSES: ReadonlySet<WorkflowRunStatus> = new Set([
  "completed",
  "failed",
  "cancelled",
  "timed_out",
]);

const TERMINAL_NODE_STATUSES: ReadonlySet<NodeExecutionStatus> = new Set([
  "completed",
  "failed",
  "skipped",
]);

export class ExecutionStateMachine {
  canTransitionWorkflow(from: WorkflowRunStatus, to: WorkflowRunStatus): boolean {
    return WORKFLOW_TRANSITIONS[from].includes(to);
  }

  transitionWorkflow(
    from: WorkflowRunStatus,
    to: WorkflowRunStatus,
    runId?: string
  ): WorkflowRunStatus {
    if (!this.canTransitionWorkflow(from, to)) {
      throw new RuntimeError(
        "INVALID_STATE_TRANSITION",
        `Workflow cannot transition from "${from}" to "${to}"`,
        { runId, details: { from, to } }
      );
    }
    return to;
  }

  canTransitionNode(from: NodeExecutionStatus, to: NodeExecutionStatus): boolean {
    return NODE_TRANSITIONS[from].includes(to);
  }

  transitionNode(
    from: NodeExecutionStatus,
    to: NodeExecutionStatus,
    runId?: string,
    nodeId?: string
  ): NodeExecutionStatus {
    if (!this.canTransitionNode(from, to)) {
      throw new RuntimeError(
        "INVALID_STATE_TRANSITION",
        `Node cannot transition from "${from}" to "${to}"`,
        { runId, nodeId, details: { from, to } }
      );
    }
    return to;
  }

  isTerminalWorkflowStatus(status: WorkflowRunStatus): boolean {
    return TERMINAL_WORKFLOW_STATUSES.has(status);
  }

  isTerminalNodeStatus(status: NodeExecutionStatus): boolean {
    return TERMINAL_NODE_STATUSES.has(status);
  }

  getAllowedWorkflowTransitions(
    from: WorkflowRunStatus
  ): readonly WorkflowRunStatus[] {
    return WORKFLOW_TRANSITIONS[from];
  }

  getAllowedNodeTransitions(from: NodeExecutionStatus): readonly NodeExecutionStatus[] {
    return NODE_TRANSITIONS[from];
  }
}

export const executionStateMachine = new ExecutionStateMachine();
