import { AgentRuntime } from "../agent-runtime";
import { PlannerAgent } from "../concrete-agents";
import { PlanningPipeline } from "./planning-pipeline";
import type { ExecutionPlan, ExecutionStrategy } from "../../types/planning";
import type { AgentRegistry } from "../agent-registry";

export class PlannerAgentExecutionEngine {
  private runtime: AgentRuntime;
  private pipeline: PlanningPipeline;

  constructor(registry: AgentRegistry) {
    // Resolve or create PlannerAgent
    let plannerAgent = registry.resolve("planner-agent");
    if (!plannerAgent) {
      plannerAgent = new PlannerAgent();
      registry.register(plannerAgent);
    }
    this.runtime = new AgentRuntime(plannerAgent);
    this.pipeline = new PlanningPipeline(registry);
  }

  /**
   * Runs the planner agent step inside a runtime session, generating an ExecutionPlan.
   */
  async generatePlan(
    objective: string,
    strategy: ExecutionStrategy,
    sessionId: string = `plan-sess-${Date.now()}`
  ): Promise<{ plan: ExecutionPlan; engineOutput: string }> {
    const session = this.runtime.createSession(sessionId);

    // Execute a step on the PlannerAgent to register prompt and initialize agent lifecycle
    const output = await this.runtime.runStep(
      session,
      `Generate execution plan for objective: "${objective}"`
    );

    // Call pipeline to decompose, assign and resolve graph
    const plan = this.pipeline.generatePlan(objective, strategy);

    return {
      plan,
      engineOutput: output,
    };
  }

  /**
   * Refines or adjusts an existing plan based on feedback/error.
   */
  async adaptPlan(
    plan: ExecutionPlan,
    feedback: string,
    sessionId: string = `adapt-sess-${Date.now()}`
  ): Promise<string> {
    const session = this.runtime.createSession(sessionId);
    // Execute step on the planner agent to record plan adaptation event
    const output = await this.runtime.runStep(
      session,
      `Adapt plan ${plan.id} for objective "${plan.objective}" based on feedback: "${feedback}"`
    );

    // Modify the plan description or mark adaptation metadata
    plan.updatedAt = new Date().toISOString();
    return output;
  }
}
