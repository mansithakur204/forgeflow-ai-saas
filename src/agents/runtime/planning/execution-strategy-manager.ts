import type { ExecutionPlan, PlanningTask } from "../../types/planning";
import { CollaborationGraph } from "./collaboration-graph";
import { DependencyResolution } from "./dependency-resolution";

export class ExecutionStrategyManager {
  /**
   * Returns the next tasks to execute based on the plan strategy and current task statuses.
   */
  getNextBatch(plan: ExecutionPlan, graph: CollaborationGraph): PlanningTask[] {
    const strategy = plan.strategy;

    if (plan.status === "failed" || plan.status === "completed") {
      return [];
    }

    // Get tasks that are ready to run (pending + all dependencies completed)
    const runnable = graph.getRunnableTasks();

    if (strategy.type === "sequential") {
      // Return only the first runnable task in topological order
      const ordered = DependencyResolution.resolveOrder(graph);
      const firstRunnable = ordered.find((t) => runnable.some((r) => r.id === t.id));
      return firstRunnable ? [firstRunnable] : [];
    }

    if (strategy.type === "parallel") {
      const limit = strategy.maxParallelism ?? Infinity;
      return runnable.slice(0, limit);
    }

    // Adaptive strategy: runs all runnables and allows dynamic updates
    return runnable;
  }

  /**
   * Checks if plan has finished successfully, failed, or is deadlocked.
   */
  checkPlanStatus(
    plan: ExecutionPlan,
    graph: CollaborationGraph
  ): "running" | "completed" | "failed" {
    const tasks = plan.tasks;

    const failedTask = tasks.find((t) => t.status === "failed");
    if (failedTask && plan.strategy.stopOnFailure) {
      return "failed";
    }

    const allCompletedOrSkipped = tasks.every(
      (t) => t.status === "completed" || t.status === "skipped"
    );
    if (allCompletedOrSkipped) {
      return "completed";
    }

    // Check for deadlock
    const running = tasks.some((t) => t.status === "running");
    const pending = tasks.some((t) => t.status === "pending");
    if (!running && pending) {
      const runnable = graph.getRunnableTasks();
      if (runnable.length === 0) {
        // Deadlock: pending tasks exist but none are runnable
        return "failed";
      }
    }

    return "running";
  }
}
