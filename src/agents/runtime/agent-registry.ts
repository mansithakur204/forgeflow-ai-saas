import type { IAgent } from "./agent.interface";
import type { AgentCapability, AgentCapabilities, AgentRole } from "../types/agent";

export class AgentRegistry {
  // Maps agentId -> registered versions of the agent
  private agents = new Map<string, IAgent[]>();

  /**
   * Registers an agent instance. Throws if matching ID and version is already registered.
   */
  register(agent: IAgent): void {
    const id = agent.getConfig().id.toLowerCase().trim();
    const version = agent.getConfig().metadata.version;
    const existingVersions = this.agents.get(id) || [];

    const isDuplicate = existingVersions.some((a) => a.getConfig().metadata.version === version);
    if (isDuplicate) {
      throw new Error(
        `Duplicate agent registration: Agent with ID "${id}" and version "${version}" is already registered`
      );
    }

    existingVersions.push(agent);
    this.agents.set(id, existingVersions);
  }

  /**
   * Resolves a registered agent instance. If version is not specified, returns the latest version.
   */
  resolve(id: string, version?: string): IAgent | null {
    const versions = this.agents.get(id.toLowerCase().trim());
    if (!versions || versions.length === 0) {
      return null;
    }

    if (version) {
      return versions.find((a) => a.getConfig().metadata.version === version) ?? null;
    }

    // Sort to return the latest semantic version
    const sorted = [...versions].sort((a, b) =>
      this.compareVersions(b.getConfig().metadata.version, a.getConfig().metadata.version)
    );
    return sorted[0] || null;
  }

  /**
   * Removes all versions of a registered agent, or a specific version if specified.
   */
  unregister(id: string, version?: string): void {
    const key = id.toLowerCase().trim();
    if (!version) {
      this.agents.delete(key);
    } else {
      const versions = this.agents.get(key);
      if (versions) {
        const filtered = versions.filter((a) => a.getConfig().metadata.version !== version);
        if (filtered.length === 0) {
          this.agents.delete(key);
        } else {
          this.agents.set(key, filtered);
        }
      }
    }
  }

  /**
   * Resets registry mapping.
   */
  clear(): void {
    this.agents.clear();
  }

  /**
   * Lists all registered agent instances (latest version of each).
   */
  list(): IAgent[] {
    const result: IAgent[] = [];
    for (const id of this.agents.keys()) {
      const latest = this.resolve(id);
      if (latest) {
        result.push(latest);
      }
    }
    return result;
  }

  /**
   * Discovers agents by capability and role filters (Task 14.1B)
   */
  discover(reqs: { capabilities?: AgentCapability[]; role?: AgentRole }): IAgent[] {
    const all = this.list();
    return all.filter((agent) => {
      const config = agent.getConfig();

      // Check role
      if (reqs.role && config.role !== reqs.role) {
        return false;
      }

      // Check capabilities
      if (reqs.capabilities && reqs.capabilities.length > 0) {
        const agentCaps = config.capabilities;
        for (const cap of reqs.capabilities) {
          if (Array.isArray(agentCaps)) {
            if (!agentCaps.includes(cap)) return false;
          } else {
            // Check properties of AgentCapabilities object
            const propMap: Record<AgentCapability, keyof AgentCapabilities> = {
              plan: "canPlan",
              execute: "canExecute",
              search_code: "canSearchCode",
              edit_code: "canEditCode",
              access_memory: "canAccessMemory",
              use_tools: "canUseTools",
              review: "canPlan", // fallback
              handoff: "canExecute", // fallback
            };
            const prop = propMap[cap];
            if (prop && !agentCaps[prop]) return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Utility to compare semantic version strings.
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = Number.isNaN(parts1[i]) ? 0 : parts1[i] ?? 0;
      const p2 = Number.isNaN(parts2[i]) ? 0 : parts2[i] ?? 0;
      if (p1 !== p2) {
        return p1 - p2;
      }
    }
    return 0;
  }
}
