export type AgentStatus =
  | "created"
  | "idle"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled";

export type AgentRole =
  | "planner"
  | "researcher"
  | "executor"
  | "coder"
  | "memory"
  | "tool"
  | "reviewer"
  | "orchestrator";

export type AgentCapability =
  | "plan"
  | "execute"
  | "search_code"
  | "edit_code"
  | "access_memory"
  | "use_tools"
  | "review"
  | "handoff";

export interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
}

export interface AgentCapabilities {
  canPlan: boolean;
  canExecute: boolean;
  canSearchCode: boolean;
  canEditCode: boolean;
  canAccessMemory: boolean;
  canUseTools: boolean;
}

export interface AgentState {
  status: AgentStatus;
  lastHeartbeat: string;
  errorCount: number;
  completedTasksCount: number;
  currentSessionId?: string;
  health: "healthy" | "unhealthy" | "degraded";
}

export interface AgentConfig {
  id: string;
  metadata: AgentMetadata;
  capabilities: AgentCapabilities;
  role?: AgentRole;
  options?: Record<string, unknown>;
}

export interface Agent {
  id: string;
  config: AgentConfig;
  state: AgentState;
}

export interface AgentExecutionContext {
  runId: string;
  correlationId: string;
  workflowId?: string;
  variables: Record<string, unknown>;
  tempMemory: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentEvent {
  agentId: string;
  sessionId: string;
  type:
    | "started"
    | "state_changed"
    | "step_executed"
    | "paused"
    | "resumed"
    | "completed"
    | "failed"
    | "heartbeat";
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface AgentDiagnostics {
  startTime: string;
  endTime?: string;
  totalStepsExecuted: number;
  tokensConsumed: number;
  totalLatencyMs: number;
  errorsCount: number;
}
