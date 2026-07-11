// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Base Node Executor
// Composable cancellation and execution lifecycle for all node executors.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createExecutionControl,
  createExecutionId,
  type ExecutionControl,
} from "@/engine/executors/base/executor-abort";
import { cancelledResult } from "@/engine/executors/base/executor-result";
import type {
  ExecutorExecutionInput,
  ExecutorExecutionResult,
  ExecutorValidationInput,
  ExecutorValidationResult,
  INodeExecutor,
  NodeExecutorMetadata,
} from "@/engine/types/executor";

export abstract class BaseNodeExecutor implements INodeExecutor {
  private readonly activeExecutions = new Map<string, ExecutionControl>();

  abstract getMetadata(): NodeExecutorMetadata;

  abstract validate(input: ExecutorValidationInput): ExecutorValidationResult;

  protected abstract run(
    input: ExecutorExecutionInput
  ): Promise<ExecutorExecutionResult>;

  async execute(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const executionId = createExecutionId(
      input.context.runId,
      input.node.id,
      input.attempt
    );
    const control = createExecutionControl();
    this.activeExecutions.set(executionId, control);

    try {
      if (input.signal.aborted || control.aborted) {
        return cancelledResult({ executionId });
      }

      const result = await this.run({
        ...input,
        signal: control,
      });

      if (control.aborted || input.signal.aborted) {
        return cancelledResult({ executionId });
      }

      return result;
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  async cancel(executionId: string): Promise<void> {
    const control = this.activeExecutions.get(executionId);
    if (control) {
      control.abort();
    }
  }
}
