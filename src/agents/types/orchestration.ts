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
