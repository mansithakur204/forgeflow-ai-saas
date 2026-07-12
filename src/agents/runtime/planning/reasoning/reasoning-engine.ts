import type { Goal } from "../../../types/reasoning";

export class DecisionEngine {
  /**
   * Selects execution strategy type based on tool/agent network demands.
   */
  chooseExecutionStrategy(goals: Goal[]): "sequential" | "parallel" {
    const networkAgentCount = goals.filter(
      (g) => g.assignedAgentId === "tool-agent" || g.assignedAgentId === "executor-agent"
    ).length;

    if (networkAgentCount >= 2) {
      return "parallel";
    }

    return "sequential";
  }

  /**
   * Decides whether to recover or fail based on goal status and error counts.
   */
  shouldTriggerReplanning(failedGoalCount: number, maxFailuresAllowed: number = 1): boolean {
    return failedGoalCount >= maxFailuresAllowed;
  }
}

export class ReasoningEngine {
  /**
   * Analyzes an objective to determine why a task sequence is appropriate.
   */
  reasonAboutObjective(objective: string): string {
    const text = objective.toLowerCase();
    const reasonSteps: string[] = [];

    reasonSteps.push(`Analyzing objective: "${objective}"`);

    if (text.includes("build") || text.includes("refactor")) {
      reasonSteps.push("- Objective demands structural workspace modifications.");
      reasonSteps.push(
        "- Reasoning: We must discover source paths first, modify the components, and then run verification compiles."
      );
    } else {
      reasonSteps.push("- Objective demands discovery or context assessment.");
      reasonSteps.push("- Reasoning: We should query variables/search indices, and then summarize outcomes.");
    }

    return reasonSteps.join("\n");
  }
}
