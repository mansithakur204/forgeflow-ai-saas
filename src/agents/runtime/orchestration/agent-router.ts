import type { AgentRegistry } from "../agent-registry";

export class AgentRouter {
  private registry: AgentRegistry;

  constructor(registry: AgentRegistry) {
    this.registry = registry;
  }

  /**
   * Routes descriptions keywords to matching agent IDs.
   */
  route(taskDescription: string): string {
    const desc = taskDescription.toLowerCase();

    if (desc.includes("plan") || desc.includes("schedule")) {
      return "planner-agent";
    }
    if (desc.includes("code") || desc.includes("write") || desc.includes("refactor")) {
      return "coding-agent";
    }
    if (desc.includes("execute") || desc.includes("run")) {
      return "executor-agent";
    }
    if (desc.includes("search") || desc.includes("find") || desc.includes("research")) {
      return "research-agent";
    }
    if (desc.includes("remember") || desc.includes("memory") || desc.includes("load")) {
      return "memory-agent";
    }

    return "tool-agent";
  }
}
