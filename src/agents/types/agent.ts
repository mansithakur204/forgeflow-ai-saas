export type AgentStatus = "idle" | "running" | "paused" | "completed" | "failed";

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

export interface AgentConfig {
  id: string;
  metadata: AgentMetadata;
  capabilities: AgentCapabilities;
  options?: Record<string, unknown>;
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
    | "failed";
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
