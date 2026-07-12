import type { Goal, GoalStatus } from "../../../types/reasoning";

export class GoalManager {
  private goals = new Map<string, Goal>();

  private static readonly VALID_TRANSITIONS: Record<GoalStatus, Set<GoalStatus>> = {
    pending: new Set<GoalStatus>(["active", "abandoned", "failed"]),
    active: new Set<GoalStatus>(["completed", "failed", "abandoned"]),
    completed: new Set<GoalStatus>([]),
    failed: new Set<GoalStatus>(["active", "abandoned"]), // Retries reactivate goals
    abandoned: new Set<GoalStatus>([]),
  };

  /**
   * Adds a goal to the hierarchy.
   */
  addGoal(goal: Goal): void {
    if (this.goals.has(goal.id)) {
      throw new Error(`Duplicate Goal registration: Goal with ID "${goal.id}" is already managed.`);
    }
    this.goals.set(goal.id, { ...goal });

    // Update parent's subGoalIds link
    if (goal.parentId) {
      const parent = this.goals.get(goal.parentId);
      if (parent) {
        if (!parent.subGoalIds.includes(goal.id)) {
          parent.subGoalIds.push(goal.id);
          parent.updatedAt = new Date().toISOString();
        }
      }
    }
  }

  getGoal(id: string): Goal | null {
    const goal = this.goals.get(id);
    return goal ? { ...goal } : null;
  }

  getAllGoals(): Goal[] {
    return Array.from(this.goals.values()).map((g) => ({ ...g }));
  }

  /**
   * Transitions the status of a Goal using the state machine, triggering cascade updates.
   */
  transitionStatus(id: string, targetStatus: GoalStatus): void {
    const goal = this.goals.get(id);
    if (!goal) {
      throw new Error(`Goal with ID "${id}" not found.`);
    }

    const current = goal.status;
    if (current === targetStatus) {
      return;
    }

    const allowed = GoalManager.VALID_TRANSITIONS[current];
    if (!allowed || !allowed.has(targetStatus)) {
      throw new Error(
        `Invalid Goal status transition from "${current}" to "${targetStatus}" for goal "${id}"`
      );
    }

    goal.status = targetStatus;
    goal.updatedAt = new Date().toISOString();

    // Cascading logic:
    if (targetStatus === "abandoned") {
      for (const subId of goal.subGoalIds) {
        const sub = this.goals.get(subId);
        if (sub && (sub.status === "pending" || sub.status === "active")) {
          this.transitionStatus(subId, "abandoned");
        }
      }
    }

    if (goal.parentId) {
      this.evaluateParentState(goal.parentId);
    }
  }

  private evaluateParentState(parentId: string): void {
    const parent = this.goals.get(parentId);
    if (!parent) {
      return;
    }

    const subgoals = parent.subGoalIds
      .map((id) => this.goals.get(id))
      .filter((g): g is Goal => g !== undefined);

    if (parent.status === "active") {
      if (subgoals.some((g) => g.status === "failed")) {
        this.transitionStatus(parent.id, "failed");
      } else if (subgoals.every((g) => g.status === "completed")) {
        this.transitionStatus(parent.id, "completed");
      }
    }
  }

  clear(): void {
    this.goals.clear();
  }
}
