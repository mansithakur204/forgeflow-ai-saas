import type { IngestionJob, IngestionStats } from "../types/ingestion";

export interface QueueProcessor {
  (job: IngestionJob, signal: AbortSignal): Promise<void>;
}

export class ProcessingQueue {
  private queue: IngestionJob[] = [];
  private activeJobs = new Map<string, { job: IngestionJob; abortController: AbortController }>();
  private completedList: IngestionJob[] = [];
  private failedList: IngestionJob[] = [];
  private cancelledList: IngestionJob[] = [];

  private maxConcurrency: number;
  private processor: QueueProcessor;

  // Latency metrics tracking variables
  private totalChunksCreated = 0;
  private totalVectorsIndexed = 0;
  private totalExecutionTimeMs = 0;

  constructor(processor: QueueProcessor, maxConcurrency = 2) {
    this.processor = processor;
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Appends a new document ingestion job and starts processing the queue.
   */
  addJob(documentId: string, maxRetries = 3): IngestionJob {
    const job: IngestionJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      documentId,
      status: "queued",
      retryCount: 0,
      maxRetries,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.queue.push(job);
    this.processNext();
    return job;
  }

  /**
   * Cancels a queued job or aborts execution of an active job.
   */
  cancelJob(jobId: string): void {
    const queueIdx = this.queue.findIndex((j) => j.id === jobId);
    if (queueIdx !== -1) {
      const [job] = this.queue.splice(queueIdx, 1);
      job.status = "cancelled";
      job.updatedAt = new Date().toISOString();
      this.cancelledList.push(job);
      return;
    }

    const active = this.activeJobs.get(jobId);
    if (active) {
      active.abortController.abort();
      active.job.status = "cancelled";
      active.job.updatedAt = new Date().toISOString();
      this.activeJobs.delete(jobId);
      this.cancelledList.push(active.job);
      this.processNext();
    }
  }

  /**
   * Updates metric tracking values.
   */
  recordMetrics(chunksCount: number, vectorsCount: number, durationMs: number): void {
    this.totalChunksCreated += chunksCount;
    this.totalVectorsIndexed += vectorsCount;
    this.totalExecutionTimeMs += durationMs;
  }

  /**
   * Returns current statistics and totals.
   */
  getStatistics(): IngestionStats {
    return {
      queuedJobs: this.queue.length,
      activeJobs: this.activeJobs.size,
      completedJobs: this.completedList.length,
      failedJobs: this.failedList.length,
      cancelledJobs: this.cancelledList.length,
      metrics: {
        totalDocsIngested: this.completedList.length,
        failedDocsIngested: this.failedList.length,
        totalChunksCreated: this.totalChunksCreated,
        totalVectorsIndexed: this.totalVectorsIndexed,
        totalExecutionTimeMs: this.totalExecutionTimeMs,
      },
    };
  }

  private async processNext() {
    if (this.activeJobs.size >= this.maxConcurrency || this.queue.length === 0) return;

    const job = this.queue.shift()!;
    job.status = "processing";
    job.updatedAt = new Date().toISOString();

    const abortController = new AbortController();
    this.activeJobs.set(job.id, { job, abortController });

    const startTime = Date.now();

    try {
      await this.processor(job, abortController.signal);

      job.status = "completed";
      job.updatedAt = new Date().toISOString();
      this.activeJobs.delete(job.id);
      this.completedList.push(job);
    } catch (err: any) {
      this.activeJobs.delete(job.id);

      if (abortController.signal.aborted) {
        job.status = "cancelled";
        job.updatedAt = new Date().toISOString();
        this.cancelledList.push(job);
      } else if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = "queued";
        job.errorMessage = err.message;
        job.updatedAt = new Date().toISOString();
        this.queue.push(job);
      } else {
        job.status = "failed";
        job.errorMessage = err.message;
        job.updatedAt = new Date().toISOString();
        this.failedList.push(job);
      }
    }

    this.processNext();
  }
}
