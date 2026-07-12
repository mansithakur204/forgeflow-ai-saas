import type { PlanningTask } from "../../types/planning";

export type RecoveryActionType = "retry" | "replan" | "ignore" | "fail";

export interface RecoveryDecision {
  action: RecoveryActionType;
  delayMs?: number;
  reason: string;
}

export class FailureRecoveryStrategy {
  /**
   * Evaluates the failed task and determines the appropriate recovery action.
   */
  evaluate(task: PlanningTask, error: string): RecoveryDecision {
    const strategy = task.recoveryStrategy || "fail";

    if (strategy === "retry") {
      if (task.retryCount < task.maxRetries) {
        // Linear backoff delay: 50ms * retry count
        const delayMs = (task.retryCount + 1) * 50;
        return {
          action: "retry",
          delayMs,
          reason: `Task failed with error "${error}". Attempt ${
            task.retryCount + 1
          }/${task.maxRetries}. Retrying in ${delayMs}ms.`,
        };
      } else {
        // Retries exhausted, escalate to fail
        return {
          action: "fail",
          reason: `Task failed with error "${error}". Retries exhausted (${task.retryCount}/${task.maxRetries}). Escalating to fail.`,
        };
      }
    }

    if (strategy === "replan") {
      return {
        action: "replan",
        reason: `Task failed with error "${error}". Strategy is replan. Initiating plan re-evaluation.`,
      };
    }

    if (strategy === "ignore") {
      return {
        action: "ignore",
        reason: `Task failed with error "${error}". Strategy is ignore. Proceeding with remaining tasks.`,
      };
    }

    // Default: fail
    return {
      action: "fail",
      reason: `Task failed with error "${error}". Strategy is fail. Terminating plan execution.`,
    };
  }
}
