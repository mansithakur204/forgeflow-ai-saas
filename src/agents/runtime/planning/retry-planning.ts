import type { ExecutionPlan, PlanningTask, TaskStatus } from "../../types/planning";
import type { AgentRegistry } from "../agent-registry";
import { DynamicTaskAssignment } from "./dynamic-task-assignment";

export class RetryPlanning {
  private registry: AgentRegistry;
  private assignmentEngine: DynamicTaskAssignment;

  constructor(registry: AgentRegistry) {
    this.registry = registry;
    this.assignmentEngine = new DynamicTaskAssignment(registry);
  }

  /**
   * Prepares a task for a retry attempt. Increments retryCount and resets state.
   */
  prepareRetry(task: PlanningTask): void {
    task.retryCount++;
    task.status = "pending" as TaskStatus;
    task.error = null;
    task.updatedAt = new Date().toISOString();
  }

  /**
   * Dynamically replans the execution plan by injecting a diagnostics/corrective task or re-assigning the failed task.
   */
  executeReplan(plan: ExecutionPlan, failedTaskId: string, error: string): void {
    const failedTask = plan.tasks.find((t) => t.id === failedTaskId);
    if (!failedTask) {
      throw new Error(`Replan failed: Task with ID "${failedTaskId}" not found in plan.`);
    }

    // Dynamic recovery: Re-assign the task to a different agent than the current one to see if that helps
    const currentAgent = failedTask.assignedAgentId;
    const fallbackAgents = [
      "tool-agent",
      "coding-agent",
      "executor-agent",
      "research-agent",
      "planner-agent",
    ].filter((id) => id !== currentAgent);

    // Try assigning to next best agent
    this.assignmentEngine.assignTask(failedTask, fallbackAgents);

    // Also, we can inject a "Recovery & Fix" helper task before the failed task is rerun.
    const recoveryTaskId = `recovery-${failedTaskId}-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const recoveryTask: PlanningTask = {
      id: recoveryTaskId,
      title: `Analyze Failure: ${failedTask.title}`,
      description: `Investigate and resolve error: "${error}" for task "${failedTask.title}". Clean up parameters.`,
      assignedAgentId: "planner-agent",
      status: "pending" as TaskStatus,
      dependencies: [...failedTask.dependencies], // runs after same dependencies as failed task
      retryCount: 0,
      maxRetries: 2,
      recoveryStrategy: "ignore",
      inputVariables: [],
      outputVariables: [`recovery:${failedTaskId}:status`],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Make the failed task depend on the recovery task so it runs after it
    failedTask.dependencies = [recoveryTaskId];
    failedTask.status = "pending" as TaskStatus;
    failedTask.error = null;
    failedTask.updatedAt = timestamp;

    // Inject recovery task into the plan
    plan.tasks.push(recoveryTask);
    plan.updatedAt = timestamp;
  }
}
