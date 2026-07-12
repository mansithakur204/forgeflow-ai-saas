import type { PlanningTask } from "../../types/planning";

export class CollaborationGraph {
  private tasks = new Map<string, PlanningTask>();
  private adjacencyList = new Map<string, Set<string>>(); // taskId -> Set of dependent taskIds
  private inDegree = new Map<string, number>(); // taskId -> number of unmet dependencies

  constructor(tasks: PlanningTask[] = []) {
    for (const task of tasks) {
      this.addTask(task);
    }
  }

  addTask(task: PlanningTask): void {
    this.tasks.set(task.id, task);
    if (!this.adjacencyList.has(task.id)) {
      this.adjacencyList.set(task.id, new Set<string>());
    }
    this.inDegree.set(task.id, 0);

    // Set up dependencies
    for (const depId of task.dependencies) {
      if (!this.adjacencyList.has(depId)) {
        this.adjacencyList.set(depId, new Set<string>());
      }
      this.adjacencyList.get(depId)!.add(task.id);
    }
    this.recomputeInDegrees();
  }

  getTask(id: string): PlanningTask | null {
    return this.tasks.get(id) ?? null;
  }

  getAllTasks(): PlanningTask[] {
    return Array.from(this.tasks.values());
  }

  getDependents(taskId: string): string[] {
    return Array.from(this.adjacencyList.get(taskId) ?? []);
  }

  private recomputeInDegrees(): void {
    // Reset
    for (const taskId of this.tasks.keys()) {
      this.inDegree.set(taskId, 0);
    }

    // Populate
    for (const dependents of this.adjacencyList.values()) {
      for (const dep of dependents) {
        if (this.tasks.has(dep)) {
          this.inDegree.set(dep, (this.inDegree.get(dep) || 0) + 1);
        }
      }
    }
  }

  /**
   * Verifies if there are any dependency cycles using Kahn's algorithm.
   */
  hasCycle(): boolean {
    const tempInDegree = new Map<string, number>();
    const queue: string[] = [];

    for (const taskId of this.tasks.keys()) {
      const task = this.tasks.get(taskId);
      const depsCount = task ? task.dependencies.filter((d) => this.tasks.has(d)).length : 0;
      tempInDegree.set(taskId, depsCount);
      if (depsCount === 0) {
        queue.push(taskId);
      }
    }

    let visitedCount = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      visitedCount++;

      const dependents = this.adjacencyList.get(current) || [];
      for (const dep of dependents) {
        if (tempInDegree.has(dep)) {
          const deg = tempInDegree.get(dep)! - 1;
          tempInDegree.set(dep, deg);
          if (deg === 0) {
            queue.push(dep);
          }
        }
      }
    }

    return visitedCount !== this.tasks.size;
  }

  /**
   * Returns tasks that are currently runnable (status is pending and all dependencies are completed).
   */
  getRunnableTasks(): PlanningTask[] {
    const runnables: PlanningTask[] = [];
    for (const task of this.tasks.values()) {
      if (task.status !== "pending") continue;

      let ready = true;
      for (const depId of task.dependencies) {
        const dep = this.tasks.get(depId);
        if (!dep || dep.status !== "completed") {
          ready = false;
          break;
        }
      }
      if (ready) {
        runnables.push(task);
      }
    }
    return runnables;
  }
}
