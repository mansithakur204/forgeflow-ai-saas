import type { Goal } from "../../../types/reasoning";
import type { PlanningTask } from "../../../types/planning";

export class DependencyAnalyzer {
  /**
   * Identifies circular dependency loops in goals.
   */
  hasCycle(goals: Goal[]): boolean {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const g of goals) {
      adj.set(g.id, []);
      inDegree.set(g.id, 0);
    }

    for (const g of goals) {
      if (g.parentId) {
        const parentId = g.parentId;
        if (adj.has(g.id)) {
          adj.get(g.id)!.push(parentId);
          inDegree.set(parentId, (inDegree.get(parentId) || 0) + 1);
        }
      }
    }

    // Kahn's algorithm
    const queue: string[] = [];
    for (const [id, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    let count = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      count++;
      const dependents = adj.get(current) || [];
      for (const dep of dependents) {
        const degree = inDegree.get(dep)! - 1;
        inDegree.set(dep, degree);
        if (degree === 0) {
          queue.push(dep);
        }
      }
    }

    return count !== goals.length;
  }

  /**
   * Sorts tasks topologically based on their dependencies.
   */
  analyzeTaskDependencies(tasks: PlanningTask[]): string[] {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const t of tasks) {
      adj.set(t.id, []);
      inDegree.set(t.id, 0);
    }

    for (const t of tasks) {
      for (const depId of t.dependencies) {
        if (adj.has(depId)) {
          adj.get(depId)!.push(t.id);
          inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
        }
      }
    }

    const queue: string[] = [];
    const sorted: string[] = [];

    for (const [id, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      const dependents = adj.get(current) || [];
      for (const dep of dependents) {
        const degree = inDegree.get(dep)! - 1;
        inDegree.set(dep, degree);
        if (degree === 0) {
          queue.push(dep);
        }
      }
    }

    if (sorted.length !== tasks.length) {
      throw new Error("Task graph contains cycle blockages.");
    }

    return sorted;
  }
}

export class GoalDecomposer {
  /**
   * Decomposes a high-level goal into smaller subgoals.
   */
  decompose(
    parentGoal: Goal,
    subTasks: { title: string; desc: string; agentId: string }[]
  ): Goal[] {
    const subgoals: Goal[] = [];
    const timestamp = new Date().toISOString();

    for (let i = 0; i < subTasks.length; i++) {
      const info = subTasks[i];
      const subGoalId = `subgoal-${parentGoal.id}-${i}-${Date.now()}`;

      const subGoal: Goal = {
        id: subGoalId,
        title: info.title,
        description: info.desc,
        status: "pending",
        parentId: parentGoal.id,
        subGoalIds: [],
        assignedAgentId: info.agentId,
        tasks: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      subgoals.push(subGoal);
      parentGoal.subGoalIds.push(subGoalId);
    }
    parentGoal.updatedAt = timestamp;

    return subgoals;
  }
}

export class ExecutionPlanner {
  private analyzer: DependencyAnalyzer;

  constructor() {
    this.analyzer = new DependencyAnalyzer();
  }

  /**
   * Validates goals list and compiles dependency tasks into a structured schedule.
   */
  compilePlan(goals: Goal[], tasks: PlanningTask[]): void {
    if (this.analyzer.hasCycle(goals)) {
      throw new Error("Circular dependency detected in goal hierarchy.");
    }

    // Verify tasks are orderable
    this.analyzer.analyzeTaskDependencies(tasks);
  }
}
