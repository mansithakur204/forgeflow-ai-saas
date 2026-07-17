// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Pipelines Dashboard Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PipelineFilters {
  search: string;
  status: string;
  agentId: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}

export interface PipelineItem {
  id: string; // Execution ID
  workflowId: string;
  workflowName: string;
  status: "queued" | "running" | "waiting" | "paused" | "completed" | "failed" | "cancelled";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  queuePosition: number;
  retryCount: number;
  maxRetries: number;
  activeAgent: string;
  currentNode: string;
  progress: number;
  input: string;
  error?: string;
}

export interface PipelineMetrics {
  running: number;
  queued: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface PipelinePagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PipelineResponse {
  success: boolean;
  pipelines: PipelineItem[];
  metrics: PipelineMetrics;
  pagination: PipelinePagination;
  error?: string;
}
