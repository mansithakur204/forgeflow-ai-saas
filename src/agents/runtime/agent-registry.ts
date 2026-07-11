import type { IAgent } from "./agent.interface";

export class AgentRegistry {
  private agents = new Map<string, IAgent>();

  /**
   * Registers an agent instance. Throws if matching ID is already registered.
   */
  register(agent: IAgent): void {
    const id = agent.getConfig().id.toLowerCase().trim();
    if (this.agents.has(id)) {
      throw new Error(
        `Duplicate agent registration: Agent with ID "${agent.getConfig().id}" is already registered`
      );
    }
    this.agents.set(id, agent);
  }

  /**
   * Resolves a registered agent instance.
   */
  resolve(id: string): IAgent | null {
    return this.agents.get(id.toLowerCase().trim()) ?? null;
  }

  /**
   * Removes a registered agent.
   */
  unregister(id: string): void {
    this.agents.delete(id.toLowerCase().trim());
  }

  /**
   * Resets registry mapping.
   */
  clear(): void {
    this.agents.clear();
  }
}
