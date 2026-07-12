import type { AgentRegistry } from "../agent-registry";
import type { PlanningTask } from "../../types/planning";
import type { IAgent } from "../agent.interface";

export class DynamicTaskAssignment {
  private registry: AgentRegistry;

  constructor(registry: AgentRegistry) {
    this.registry = registry;
  }

  /**
   * Assigns the optimal agent to a PlanningTask based on matching description keywords with agent capabilities.
   * Modifies task.assignedAgentId in-place and returns the assigned agent ID.
   */
  assignTask(task: PlanningTask, availableAgentIds?: string[]): string {
    const desc = task.description.toLowerCase();
    const title = task.title.toLowerCase();
    const targetText = `${title} ${desc}`;

    // List of candidates
    const candidates: IAgent[] = [];

    // Resolve agents
    const allAgentIds = availableAgentIds ?? [
      "planner-agent",
      "coding-agent",
      "executor-agent",
      "research-agent",
      "memory-agent",
      "tool-agent",
    ];

    for (const id of allAgentIds) {
      const agent = this.registry.resolve(id);
      if (agent) {
        candidates.push(agent);
      }
    }

    if (candidates.length === 0) {
      throw new Error(`Cannot assign task: No agents available in registry.`);
    }

    // Determine the required capabilities
    const needs = {
      plan:
        targetText.includes("plan") ||
        targetText.includes("schedule") ||
        targetText.includes("analyze"),
      execute:
        targetText.includes("execute") ||
        targetText.includes("run") ||
        targetText.includes("test"),
      searchCode:
        targetText.includes("search") ||
        targetText.includes("find") ||
        targetText.includes("scan") ||
        targetText.includes("locate"),
      editCode:
        targetText.includes("code") ||
        targetText.includes("write") ||
        targetText.includes("refactor") ||
        targetText.includes("edit") ||
        targetText.includes("compile"),
      accessMemory:
        targetText.includes("remember") ||
        targetText.includes("memory") ||
        targetText.includes("load") ||
        targetText.includes("store") ||
        targetText.includes("save") ||
        targetText.includes("persist"),
      useTools:
        targetText.includes("tool") ||
        targetText.includes("api") ||
        targetText.includes("deploy") ||
        targetText.includes("call"),
    };

    let bestAgent: IAgent = candidates[0];
    let maxScore = -1;

    for (const agent of candidates) {
      const config = agent.getConfig();
      const caps = config.capabilities;
      let score = 0;

      // Score matching capabilities
      if (needs.plan && caps.canPlan) score += 3;
      if (needs.editCode && caps.canEditCode) score += 3;
      if (needs.execute && caps.canExecute) score += 2;
      if (needs.searchCode && caps.canSearchCode) score += 2;
      if (needs.accessMemory && caps.canAccessMemory) score += 2;
      if (needs.useTools && caps.canUseTools) score += 2;

      // Add a small tie-breaker match on agent name/id keywords
      const agentKey = config.id.toLowerCase();
      if (targetText.includes(agentKey.split("-")[0])) {
        score += 1.5;
      }

      if (score > maxScore) {
        maxScore = score;
        bestAgent = agent;
      }
    }

    const assignedId = bestAgent.getConfig().id;
    task.assignedAgentId = assignedId;
    task.updatedAt = new Date().toISOString();
    return assignedId;
  }
}
