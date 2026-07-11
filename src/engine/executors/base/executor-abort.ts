// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Executor Abort Control
// Lightweight cancellation tracking for in-flight executor runs.
// ─────────────────────────────────────────────────────────────────────────────

import type { ExecutorAbortSignal } from "@/engine/types/executor";

export interface ExecutionControl extends ExecutorAbortSignal {
  abort(): void;
}

export function createExecutionControl(): ExecutionControl {
  let aborted = false;
  return {
    get aborted() {
      return aborted;
    },
    abort() {
      aborted = true;
    },
  };
}

export function createExecutionId(runId: string, nodeId: string, attempt: number): string {
  return `${runId}:${nodeId}:${attempt}`;
}
