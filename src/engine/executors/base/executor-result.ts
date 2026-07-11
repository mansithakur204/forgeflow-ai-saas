// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Executor Result Builders
// Shared helpers for constructing structured executor results.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ExecutorErrorDetail,
  ExecutorExecutionResult,
} from "@/engine/types/executor";

export function successResult(
  outputs: Record<string, unknown>,
  metadata: Record<string, unknown> = {}
): ExecutorExecutionResult {
  return {
    success: true,
    outputs,
    metadata,
    error: null,
  };
}

export function failureResult(
  error: ExecutorErrorDetail,
  metadata: Record<string, unknown> = {}
): ExecutorExecutionResult {
  return {
    success: false,
    outputs: {},
    metadata,
    error,
  };
}

export function cancelledResult(
  metadata: Record<string, unknown> = {}
): ExecutorExecutionResult {
  return failureResult(
    {
      code: "EXECUTOR_CANCELLED",
      message: "Executor execution was cancelled",
      retryable: false,
    },
    metadata
  );
}
