import type { ITool } from "./tool.interface";
import { ToolRegistry } from "./tool-registry";
import {
  HTTPTool,
  FileTool,
  DatabaseTool,
  SearchTool,
  KnowledgeTool,
  GitHubTool,
  AzureTool,
  EmailTool,
  CalendarTool,
} from "./concrete-tools";

export class ToolFactory {
  /**
   * Instantiates a tool dynamically based on its type key.
   */
  static create(type: string): ITool {
    const normalized = type.toLowerCase().trim();
    switch (normalized) {
      case "http":
      case "http-tool":
        return new HTTPTool();
      case "file":
      case "file-tool":
        return new FileTool();
      case "db":
      case "db-tool":
      case "database":
        return new DatabaseTool();
      case "search":
      case "search-tool":
        return new SearchTool();
      case "knowledge":
      case "knowledge-tool":
        return new KnowledgeTool();
      case "github":
      case "github-tool":
        return new GitHubTool();
      case "azure":
      case "azure-tool":
        return new AzureTool();
      case "email":
      case "email-tool":
        return new EmailTool();
      case "calendar":
      case "calendar-tool":
        return new CalendarTool();
      default:
        throw new Error(`Unsupported tool type requested: "${type}"`);
    }
  }

  /**
   * Generates a preloaded registry containing all default concrete tool configurations.
   */
  static createDefaultRegistry(): ToolRegistry {
    const registry = new ToolRegistry();
    registry.register(new HTTPTool());
    registry.register(new FileTool());
    registry.register(new DatabaseTool());
    registry.register(new SearchTool());
    registry.register(new KnowledgeTool());
    registry.register(new GitHubTool());
    registry.register(new AzureTool());
    registry.register(new EmailTool());
    registry.register(new CalendarTool());
    return registry;
  }
}
