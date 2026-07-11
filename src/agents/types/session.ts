import type { AgentStatus, AgentDiagnostics } from "./agent";

export interface AgentMessage {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AgentContext {
  variables: Record<string, unknown>;
  tempMemory: Record<string, unknown>;
  systemPromptOverride?: string;
}

export interface AgentSession {
  id: string;
  agentId: string;
  status: AgentStatus;
  context: AgentContext;
  messages: AgentMessage[];
  diagnostics: AgentDiagnostics;
  createdAt: string;
  updatedAt: string;
}
