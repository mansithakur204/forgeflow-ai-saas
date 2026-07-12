export type ActionType =
  | "github"
  | "azure_devops"
  | "local_file"
  | "http"
  | "knowledge"
  | "workflow"
  | "custom";

export interface AgentAction {
  id: string;
  name: string;
  description: string;
  type: ActionType;
  requiredScopes: string[];
  requiresApproval: boolean;
  schema?: Record<string, unknown>;
}

export interface ActionContext {
  sessionId: string;
  userId: string;
  scopes: string[];
  approvedTokens: string[];
  variables: Record<string, unknown>;
}

export interface ActionExecutionRequest {
  actionId: string;
  parameters: Record<string, unknown>;
  context: ActionContext;
}

export interface ActionExecutionMetrics {
  latencyMs: number;
  retryCount: number;
}

export interface ActionExecutionResult {
  success: boolean;
  output: unknown;
  error?: string | null;
  metrics: ActionExecutionMetrics;
}

export interface ActionAuditLog {
  timestamp: string;
  actionId: string;
  sessionId: string;
  status: "success" | "failed" | "permission_denied" | "pending_approval";
  details: string;
}

export interface IActionAdapter {
  getActionType(): ActionType;
  execute(action: AgentAction, request: ActionExecutionRequest): Promise<unknown>;
}
