import type { HandoffRequest, HandoffResult } from "../../types/planning";
import type { SharedPlanningContext } from "./shared-planning-context";

export class AgentHandoffManager {
  private allowedHandoffs = new Set<string>(); // "fromAgentId->toAgentId"

  constructor() {
    // Register standard allowed handoff pathways
    this.registerHandoffPath("research-agent", "coding-agent");
    this.registerHandoffPath("coding-agent", "executor-agent");
    this.registerHandoffPath("executor-agent", "planner-agent");
    this.registerHandoffPath("planner-agent", "research-agent");
    this.registerHandoffPath("planner-agent", "executor-agent");
    this.registerHandoffPath("research-agent", "planner-agent");
    this.registerHandoffPath("memory-agent", "planner-agent");
    this.registerHandoffPath("planner-agent", "memory-agent");
  }

  registerHandoffPath(from: string, to: string): void {
    this.allowedHandoffs.add(`${from.toLowerCase().trim()}->${to.toLowerCase().trim()}`);
  }

  isHandoffAllowed(from: string, to: string): boolean {
    const key = `${from.toLowerCase().trim()}->${to.toLowerCase().trim()}`;
    return this.allowedHandoffs.has(key);
  }

  /**
   * Performs the handoff. Copies values from context to destination payload.
   */
  async executeHandoff(
    request: HandoffRequest,
    context: SharedPlanningContext
  ): Promise<HandoffResult> {
    const { fromAgentId, toAgentId, taskId, payload } = request;

    if (!this.isHandoffAllowed(fromAgentId, toAgentId)) {
      return {
        success: false,
        transferredData: {},
        error: `Security constraint error: Handoff route from "${fromAgentId}" to "${toAgentId}" is not authorized.`,
      };
    }

    // Capture variables from payload and update context
    const transferredData: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(payload)) {
      context.set(key, val);
      transferredData[key] = val;
    }

    // Set a specialized task metadata in context to trace source
    context.set(`handoff:${taskId}:source`, fromAgentId);
    context.set(`handoff:${taskId}:destination`, toAgentId);

    context.logHistory({
      taskId,
      agentId: fromAgentId,
      status: "completed",
      result: `Handoff successfully executed to agent: ${toAgentId}`,
    });

    return {
      success: true,
      transferredData,
    };
  }
}
