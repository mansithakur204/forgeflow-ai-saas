import type { ExecutionPlan, ExecutionStrategy } from "../../types/planning";
import { TaskDecompositionEngine } from "./task-decomposition-engine";
import { DynamicTaskAssignment } from "./dynamic-task-assignment";
import { AgentCollaborationPlanner } from "./agent-collaboration-planner";
import { CollaborationGraph } from "./collaboration-graph";
import { DependencyResolution } from "./dependency-resolution";
import type { AgentRegistry } from "../agent-registry";

export class PlanningPipeline {
  private decompositionEngine: TaskDecompositionEngine;
  private assignmentEngine: DynamicTaskAssignment;
  private collaborationPlanner: AgentCollaborationPlanner;

  constructor(registry: AgentRegistry) {
    this.decompositionEngine = new TaskDecompositionEngine();
    this.assignmentEngine = new DynamicTaskAssignment(registry);
    this.collaborationPlanner = new AgentCollaborationPlanner();
  }

  /**
   * Generates a fully composed, validated, and assigned ExecutionPlan from an objective.
   */
  generatePlan(objective: string, strategy: ExecutionStrategy): ExecutionPlan {
    // 1. Decompose objective into subtasks
    const tasks = this.decompositionEngine.decomposeObjective(objective);

    // 2. Assign tasks dynamically to appropriate agents
    for (const task of tasks) {
      this.assignmentEngine.assignTask(task);
    }

    // 3. Plan collaboration dependencies and parameter routing
    this.collaborationPlanner.planCollaboration(tasks);

    // 4. Build graph and validate cycle-free constraints
    const graph = new CollaborationGraph(tasks);
    if (graph.hasCycle()) {
      throw new Error(
        `Plan generation failed: objective "${objective}" produced a task graph with cycles.`
      );
    }

    // 5. Ensure dependency order compiles cleanly
    DependencyResolution.resolveOrder(graph);

    const timestamp = new Date().toISOString();
    return {
      id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      objective,
      tasks,
      strategy,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }
}
