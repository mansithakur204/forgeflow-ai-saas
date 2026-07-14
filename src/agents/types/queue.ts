// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Agent Queue Typings
// Defines QueuePriority, QueuedAgentExecution, QueueConfiguration, and QueueStatistics.
// ─────────────────────────────────────────────────────────────────────────────

export type QueuePriority = "low" | "medium" | "high" | "critical";

export interface QueuedAgentExecution {
  id: string;
  agentId: string;
  input: string;
  priority: QueuePriority;
  status: "queued" | "running" | "waiting" | "paused" | "completed" | "failed" | "cancelled";
  createdAt: string;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  retriesAttempted: number;
  maxRetries: number;
  retryDelayMs: number;
  error?: string;
  variables?: Record<string, unknown>;
}

export interface QueueConfiguration {
  concurrencyLimit?: number;
  defaultMaxRetries?: number;
  defaultRetryDelayMs?: number;
}

export interface QueueStatistics {
  queueLength: number;
  runningJobsCount: number;
  waitingJobsCount: number;
  completedJobsCount: number;
  failedJobsCount: number;
  averageWaitTimeMs: number;
  averageRuntimeMs: number;
}
