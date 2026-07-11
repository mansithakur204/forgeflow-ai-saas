import type { AgentTask } from "../../types/orchestration";

export class TaskQueue {
  private tasks = new Map<string, AgentTask>();

  /**
   * Adds a task to the queue. Throws if ID is duplicated.
   */
  addTask(task: AgentTask): void {
    if (this.tasks.has(task.id)) {
      throw new Error(`Duplicate task addition: Task with ID "${task.id}" is already queued`);
    }
    this.tasks.set(task.id, task);
  }

  getTask(id: string): AgentTask | null {
    return this.tasks.get(id) ?? null;
  }

  /**
   * Returns list of runnable tasks. A task is runnable if it is pending and all of its dependencies are completed.
   */
  getRunnableTasks(): AgentTask[] {
    const list = Array.from(this.tasks.values());
    return list.filter((task) => {
      if (task.status !== "pending") return false;

      for (const depId of task.dependencies) {
        const dep = this.tasks.get(depId);
        if (!dep || dep.status !== "completed") return false;
      }

      return true;
    });
  }

  getAllTasks(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  clear(): void {
    this.tasks.clear();
  }
}
