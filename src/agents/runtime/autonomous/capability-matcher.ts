import type { AgentRegistry } from "../agent-registry";
import type { CapabilityMatch, ObjectiveCategory } from "../../types/autonomous";

export class CapabilityMatcher {
  private registry: AgentRegistry;

  constructor(registry: AgentRegistry) {
    this.registry = registry;
  }

  /**
   * Assesses agent capability scores against target categories.
   */
  matchCapabilities(category: ObjectiveCategory): CapabilityMatch[] {
    const agents = this.registry.list();
    const matches: CapabilityMatch[] = [];

    for (const agent of agents) {
      const config = agent.getConfig();
      const capabilities = config.capabilities;
      const matchedCapabilities: string[] = [];
      let score = 0.1;

      if (category === "compile" || category === "deploy") {
        if (capabilities.canExecute) {
          score += 0.7;
          matchedCapabilities.push("canExecute");
        }
      } else if (category === "refactor") {
        if (capabilities.canEditCode) {
          score += 0.8;
          matchedCapabilities.push("canEditCode");
        }
        if (capabilities.canSearchCode) {
          score += 0.1;
          matchedCapabilities.push("canSearchCode");
        }
      } else if (category === "query") {
        if (capabilities.canSearchCode) {
          score += 0.5;
          matchedCapabilities.push("canSearchCode");
        }
        if (capabilities.canAccessMemory) {
          score += 0.4;
          matchedCapabilities.push("canAccessMemory");
        }
      }

      matches.push({
        agentId: config.metadata.id,
        score,
        matchedCapabilities,
      });
    }

    return matches.sort((a, b) => b.score - a.score);
  }
}
