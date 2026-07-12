import type { IPlanner, PlanningRequest, PlanningResult, Goal } from "../../../types/reasoning";
import type { PlanningTask, TaskStatus, ExecutionPlan } from "../../../types/planning";

export abstract class BasePlanner implements IPlanner {
  protected id: string;

  constructor(id: string) {
    this.id = id;
  }

  getId(): string {
    return this.id;
  }

  abstract plan(request: PlanningRequest): Promise<PlanningResult>;

  protected createGoal(
    id: string,
    title: string,
    description: string,
    parentId: string | null = null,
    tasks: string[] = []
  ): Goal {
    const timestamp = new Date().toISOString();
    return {
      id,
      title,
      description,
      status: "pending",
      parentId,
      subGoalIds: [],
      assignedAgentId: null,
      tasks,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  protected createPlanningTask(
    id: string,
    title: string,
    description: string,
    agentId: string,
    dependencies: string[] = []
  ): PlanningTask {
    const timestamp = new Date().toISOString();
    return {
      id,
      title,
      description,
      assignedAgentId: agentId,
      status: "pending" as TaskStatus,
      dependencies,
      retryCount: 0,
      maxRetries: 3,
      recoveryStrategy: "retry",
      inputVariables: [],
      outputVariables: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }
}

export class TaskPlanner extends BasePlanner {
  async plan(request: PlanningRequest): Promise<PlanningResult> {
    const startTime = Date.now();
    const objective = request.objective;
    const goals: Goal[] = [];
    const tasks: PlanningTask[] = [];

    // Create root goal
    const rootGoalId = `goal-root-${Date.now()}`;
    const rootGoal = this.createGoal(rootGoalId, "Achieve Objective", objective);
    goals.push(rootGoal);

    // Decompose based on keywords
    if (objective.toLowerCase().includes("refactor")) {
      const g1Id = `goal-scan-${Date.now()}`;
      const g2Id = `goal-edit-${Date.now()}`;

      const t1 = this.createPlanningTask(
        "task-scan",
        "Scan Repository",
        "Search files for targeting classes",
        "research-agent"
      );
      const t2 = this.createPlanningTask(
        "task-edit",
        "Execute Refactoring",
        "Modify structures for OCP rules",
        "coding-agent",
        ["task-scan"]
      );

      tasks.push(t1, t2);

      const g1 = this.createGoal(g1Id, "Source Discovery", "Find code locations", rootGoalId, [
        "task-scan",
      ]);
      const g2 = this.createGoal(g2Id, "Code Re-writing", "Apply refactoring patterns", rootGoalId, [
        "task-edit",
      ]);

      goals.push(g1, g2);
    } else {
      // Default sequential pipeline
      const g1Id = `goal-plan-${Date.now()}`;
      const g2Id = `goal-exec-${Date.now()}`;

      const t1 = this.createPlanningTask(
        "task-formulate",
        "Formulate Plan",
        "Outline logical constraints",
        "planner-agent"
      );
      const t2 = this.createPlanningTask(
        "task-run",
        "Execute Operations",
        "Invoke shell tools and finalize changes",
        "executor-agent",
        ["task-formulate"]
      );

      tasks.push(t1, t2);

      const g1 = this.createGoal(g1Id, "Strategy Creation", "Draft plan instructions", rootGoalId, [
        "task-formulate",
      ]);
      const g2 = this.createGoal(g2Id, "Task Execution", "Process task operations", rootGoalId, [
        "task-run",
      ]);

      goals.push(g1, g2);
    }

    // Build ExecutionPlan
    const plan: ExecutionPlan = {
      id: `plan-${Date.now()}`,
      objective,
      tasks,
      strategy: { type: "sequential", stopOnFailure: true },
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const decompositionTimeMs = Date.now() - startTime;

    return {
      id: request.id,
      success: true,
      goals,
      plan,
      metrics: {
        decompositionTimeMs,
        optimizationTimeMs: 0,
        totalPlanningTimeMs: decompositionTimeMs,
      },
    };
  }
}

export class PlannerRegistry {
  private planners = new Map<string, IPlanner>();

  register(planner: IPlanner): void {
    const key = planner.getId().toLowerCase().trim();
    if (this.planners.has(key)) {
      throw new Error(
        `Duplicate Planner registration: Planner with ID "${planner.getId()}" is already registered.`
      );
    }
    this.planners.set(key, planner);
  }

  resolve(id: string): IPlanner | null {
    return this.planners.get(id.toLowerCase().trim()) ?? null;
  }

  unregister(id: string): void {
    this.planners.delete(id.toLowerCase().trim());
  }

  clear(): void {
    this.planners.clear();
  }
}

export class PlannerFactory {
  static create(type: string, id: string = `planner-${Date.now()}`): IPlanner {
    const normalized = type.toLowerCase().trim();
    if (normalized === "task" || normalized === "task-planner") {
      return new TaskPlanner(id);
    }
    throw new Error(`Unsupported planner type requested: "${type}"`);
  }
}
