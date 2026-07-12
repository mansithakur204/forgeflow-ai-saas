import type { AgentWorkflowSession, WorkflowCheckpoint } from "../../types/workflow";

export class WorkflowStateSynchronizer {
  /**
   * Synchronizes and calculates metrics/progress of a workflow session.
   */
  synchronizeMetrics(session: AgentWorkflowSession): void {
    const tasks = session.plan.tasks;
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const failed = tasks.filter((t) => t.status === "failed").length;

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    session.metrics = {
      totalTasks: total,
      completedTasks: completed,
      failedTasks: failed,
      latencyMs: Date.now() - new Date(session.createdAt).getTime(),
      progress,
    };
    session.updatedAt = new Date().toISOString();
  }

  /**
   * Creates a rollback checkpoint saving task states and context variables.
   */
  createCheckpoint(session: AgentWorkflowSession, checkpointId: string): WorkflowCheckpoint {
    const taskStates: Record<string, string> = {};
    for (const t of session.plan.tasks) {
      taskStates[t.id] = t.status;
    }

    const checkpoint: WorkflowCheckpoint = {
      id: checkpointId,
      timestamp: new Date().toISOString(),
      taskStates,
      contextSnapshot: JSON.parse(JSON.stringify(session.context)),
    };

    session.checkpoints.push(checkpoint);
    session.history.push({
      timestamp: new Date().toISOString(),
      taskId: "system",
      action: "checkpoint_created",
      status: session.status,
      details: `Execution checkpoint "${checkpointId}" created successfully.`,
    });
    session.updatedAt = new Date().toISOString();

    return checkpoint;
  }

  /**
   * Rolls back session variables and task statuses to a specific checkpoint.
   */
  rollbackToCheckpoint(session: AgentWorkflowSession, checkpointId: string): void {
    const cp = session.checkpoints.find((c) => c.id === checkpointId);
    if (!cp) {
      throw new Error(`Rollback failed: Checkpoint "${checkpointId}" not found.`);
    }

    session.status = "rolling_back";
    session.context = JSON.parse(JSON.stringify(cp.contextSnapshot));

    // Restore task statuses
    for (const task of session.plan.tasks) {
      if (cp.taskStates[task.id]) {
        task.status = cp.taskStates[task.id] as any;
        if (task.status === "completed") {
          task.error = null;
        }
      } else {
        task.status = "pending";
      }
    }

    session.status = "paused";
    session.history.push({
      timestamp: new Date().toISOString(),
      taskId: "system",
      action: "rolled_back",
      status: "paused",
      details: `Rolled back successfully to checkpoint: "${checkpointId}".`,
    });

    this.synchronizeMetrics(session);
  }
}
