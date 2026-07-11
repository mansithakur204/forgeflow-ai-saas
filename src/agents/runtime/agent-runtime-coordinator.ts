import type { AgentRegistry } from "./agent-registry";
import { AgentRuntime } from "./agent-runtime";

export class AgentRuntimeCoordinator {
  private registry: AgentRegistry;
  private activeRuntimes = new Map<string, AgentRuntime>();

  constructor(registry: AgentRegistry) {
    this.registry = registry;
  }

  /**
   * Resolves or instantiates an AgentRuntime coordinator wrapper.
   */
  getRuntime(agentId: string): AgentRuntime {
    const key = agentId.toLowerCase().trim();
    const cached = this.activeRuntimes.get(key);
    if (cached) return cached;

    const agent = this.registry.resolve(agentId);
    if (!agent) {
      throw new Error(`No registered agent found matching ID: "${agentId}"`);
    }

    const runtime = new AgentRuntime(agent);
    this.activeRuntimes.set(key, runtime);
    return runtime;
  }
}
