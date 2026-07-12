import type { ToolRegistry } from "../tool-registry";
import type { ITool } from "../tool.interface";
import type { ToolDiscoveryQuery, IToolSelectionStrategy } from "../../../types/tool-execution";
import type { ToolConfig } from "../../../types/tool";

export class HighestCapabilityMatchStrategy implements IToolSelectionStrategy {
  select(tools: ToolConfig[], query: ToolDiscoveryQuery): ToolConfig | null {
    let bestTool: ToolConfig | null = null;
    let highestScore = -1;

    for (const tool of tools) {
      let score = 0;

      // Capability matching
      if (query.requiresNetwork !== undefined && tool.capability.requiresNetwork === query.requiresNetwork) {
        score += 2;
      }
      if (query.requiresFileSystem !== undefined && tool.capability.requiresFileSystem === query.requiresFileSystem) {
        score += 2;
      }
      if (query.requiresDatabase !== undefined && tool.capability.requiresDatabase === query.requiresDatabase) {
        score += 2;
      }
      if (query.requiresAuthentication !== undefined && tool.capability.requiresAuthentication === query.requiresAuthentication) {
        score += 2;
      }

      // Keyword matching (matches metadata name/id/description)
      if (query.keywords && query.keywords.length > 0) {
        const text = `${tool.metadata.name} ${tool.metadata.id} ${tool.metadata.description}`.toLowerCase();
        for (const word of query.keywords) {
          if (text.includes(word.toLowerCase())) {
            score += 3;
          }
        }
      }

      // Permissions matching
      if (query.scopes && query.scopes.length > 0) {
        const matchingScopes = tool.permission.scopes.filter((s) => query.scopes?.includes(s));
        score += matchingScopes.length * 1.5;
      }

      if (score > highestScore) {
        highestScore = score;
        bestTool = tool;
      }
    }

    return bestTool;
  }
}

export class ToolDiscovery {
  private registry: ToolRegistry;
  private selectionStrategy: IToolSelectionStrategy;

  constructor(
    registry: ToolRegistry,
    strategy: IToolSelectionStrategy = new HighestCapabilityMatchStrategy()
  ) {
    this.registry = registry;
    this.selectionStrategy = strategy;
  }

  setSelectionStrategy(strategy: IToolSelectionStrategy): void {
    this.selectionStrategy = strategy;
  }

  /**
   * Discovers tools matching capabilities and keywords query.
   */
  discover(query: ToolDiscoveryQuery): ITool[] {
    const list = this.registry.list();
    return list.filter((tool) => {
      const config = tool.getConfig();

      // Check capabilities
      if (query.requiresNetwork !== undefined && config.capability.requiresNetwork !== query.requiresNetwork) {
        return false;
      }
      if (query.requiresFileSystem !== undefined && config.capability.requiresFileSystem !== query.requiresFileSystem) {
        return false;
      }
      if (query.requiresDatabase !== undefined && config.capability.requiresDatabase !== query.requiresDatabase) {
        return false;
      }
      if (query.requiresAuthentication !== undefined && config.capability.requiresAuthentication !== query.requiresAuthentication) {
        return false;
      }

      // Check scopes if specified
      if (query.scopes && query.scopes.length > 0) {
        const hasScope = config.permission.scopes.some((s) => query.scopes?.includes(s));
        if (!hasScope) return false;
      }

      // Check keywords
      if (query.keywords && query.keywords.length > 0) {
        const text = `${config.metadata.name} ${config.metadata.id} ${config.metadata.description}`.toLowerCase();
        const matchesKeyword = query.keywords.some((word) => text.includes(word.toLowerCase()));
        if (!matchesKeyword) return false;
      }

      return true;
    });
  }

  /**
   * Selects the single best matching tool from the registry.
   */
  selectTool(query: ToolDiscoveryQuery): ITool | null {
    const candidates = this.discover({
      requiresNetwork: query.requiresNetwork,
      requiresFileSystem: query.requiresFileSystem,
      requiresDatabase: query.requiresDatabase,
      requiresAuthentication: query.requiresAuthentication,
    });

    if (candidates.length === 0) return null;

    const configs = candidates.map((c) => c.getConfig());
    const selectedConfig = this.selectionStrategy.select(configs, query);
    if (!selectedConfig) return null;

    return candidates.find((c) => c.getConfig().metadata.id === selectedConfig.metadata.id) ?? null;
  }
}
