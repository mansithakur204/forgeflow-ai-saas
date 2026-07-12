import type { ToolDiscovery } from "../tools/execution/tool-discovery";
import type { ObjectiveCategory } from "../../types/autonomous";

export class ToolSelector {
  private discovery: ToolDiscovery;

  constructor(discovery: ToolDiscovery) {
    this.discovery = discovery;
  }

  /**
   * Filters and matches appropriate tool identifiers based on query requirements.
   */
  selectTool(category: ObjectiveCategory): string {
    const matches = this.discovery.discover({
      requiresNetwork: category === "query",
      requiresFileSystem: category === "refactor" || category === "compile",
      requiresDatabase: false,
    });

    return matches.length > 0 ? matches[0].getConfig().metadata.id : "terminal-tool";
  }
}

export class WorkflowSelector {
  /**
   * Selects an execution workflow profile ID matching the objective category.
   */
  selectWorkflow(category: ObjectiveCategory): string {
    switch (category) {
      case "refactor":
        return "workflow-refactor-automation";
      case "compile":
        return "workflow-compilation-pipeline";
      default:
        return "workflow-general-execution";
    }
  }
}

export class KnowledgeRetrievalSelector {
  /**
   * Selects search parameter terms to query knowledge data.
   */
  selectQuery(objective: string): string {
    const words = objective.split(" ").filter((w) => w.length > 4);
    return words.slice(0, 3).join(" ");
  }
}

export class MemoryRetrievalSelector {
  /**
   * Identifies keywords to retrieve context from historical memory logs.
   */
  selectKeywords(objective: string): string[] {
    return objective
      .toLowerCase()
      .split(" ")
      .filter((w) => w.length > 4)
      .slice(0, 3);
  }
}
