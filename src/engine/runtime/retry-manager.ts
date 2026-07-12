// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Retry Manager
// Calculates backoff delays, checks limits, and schedules execution retries.
// ─────────────────────────────────────────────────────────────────────────────

import type { WorkflowNode } from "@/engine/types/workflow-graph";
import type { NodeExecutorMetadata } from "@/engine/types/executor";
import { ExecutionError } from "@/engine/errors/execution-errors";

export interface RetryOptions {
  maxAttempts: number;
  backoffMs: number;
  multiplier: number;
  maxBackoffMs: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  backoffMs: 1000,
  multiplier: 2,
  maxBackoffMs: 30000,
};

export class RetryManager {
  /**
   * Resolves the retry configuration for a node, merging custom node configs with defaults.
   */
  resolveRetryOptions(node: WorkflowNode): RetryOptions {
    const config = (node.config.retry || {}) as any;

    const maxAttempts =
      typeof config.maxAttempts === "number"
        ? config.maxAttempts
        : typeof config.maxAttempts === "string"
        ? parseInt(config.maxAttempts, 10)
        : DEFAULT_RETRY_OPTIONS.maxAttempts;

    const backoffMs =
      typeof config.backoffMs === "number"
        ? config.backoffMs
        : typeof config.backoffMs === "string"
        ? parseInt(config.backoffMs, 10)
        : DEFAULT_RETRY_OPTIONS.backoffMs;

    const multiplier =
      typeof config.multiplier === "number"
        ? config.multiplier
        : DEFAULT_RETRY_OPTIONS.multiplier;

    const maxBackoffMs =
      typeof config.maxBackoffMs === "number"
        ? config.maxBackoffMs
        : DEFAULT_RETRY_OPTIONS.maxBackoffMs;

    return {
      maxAttempts: isNaN(maxAttempts) ? DEFAULT_RETRY_OPTIONS.maxAttempts : maxAttempts,
      backoffMs: isNaN(backoffMs) ? DEFAULT_RETRY_OPTIONS.backoffMs : backoffMs,
      multiplier,
      maxBackoffMs,
    };
  }

  /**
   * Determines if a node execution should be retried.
   */
  shouldRetry(
    node: WorkflowNode,
    executorMetadata: NodeExecutorMetadata,
    currentAttempt: number,
    error: unknown
  ): boolean {
    // 1. Check if the executor supports retry at all.
    if (!executorMetadata.supportsRetry) {
      return false;
    }

    // 2. Check if the error is retryable.
    const isRetryable = error instanceof ExecutionError ? error.retryable : true;
    if (!isRetryable) {
      return false;
    }

    // 3. Check attempt limit.
    const options = this.resolveRetryOptions(node);
    return currentAttempt < options.maxAttempts;
  }

  /**
   * Calculates the delay in milliseconds for the next retry attempt using exponential backoff.
   */
  calculateDelay(node: WorkflowNode, attempt: number): number {
    const options = this.resolveRetryOptions(node);
    // For attempt 1 (completed), the next is attempt 2. Backoff is calculated as:
    // delay = backoffMs * (multiplier ^ (attempt - 1))
    const delay = options.backoffMs * Math.pow(options.multiplier, attempt - 1);
    return Math.min(delay, options.maxBackoffMs);
  }

  /**
   * Pauses the thread asynchronously with support for cancel signals.
   */
  async delay(ms: number, signal?: { aborted: boolean }): Promise<void> {
    if (signal?.aborted) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, ms);

      const checkInterval = setInterval(() => {
        if (signal?.aborted) {
          clearTimeout(timer);
          clearInterval(checkInterval);
          reject(new Error("Retry delay cancelled"));
        }
      }, 50);
    });
  }
}
