export interface IngestionJob {
  id: string;
  documentId: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  retryCount: number;
  maxRetries: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionMetrics {
  totalDocsIngested: number;
  failedDocsIngested: number;
  totalChunksCreated: number;
  totalVectorsIndexed: number;
  totalExecutionTimeMs: number;
}

export interface IngestionStats {
  queuedJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  metrics: IngestionMetrics;
}
