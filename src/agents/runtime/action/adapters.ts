import type { IActionAdapter, ActionType, AgentAction, ActionExecutionRequest } from "../../types/action";
import type { ToolExecutionCoordinator } from "../tools/execution/tool-execution-coordinator";

export class GitHubActionAdapter implements IActionAdapter {
  private toolCoordinator: ToolExecutionCoordinator;

  constructor(toolCoordinator: ToolExecutionCoordinator) {
    this.toolCoordinator = toolCoordinator;
  }

  getActionType(): ActionType {
    return "github";
  }

  async execute(action: AgentAction, request: ActionExecutionRequest): Promise<unknown> {
    const result = await this.toolCoordinator.executeTool(
      "github-tool",
      request.parameters,
      {
        userId: request.context.userId,
        sessionId: request.context.sessionId,
        variables: {
          ...request.context.variables,
          userScopes: request.context.scopes,
          approved: true,
        },
      }
    );
    if (!result.success) {
      throw new Error(`GitHub action execution failed: ${result.error}`);
    }
    return result.output;
  }
}

export class AzureDevOpsActionAdapter implements IActionAdapter {
  private toolCoordinator: ToolExecutionCoordinator;

  constructor(toolCoordinator: ToolExecutionCoordinator) {
    this.toolCoordinator = toolCoordinator;
  }

  getActionType(): ActionType {
    return "azure_devops";
  }

  async execute(action: AgentAction, request: ActionExecutionRequest): Promise<unknown> {
    const result = await this.toolCoordinator.executeTool(
      "azure-tool",
      request.parameters,
      {
        userId: request.context.userId,
        sessionId: request.context.sessionId,
        variables: {
          ...request.context.variables,
          userScopes: request.context.scopes,
          approved: true,
        },
      }
    );
    if (!result.success) {
      throw new Error(`Azure DevOps action execution failed: ${result.error}`);
    }
    return result.output;
  }
}

export class LocalFileActionAdapter implements IActionAdapter {
  private toolCoordinator: ToolExecutionCoordinator;

  constructor(toolCoordinator: ToolExecutionCoordinator) {
    this.toolCoordinator = toolCoordinator;
  }

  getActionType(): ActionType {
    return "local_file";
  }

  async execute(action: AgentAction, request: ActionExecutionRequest): Promise<unknown> {
    const result = await this.toolCoordinator.executeTool(
      "file-tool",
      request.parameters,
      {
        userId: request.context.userId,
        sessionId: request.context.sessionId,
        variables: {
          ...request.context.variables,
          userScopes: request.context.scopes,
          approved: true,
        },
      }
    );
    if (!result.success) {
      throw new Error(`Local file action execution failed: ${result.error}`);
    }
    return result.output;
  }
}

export class HttpActionAdapter implements IActionAdapter {
  private toolCoordinator: ToolExecutionCoordinator;

  constructor(toolCoordinator: ToolExecutionCoordinator) {
    this.toolCoordinator = toolCoordinator;
  }

  getActionType(): ActionType {
    return "http";
  }

  async execute(action: AgentAction, request: ActionExecutionRequest): Promise<unknown> {
    const result = await this.toolCoordinator.executeTool(
      "http-tool",
      request.parameters,
      {
        userId: request.context.userId,
        sessionId: request.context.sessionId,
        variables: {
          ...request.context.variables,
          userScopes: request.context.scopes,
          approved: true,
        },
      }
    );
    if (!result.success) {
      throw new Error(`HTTP action execution failed: ${result.error}`);
    }
    return result.output;
  }
}

export class KnowledgeActionAdapter implements IActionAdapter {
  getActionType(): ActionType {
    return "knowledge";
  }

  async execute(action: AgentAction, request: ActionExecutionRequest): Promise<unknown> {
    const term = (request.parameters.query as string) || "";
    return `[Knowledge Base Facts Search] Mapped results summary for target query: ${term}`;
  }
}

export class WorkflowActionAdapter implements IActionAdapter {
  getActionType(): ActionType {
    return "workflow";
  }

  async execute(action: AgentAction, request: ActionExecutionRequest): Promise<unknown> {
    const wfId = (request.parameters.workflowId as string) || "generic-wf";
    return `[Workflow Launcher] Initiated workflow sequence: ${wfId}`;
  }
}
