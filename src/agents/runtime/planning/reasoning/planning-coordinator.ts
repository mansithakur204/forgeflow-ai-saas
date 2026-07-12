import type { PlanningRequest, PlanningResult } from "../../../types/reasoning";
import type { PlannerRegistry } from "./planner-registry";
import { GoalManager } from "./goal-manager";
import { ReasoningEngine, DecisionEngine } from "./reasoning-engine";
import { PlanningValidator, PlanOptimizer } from "./optimizer";
import { ExecutionPlanner } from "./decomposer";

export class PlanningReasoningCoordinator {
  private registry: PlannerRegistry;
  private goalManager: GoalManager;
  private reasoningEngine: ReasoningEngine;
  private decisionEngine: DecisionEngine;
  private validator: PlanningValidator;
  private optimizer: PlanOptimizer;
  private executionPlanner: ExecutionPlanner;

  constructor(registry: PlannerRegistry) {
    this.registry = registry;
    this.goalManager = new GoalManager();
    this.reasoningEngine = new ReasoningEngine();
    this.decisionEngine = new DecisionEngine();
    this.validator = new PlanningValidator();
    this.optimizer = new PlanOptimizer();
    this.executionPlanner = new ExecutionPlanner();
  }

  getGoalManager(): GoalManager {
    return this.goalManager;
  }

  getReasoningEngine(): ReasoningEngine {
    return this.reasoningEngine;
  }

  getDecisionEngine(): DecisionEngine {
    return this.decisionEngine;
  }

  /**
   * Coordinates the complete planning, validation, optimization, and reasoning pipeline for an objective.
   */
  async coordinatePlanning(request: PlanningRequest, plannerId: string): Promise<PlanningResult> {
    const startTime = Date.now();

    const planner = this.registry.resolve(plannerId);
    if (!planner) {
      throw new Error(`Planner not found in registry: "${plannerId}"`);
    }

    // 1. Generate initial plan and goals
    const rawResult = await planner.plan(request);
    if (!rawResult.success || !rawResult.plan) {
      return rawResult;
    }

    const plan = rawResult.plan;
    const goals = rawResult.goals;

    // 2. Validate structural plan linkages
    this.validator.validate(goals, plan.tasks);

    // 3. Apply optimizations: merge duplicates
    plan.tasks = this.optimizer.optimize(plan.tasks);

    // 4. Compile order dependencies using ExecutionPlanner
    this.executionPlanner.compilePlan(goals, plan.tasks);

    // 5. Apply dynamic strategy selection decision
    const strategyType = this.decisionEngine.chooseExecutionStrategy(goals);
    plan.strategy.type = strategyType;

    // 6. Log objective reasoning
    const reasoningExplanation = this.reasoningEngine.reasonAboutObjective(request.objective);
    plan.objective = `${plan.objective}\n\n[Reasoning Analysis]\n${reasoningExplanation}`;

    // 7. Track goals inside manager
    this.goalManager.clear();
    for (const g of goals) {
      this.goalManager.addGoal(g);
    }

    const totalPlanningTimeMs = Date.now() - startTime;

    return {
      id: rawResult.id,
      success: true,
      goals: this.goalManager.getAllGoals(),
      plan,
      metrics: {
        decompositionTimeMs: rawResult.metrics.decompositionTimeMs,
        optimizationTimeMs: totalPlanningTimeMs - rawResult.metrics.decompositionTimeMs,
        totalPlanningTimeMs,
      },
    };
  }
}
