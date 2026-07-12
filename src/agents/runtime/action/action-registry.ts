import type { AgentAction, IActionAdapter, ActionType } from "../../types/action";
import type { ToolExecutionCoordinator } from "../tools/execution/tool-execution-coordinator";
import {
  GitHubActionAdapter,
  AzureDevOpsActionAdapter,
  LocalFileActionAdapter,
  HttpActionAdapter,
  KnowledgeActionAdapter,
  WorkflowActionAdapter,
} from "./adapters";

export class ActionRegistry {
  private actions = new Map<string, AgentAction>();
  private adapters = new Map<ActionType, IActionAdapter>();

  registerAction(action: AgentAction): void {
    const key = action.id.toLowerCase().trim();
    if (this.actions.has(key)) {
      throw new Error(
        `Duplicate Action registration: Action with ID "${action.id}" is already registered.`
      );
    }
    this.actions.set(key, action);
  }

  resolveAction(id: string): AgentAction | null {
    return this.actions.get(id.toLowerCase().trim()) ?? null;
  }

  registerAdapter(adapter: IActionAdapter): void {
    this.adapters.set(adapter.getActionType(), adapter);
  }

  resolveAdapter(type: ActionType): IActionAdapter | null {
    return this.adapters.get(type) ?? null;
  }

  clear(): void {
    this.actions.clear();
    this.adapters.clear();
  }
}

export class ActionFactory {
  static createAdapter(type: ActionType, toolCoordinator: ToolExecutionCoordinator): IActionAdapter {
    switch (type) {
      case "github":
        return new GitHubActionAdapter(toolCoordinator);
      case "azure_devops":
        return new AzureDevOpsActionAdapter(toolCoordinator);
      case "local_file":
        return new LocalFileActionAdapter(toolCoordinator);
      case "http":
        return new HttpActionAdapter(toolCoordinator);
      case "knowledge":
        return new KnowledgeActionAdapter();
      case "workflow":
        return new WorkflowActionAdapter();
      default:
        throw new Error(`Unsupported action adapter type requested: "${type}"`);
    }
  }
}
