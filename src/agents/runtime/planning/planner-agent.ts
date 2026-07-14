// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Autonomous Planner Agent
// Implements Goal Analysis, Task Decomposition, DAG validation, and cycle checks.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAgent } from "../base-agent";
import type { AgentStatus, AgentRole } from "../../types/agent";
import type { AgentSession } from "../../types/session";
import type {
  ExecutionPlan,
  PlanningTask,
  TaskStatus,
  PlannerConfiguration,
  PlanningContext,
  AgentPlanningResult,
  PlanningStatus,
} from "../../types/planning";
import { TaskDecompositionEngine } from "./task-decomposition-engine";
import { CollaborationGraph } from "./collaboration-graph";

export class PlannerAgent extends BaseAgent {
  private memoryEngineHook: any = null;
  private ragEngineHook: any = null;
  private configOverride: PlannerConfiguration = {};

  constructor() {
    super({
      id: "planner-agent",
      metadata: {
        id: "planner-agent",
        name: "Planner Agent",
        description: "Specialized agent for goal analysis, task decomposition, and execution planning.",
        version: "2.0.0",
        author: "ForgeFlow AI",
      },
      capabilities: {
        canPlan: true,
        canExecute: false,
        canSearchCode: false,
        canEditCode: false,
        canAccessMemory: true,
        canUseTools: false,
      },
      role: "planner" as AgentRole,
    });
  }

  /**
   * Registers a mock hook for UnifiedMemoryRetrievalEngine (Task 14.2E)
   */
  registerMemoryEngine(engine: any): void {
    this.memoryEngineHook = engine;
  }

  /**
   * Registers a mock hook for Knowledge Retrieval RAG (Task 14.2E)
   */
  registerKnowledgeEngine(engine: any): void {
    this.ragEngineHook = engine;
  }

  /**
   * Overrides system defaults (Task 14.2A)
   */
  setConfiguration(config: PlannerConfiguration): void {
    this.configOverride = config;
  }

  async executeStep(session: AgentSession, input: string) {
    const logger: any = session.context.variables.logger || console;
    const agentId = this.getConfig().id;

    // ── Telemetry: Emit PLANNER_STARTED ──
    logger.info(`Planner agent started execution`, { event: "PLANNER_STARTED", goal: input }, agentId);

    // Initialize Planning Context (Task 14.2A)
    const context: PlanningContext = {
      goal: input,
      variables: { ...session.context.variables },
      constraints: [],
      successCriteria: [],
      priority: "medium",
      planningStatus: "analyzing",
    };

    // 1. Goal Analysis (Task 14.2B)
    const goalCleaned = input.toLowerCase();

    // Priority detection
    if (goalCleaned.includes("critical") || goalCleaned.includes("urgent") || goalCleaned.includes("asap")) {
      context.priority = "critical";
    } else if (goalCleaned.includes("high") || goalCleaned.includes("important")) {
      context.priority = "high";
    } else if (goalCleaned.includes("low") || goalCleaned.includes("minor")) {
      context.priority = "low";
    }

    // Intent detection & Goal Classification
    let detectedIntent = "Formulate general pipeline";
    let detectedCategory = "general";

    if (goalCleaned.includes("build") && goalCleaned.includes("deploy")) {
      detectedIntent = "Compile and deploy application stack";
      detectedCategory = "deploy";
    } else if (goalCleaned.includes("research") || goalCleaned.includes("analyze")) {
      detectedIntent = "Conduct document research and gather insights";
      detectedCategory = "query";
    } else if (goalCleaned.includes("refactor") || goalCleaned.includes("code")) {
      detectedIntent = "Perform codebase scan and refactor target lines";
      detectedCategory = "refactor";
    }

    // Constraint Extraction
    if (goalCleaned.includes("retries")) {
      const match = goalCleaned.match(/(\d+)\s*retries/);
      if (match) {
        context.constraints.push(`Maximum retries limit set to ${match[1]}`);
      }
    }
    if (goalCleaned.includes("second") || goalCleaned.includes("timeout")) {
      context.constraints.push("Execution timing constraints must be enforced");
    }

    // Success Criteria
    context.successCriteria.push("All graph execution nodes finish successfully");
    context.successCriteria.push("Outputs are saved to memory store context");

    // Telemetry: Emit GOAL_ANALYZED
    logger.info(`Goal analysis completed`, {
      event: "GOAL_ANALYZED",
      detectedIntent,
      detectedCategory,
      priority: context.priority,
    }, agentId);

    // 2. Task Decomposition (Task 14.2C)
    context.planningStatus = "decomposing";
    const decompEngine = new TaskDecompositionEngine();
    const tasks: PlanningTask[] = decompEngine.decomposeObjective(input);

    // Ensure future compatibility reviewer assignment (Task 14.2G)
    // If the plan has coding or executor tasks, we append a Reviewer task at the end.
    const needsReview = tasks.some(t => t.assignedAgentId === "coding-agent" || t.assignedAgentId === "executor-agent");
    if (needsReview) {
      const reviewerTask: PlanningTask = {
        id: "task-review",
        title: "Review Task Outputs",
        description: "Analyze generated code and build logs to approve changes.",
        assignedAgentId: "reviewer-agent",
        status: "pending" as TaskStatus,
        dependencies: [tasks[tasks.length - 1].id],
        retryCount: 0,
        maxRetries: 3,
        recoveryStrategy: "retry",
        inputVariables: [tasks[tasks.length - 1].outputVariables[0] || "output"],
        outputVariables: ["review_approval"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // For future complexity attribute
      (reviewerTask as any).complexity = "medium";
      tasks.push(reviewerTask);
    }

    // Assign complexity to other tasks
    for (const task of tasks) {
      if (!(task as any).complexity) {
        (task as any).complexity = task.assignedAgentId === "coding-agent" ? "high" : "low";
      }
    }

    // Telemetry: Emit TASKS_GENERATED
    logger.info(`Task decomposition completed`, {
      event: "TASKS_GENERATED",
      totalTasks: tasks.length,
    }, agentId);

    // 3. Planning Graph & Cycle Detection (Task 14.2D)
    context.planningStatus = "generating";
    const graph = new CollaborationGraph(tasks);

    if (graph.hasCycle()) {
      context.planningStatus = "failed";
      logger.error(`Planning failed: Circular dependencies detected in execution graph`, {}, agentId);
      throw new Error("Invalid plan: Circular dependencies detected in execution graph.");
    }

    // Dependency Validation
    const allTaskIds = new Set(tasks.map(t => t.id));
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        if (!allTaskIds.has(depId)) {
          throw new Error(`Invalid plan: Task dependency "${depId}" does not exist in graph.`);
        }
      }
    }

    // Telemetry: Emit PLAN_CREATED
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const executionPlan: ExecutionPlan = {
      id: planId,
      objective: input,
      tasks,
      strategy: {
        type: this.configOverride.strategyType || "sequential",
        maxParallelism: this.configOverride.allowParallelExecution ? 4 : 1,
        stopOnFailure: true,
      },
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    logger.info(`Plan created successfully`, {
      event: "PLAN_CREATED",
      planId,
      strategy: executionPlan.strategy,
    }, agentId);

    // Verify memory and RAG hooks state (Task 14.2E)
    logger.info(`Verifying memory and RAG hooks state`, {
      hasMemoryHook: !!this.memoryEngineHook,
      hasRagHook: !!this.ragEngineHook,
    }, agentId);

    context.planningStatus = "completed";

    // Telemetry: Emit PLANNER_COMPLETED
    logger.info(`Planner agent finished execution`, { event: "PLANNER_COMPLETED", planId }, agentId);

    const planningResult: AgentPlanningResult = {
      planId,
      plan: executionPlan,
      goalAnalyzed: true,
      detectedIntent,
      detectedCategory,
      success: true,
    };

    return {
      output: `Plan generated successfully: ID ${planId} containing ${tasks.length} tasks.`,
      newStatus: "completed" as AgentStatus,
      metadata: {
        planId,
        goalAnalyzed: true,
        detectedIntent,
        detectedCategory,
        success: true,
        planningResult,
        planningContext: context,
      },
    };
  }
}
