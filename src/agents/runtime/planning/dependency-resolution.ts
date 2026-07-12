import { CollaborationGraph } from "./collaboration-graph";
import type { PlanningTask } from "../../types/planning";

export class DependencyResolution {
  /**
   * Sorts the tasks topologically. Throws if a cycle is detected.
   */
  static resolveOrder(graph: CollaborationGraph): PlanningTask[] {
    if (graph.hasCycle()) {
      throw new Error("Cannot resolve dependencies: Cycle detected in planning task graph.");
    }

    const tasks = graph.getAllTasks();
    const tempInDegree = new Map<string, number>();
    const adjacencyList = new Map<string, string[]>();
    const queue: string[] = [];
    const orderedIds: string[] = [];

    // Initialize structures
    for (const t of tasks) {
      adjacencyList.set(t.id, []);
    }

    for (const t of tasks) {
      const activeDeps = t.dependencies.filter((d) => tasks.some((ot) => ot.id === d));
      tempInDegree.set(t.id, activeDeps.length);

      for (const depId of activeDeps) {
        if (!adjacencyList.has(depId)) {
          adjacencyList.set(depId, []);
        }
        adjacencyList.get(depId)!.push(t.id);
      }

      if (activeDeps.length === 0) {
        queue.push(t.id);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const current = queue.shift()!;
      orderedIds.push(current);

      const dependents = adjacencyList.get(current) || [];
      for (const dep of dependents) {
        const degree = tempInDegree.get(dep)! - 1;
        tempInDegree.set(dep, degree);
        if (degree === 0) {
          queue.push(dep);
        }
      }
    }

    return orderedIds
      .map((id) => graph.getTask(id))
      .filter((t): t is PlanningTask => t !== null);
  }
}
