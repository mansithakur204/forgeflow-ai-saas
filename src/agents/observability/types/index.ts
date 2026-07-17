// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Agent Observability Domain Typings
// ─────────────────────────────────────────────────────────────────────────────

export type ModelProvider = "openai" | "gemini" | "anthropic" | "azure_openai" | "groq" | "local";

export interface AgentExecutionMetrics {
  executionId: string;
  workflowId: string;
  agentId: string;
  agentName: string;
  executionStart: string; // ISO Timestamp
  executionEnd?: string; // ISO Timestamp
  totalDuration?: number; // ms
  queueWaitTime: number; // ms
  retryCount: number;
  memoryUsage?: number; // bytes
  cpuTime?: number; // ms
  status: "idle" | "running" | "completed" | "failed" | "paused";
  errorCount: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  totalTokens: number;
}

export interface DetailedTokenUsage {
  usage: TokenUsage;
  agentId: string;
  workflowId: string;
  provider: ModelProvider;
  timestamp: string; // ISO Timestamp
}

export interface CostRecord {
  requestId: string;
  workflowId: string;
  agentId: string;
  provider: ModelProvider;
  cost: number;
  timestamp: string; // ISO Timestamp
}

export interface LatencyMetrics {
  providerLatency: number; // ms
  embeddingLatency: number; // ms
  vectorSearchLatency: number; // ms
  memoryRetrievalLatency: number; // ms
  ragLatency: number; // ms
  toolLatency: number; // ms
  overallWorkflowLatency: number; // ms
}

export interface AggregatedAnalytics {
  averageLatency: number;
  successRate: number;
  failureRate: number;
  retryRate: number;
  averageCost: number;
  averageTokens: number;
  averageQueueTime: number;
  averageExecutionTime: number;
}
