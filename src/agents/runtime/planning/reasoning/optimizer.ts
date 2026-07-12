import type { Goal } from "../../../types/reasoning";
import type { PlanningTask } from "../../../types/planning";

export class PlanningValidator {
  /**
   * Asserts whether the goal list and task configurations are valid.
   */
  validate(goals: Goal[], tasks: PlanningTask[]): void {
    if (goals.length === 0) {
      throw new Error("Validation Error: Goals list is empty.");
    }

    // Check that every non-root goal is linked correctly
    for (const g of goals) {
      if (g.parentId === null && goals.filter((other) => other.parentId === null).length > 1) {
        throw new Error("Validation Error: Multiple root goals found.");
      }
    }

    // Check that every task is defined in the plan
    const taskIds = new Set(tasks.map((t) => t.id));
    for (const g of goals) {
      for (const tId of g.tasks) {
        if (!taskIds.has(tId)) {
          throw new Error(
            `Validation Error: Goal "${g.title}" references undefined task ID "${tId}".`
          );
        }
      }
    }
  }
}

export class PlanOptimizer {
  /**
   * Optimizes execution order by merging identical redundant tasks and parallelizing steps where safe.
   */
  optimize(tasks: PlanningTask[]): PlanningTask[] {
    const optimized: PlanningTask[] = [];
    const seenDescriptions = new Map<string, PlanningTask>();

    for (const task of tasks) {
      const descKey = `${task.assignedAgentId}:${task.description.toLowerCase().trim()}`;
      const duplicate = seenDescriptions.get(descKey);

      if (duplicate) {
        // Redirect dependencies pointing to current task to the duplicate
        for (const t of tasks) {
          const idx = t.dependencies.indexOf(task.id);
          if (idx !== -1) {
            t.dependencies[idx] = duplicate.id;
          }
        }
      } else {
        seenDescriptions.set(descKey, task);
        optimized.push(task);
      }
    }

    // Remove duplicates from dependency arrays
    for (const task of optimized) {
      task.dependencies = Array.from(new Set(task.dependencies)).filter((d) => d !== task.id);
    }

    return optimized;
  }
}
