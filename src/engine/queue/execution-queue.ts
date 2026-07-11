// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Execution Queue
// In-memory FIFO queue with concurrency slot tracking for future parallelism.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ExecutionQueueJob,
  ExecutionQueueOptions,
  ExecutionQueueStats,
} from "@/engine/types/runtime";

let jobCounter = 0;

function nextJobId(): string {
  jobCounter += 1;
  return `job-${jobCounter}`;
}

export class ExecutionQueue {
  private readonly jobs: ExecutionQueueJob[] = [];
  private readonly maxConcurrency: number;
  private activeCount = 0;

  constructor(options?: ExecutionQueueOptions) {
    this.maxConcurrency = Math.max(1, options?.maxConcurrency ?? 1);
  }

  enqueue(
    job: Omit<ExecutionQueueJob, "id" | "enqueuedAt"> & {
      id?: string;
      enqueuedAt?: string;
    }
  ): ExecutionQueueJob {
    const queuedJob: ExecutionQueueJob = {
      id: job.id ?? nextJobId(),
      type: job.type,
      runId: job.runId,
      nodeId: job.nodeId,
      enqueuedAt: job.enqueuedAt ?? new Date().toISOString(),
    };
    this.jobs.push(queuedJob);
    return queuedJob;
  }

  dequeue(): ExecutionQueueJob | undefined {
    return this.jobs.shift();
  }

  peek(): ExecutionQueueJob | undefined {
    return this.jobs[0];
  }

  size(): number {
    return this.jobs.length;
  }

  isEmpty(): boolean {
    return this.jobs.length === 0;
  }

  clear(): ExecutionQueueJob[] {
    const removed = [...this.jobs];
    this.jobs.length = 0;
    return removed;
  }

  hasCapacity(): boolean {
    return this.activeCount < this.maxConcurrency;
  }

  acquireSlot(): boolean {
    if (!this.hasCapacity()) {
      return false;
    }
    this.activeCount += 1;
    return true;
  }

  releaseSlot(): void {
    if (this.activeCount > 0) {
      this.activeCount -= 1;
    }
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getMaxConcurrency(): number {
    return this.maxConcurrency;
  }

  getStats(): ExecutionQueueStats {
    return {
      size: this.jobs.length,
      activeCount: this.activeCount,
      maxConcurrency: this.maxConcurrency,
      hasCapacity: this.hasCapacity(),
    };
  }

  getJobs(): readonly ExecutionQueueJob[] {
    return [...this.jobs];
  }
}
