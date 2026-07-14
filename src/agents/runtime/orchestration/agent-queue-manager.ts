// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Agent Queue & Scheduling Engine
// Manages FIFO/Priority scheduling, delays, exponential retries, and stubs.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  QueuedAgentExecution,
  QueuePriority,
  QueueConfiguration,
  QueueStatistics,
} from "../../types/queue";

export class AgentQueueManager {
  private queue: QueuedAgentExecution[] = [];
  private deadLetterQueue: QueuedAgentExecution[] = [];
  private config: QueueConfiguration;
  private logger: any;

  constructor(config: QueueConfiguration = {}, logger: any = console) {
    this.config = {
      concurrencyLimit: 5,
      defaultMaxRetries: 2,
      defaultRetryDelayMs: 1000,
      ...config,
    };
    this.logger = logger;
  }

  /**
   * Task 15.3B: Enqueue Agent Execution Job
   */
  enqueue(
    agentId: string,
    input: string,
    priority: QueuePriority = "medium",
    options?: { scheduledFor?: string; maxRetries?: number; retryDelayMs?: number }
  ): QueuedAgentExecution {
    const item: QueuedAgentExecution = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      agentId,
      input,
      priority,
      status: "queued",
      createdAt: new Date().toISOString(),
      scheduledFor: options?.scheduledFor,
      retriesAttempted: 0,
      maxRetries: options?.maxRetries ?? this.config.defaultMaxRetries ?? 2,
      retryDelayMs: options?.retryDelayMs ?? this.config.defaultRetryDelayMs ?? 1000,
    };

    this.queue.push(item);

    // ── Telemetry: Emit QUEUE_ITEM_CREATED ──
    this.logger.info(`Queue item created: ${item.id}`, {
      event: "QUEUE_ITEM_CREATED",
      jobId: item.id,
      agentId,
      priority,
    });

    return item;
  }

  /**
   * Task 15.3B: Dequeue next runnable job based on priority & FIFO schedule
   */
  dequeueNext(): QueuedAgentExecution | undefined {
    const now = Date.now();

    // Filter runnable jobs (queued and delay condition met)
    const runnable = this.queue.filter(
      (job) =>
        job.status === "queued" &&
        (!job.scheduledFor || new Date(job.scheduledFor).getTime() <= now)
    );

    if (runnable.length === 0) return undefined;

    // Define priority weights (Priority Queue Scheduling)
    const weights: Record<QueuePriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    // Sort: Priority DESC, then CreatedAt ASC (FIFO Scheduling)
    runnable.sort((a, b) => {
      const weightDiff = weights[b.priority] - weights[a.priority];
      if (weightDiff !== 0) return weightDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const selected = runnable[0];
    return selected;
  }

  /**
   * Task 15.3C: Transition state to running
   */
  startExecution(jobId: string): void {
    const job = this.queue.find((j) => j.id === jobId);
    if (job) {
      job.status = "running";
      job.startedAt = new Date().toISOString();

      // ── Telemetry: Emit QUEUE_ITEM_STARTED ──
      this.logger.info(`Queue item started: ${job.id}`, {
        event: "QUEUE_ITEM_STARTED",
        jobId: job.id,
      });
    }
  }

  /**
   * Task 15.3C: Transition state to completed
   */
  completeExecution(jobId: string, vars?: Record<string, unknown>): void {
    const job = this.queue.find((j) => j.id === jobId);
    if (job) {
      job.status = "completed";
      job.completedAt = new Date().toISOString();
      job.variables = vars;

      // ── Telemetry: Emit QUEUE_ITEM_COMPLETED ──
      this.logger.info(`Queue item completed: ${job.id}`, {
        event: "QUEUE_ITEM_COMPLETED",
        jobId: job.id,
      });
    }
  }

  /**
   * Task 15.3D: Retry Policy & Dead Letter Queue routing
   */
  failExecution(jobId: string, error: string): void {
    const job = this.queue.find((j) => j.id === jobId);
    if (!job) return;

    job.error = error;

    if (job.retriesAttempted < job.maxRetries) {
      job.retriesAttempted++;
      // Exponential Backoff calculation
      const delayMs = job.retryDelayMs * Math.pow(2, job.retriesAttempted);
      job.status = "queued";
      job.scheduledFor = new Date(Date.now() + delayMs).toISOString();

      // ── Telemetry: Emit QUEUE_RETRIED ──
      this.logger.warn(`Queue item failed, retrying: ${job.id}. Attempt ${job.retriesAttempted}`, {
        event: "QUEUE_RETRIED",
        jobId: job.id,
        attempt: job.retriesAttempted,
        nextExecution: job.scheduledFor,
      });
    } else {
      job.status = "failed";
      job.completedAt = new Date().toISOString();

      // Route to Dead Letter Queue (Task 15.3D Dead Letter Queue architecture)
      this.deadLetterQueue.push(job);

      // ── Telemetry: Emit QUEUE_ITEM_FAILED ──
      this.logger.error(`Queue item failed permanently: ${job.id}`, {
        event: "QUEUE_ITEM_FAILED",
        jobId: job.id,
        error,
      });
    }
  }

  /**
   * Task 15.3C: Cancel execution job
   */
  cancelExecution(jobId: string): void {
    const job = this.queue.find((j) => j.id === jobId);
    if (job) {
      job.status = "cancelled";
      job.completedAt = new Date().toISOString();

      // ── Telemetry: Emit QUEUE_CANCELLED ──
      this.logger.warn(`Queue item cancelled: ${job.id}`, {
        event: "QUEUE_CANCELLED",
        jobId: job.id,
      });
    }
  }

  /**
   * Task 15.3F: Expose Queue Diagnostics for Execution Inspector
   */
  getStatistics(): QueueStatistics {
    const running = this.queue.filter((j) => j.status === "running");
    const queued = this.queue.filter((j) => j.status === "queued");
    const completed = this.queue.filter((j) => j.status === "completed");
    const failed = this.queue.filter((j) => j.status === "failed");

    let totalWaitTime = 0;
    let completedWaitCount = 0;
    let totalRuntime = 0;
    let completedRunCount = 0;

    completed.forEach((job) => {
      if (job.startedAt) {
        totalWaitTime += new Date(job.startedAt).getTime() - new Date(job.createdAt).getTime();
        completedWaitCount++;
      }
      if (job.completedAt && job.startedAt) {
        totalRuntime += new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime();
        completedRunCount++;
      }
    });

    return {
      queueLength: this.queue.length,
      runningJobsCount: running.length,
      waitingJobsCount: queued.length,
      completedJobsCount: completed.length,
      failedJobsCount: failed.length,
      averageWaitTimeMs: completedWaitCount > 0 ? Math.round(totalWaitTime / completedWaitCount) : 0,
      averageRuntimeMs: completedRunCount > 0 ? Math.round(totalRuntime / completedRunCount) : 0,
    };
  }

  getJobs(): readonly QueuedAgentExecution[] {
    return this.queue;
  }

  getDeadLetterQueue(): readonly QueuedAgentExecution[] {
    return this.deadLetterQueue;
  }
}
