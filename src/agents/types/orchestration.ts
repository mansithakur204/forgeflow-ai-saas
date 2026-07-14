import type { AgentSession } from "./session";

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  assignedAgentId?: string;
  status: "pending" | "running" | "completed" | "failed";
  dependencies: string[]; // Task IDs that must finish first
  result?: string;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollaborationSession {
  id: string;
  tasks: AgentTask[];
  sessions: Map<string, AgentSession>; // maps agentId -> AgentSession
  sharedMemoryId: string;
  status: "active" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface MessageBusEvent {
  id: string;
  topic: string;
  senderId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

// ── Multi-Agent Orchestrator Domain Typings (Task 15.1A) ──────────────────────

export type OrchestratorState =
  | "idle"
  | "planning"
  | "researching"
  | "executing_tools"
  | "updating_memory"
  | "reviewing"
  | "completed"
  | "failed"
  | "cancelled";

export interface OrchestratorConfiguration {
  maxExecutionTimeMs?: number;
  maxRetries?: number;
  requireManualApproval?: boolean;
  parallelExecutionEnabled?: boolean;
}

export interface OrchestratorContext {
  orchestrationId: string;
  correlationId: string;
  currentState: OrchestratorState;
  currentAgentId?: string;
  progress: number;
  executionTimeMs: number;
  currentStepIndex: number;
  totalSteps: number;
  sharedVariables: Record<string, unknown>;
  sharedMetadata: Record<string, unknown>;
}

export interface OrchestratorResult {
  orchestrationId: string;
  success: boolean;
  finalState: OrchestratorState;
  output: string;
  error?: string;
  durationMs: number;
  stepsExecuted: number;
  variables: Record<string, unknown>;
}
