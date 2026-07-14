// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Manual Trigger Executor
// Emits trigger payload and execution metadata from ExecutionContext.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseNodeExecutor } from "@/engine/executors/base/base-node-executor";
import { failureResult, successResult } from "@/engine/executors/base/executor-result";
import type {
  ExecutorExecutionInput,
  ExecutorExecutionResult,
  ExecutorValidationInput,
  ExecutorValidationResult,
  NodeExecutorMetadata,
} from "@/engine/types/executor";

const NODE_TYPE_ID = "trigger_manual";

export class ManualTriggerExecutor extends BaseNodeExecutor {
  getMetadata(): NodeExecutorMetadata {
    return {
      nodeTypeId: NODE_TYPE_ID,
      category: "trigger",
      version: "1.0.0",
      displayName: "Manual Trigger",
      description: "Starts workflow execution from a manual or API-initiated trigger",
      inputPorts: [],
      outputPorts: [{ id: "out", label: "Trigger" }],
      supportsCancellation: true,
      supportsRetry: false,
    };
  }

  validate(input: ExecutorValidationInput): ExecutorValidationResult {
    if (input.node.typeId !== NODE_TYPE_ID) {
      return {
        valid: false,
        errors: [
          {
            code: "EXECUTOR_CONFIG_INVALID",
            message: `Expected node type "${NODE_TYPE_ID}"`,
            field: "typeId",
          },
        ],
      };
    }
    return { valid: true, errors: [] };
  }

  protected async run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const { context } = input;

    if (context.trigger.type !== "manual" && context.trigger.type !== "api") {
      return failureResult({
        code: "EXECUTOR_CONFIG_INVALID",
        message: `Manual trigger executor received trigger type "${context.trigger.type}"`,
        retryable: false,
      });
    }

    const payload =
      context.trigger.payload && typeof context.trigger.payload === "object"
        ? (context.trigger.payload as Record<string, unknown>)
        : { value: context.trigger.payload };

    input.context.services.logger.info(
      `Manual trigger received by executor`,
      { event: "CUSTOM_EVENT", triggerType: context.trigger.type, payload },
      input.node.id
    );

    return successResult(
      { out: payload },
      {
        triggerType: context.trigger.type,
        receivedAt: context.trigger.receivedAt,
        initiatedBy: context.initiatedBy,
        correlationId: context.metadata.correlationId,
        environment: context.environment,
      }
    );
  }
}
