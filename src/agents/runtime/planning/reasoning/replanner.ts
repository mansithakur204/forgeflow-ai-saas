import type { Goal } from "../../../types/reasoning";
import type { ExecutionPlan, PlanningTask, TaskStatus } from "../../../types/planning";
import { GoalManager } from "./goal-manager";

export class FailureRecoveryEngine {
  /**
   * Translates a task failure to its matching goal failure.
   */
  handleTaskFailure(goalManager: GoalManager, failedTaskId: string, error: string): void {
    const goals = goalManager.getAllGoals();
    const matchingGoal = goals.find((g) => g.tasks.includes(failedTaskId));

    if (matchingGoal) {
      goalManager.transitionStatus(matchingGoal.id, "failed");
    }
  }
}

export class DynamicReplanner {
  /**
   * Adapts the hierarchy and plan by inserting a debug task and subgoal sequence prior to the failed task execution.
   */
  replanOnFailure(
    plan: ExecutionPlan,
    goalManager: GoalManager,
    failedTaskId: string,
    error: string
  ): void {
    const failedTask = plan.tasks.find((t) => t.id === failedTaskId);
    if (!failedTask) {
      return;
    }

    // Find parent goal of failed task
    const goals = goalManager.getAllGoals();
    const matchingGoal = goals.find((g) => g.tasks.includes(failedTaskId));
    if (!matchingGoal) {
      return;
    }

    // 1. Create a recovery subgoal and task
    const recoveryTaskId = `recovery-${failedTaskId}-${Date.now()}`;
    const recoveryGoalId = `goal-recovery-${failedTaskId}-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const recoveryTask: PlanningTask = {
      id: recoveryTaskId,
      title: `Analyze Failure: ${failedTask.title}`,
      description: `Resolve execution roadblock: "${error}" for task: ${failedTask.title}`,
      assignedAgentId: "planner-agent",
      status: "pending" as TaskStatus,
      dependencies: [...failedTask.dependencies],
      retryCount: 0,
      maxRetries: 2,
      recoveryStrategy: "ignore",
      inputVariables: [],
      outputVariables: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const recoveryGoal: Goal = {
      id: recoveryGoalId,
      title: `Failure Mitigation: ${matchingGoal.title}`,
      description: `Investigate and restore error state: ${error}`,
      status: "pending",
      parentId: matchingGoal.parentId || matchingGoal.id,
      subGoalIds: [],
      assignedAgentId: "planner-agent",
      tasks: [recoveryTaskId],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // 2. Adjust dependencies: Make the failed task depend on the recovery task
    failedTask.dependencies = [recoveryTaskId];
    failedTask.status = "pending" as TaskStatus;
    failedTask.error = null;
    failedTask.updatedAt = timestamp;

    // Re-activate matchingGoal status
    if (matchingGoal.status === "failed") {
      matchingGoal.status = "active";
      matchingGoal.updatedAt = timestamp;
    }

    // 3. Inject new tasks and goals
    plan.tasks.push(recoveryTask);
    goalManager.addGoal(recoveryGoal);
  }
}
