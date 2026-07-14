// -----------------------------------------------------------------------------
// ForgeFlow AI � Stub Executors
// Stub implementations for node types that do not have a real executor yet.
// They pass inputs through and return a simulated success result, allowing
// workflows that contain these nodes to execute end-to-end without crashing.
// -----------------------------------------------------------------------------

import { BaseNodeExecutor } from "@/engine/executors/base/base-node-executor";
import { successResult } from "@/engine/executors/base/executor-result";
import type {
  ExecutorExecutionInput,
  ExecutorExecutionResult,
  ExecutorValidationInput,
  ExecutorValidationResult,
  NodeExecutorMetadata,
} from "@/engine/types/executor";

// -- Generic stub base --------------------------------------------------------

abstract class StubNodeExecutor extends BaseNodeExecutor {
  protected abstract readonly nodeTypeIdValue: string;
  protected abstract readonly displayNameValue: string;
  protected abstract readonly categoryValue: "trigger" | "logic" | "ai" | "http" | "integration";
  protected readonly inputPortIds: string[] = ["in"];
  protected readonly outputPortIds: string[] = ["out"];

  getMetadata(): NodeExecutorMetadata {
    return {
      nodeTypeId: this.nodeTypeIdValue,
      category: this.categoryValue,
      version: "1.0.0",
      displayName: this.displayNameValue,
      description: `[Stub] ${this.displayNameValue}`,
      inputPorts: this.inputPortIds.map((id) => ({ id, label: id })),
      outputPorts: this.outputPortIds.map((id) => ({ id, label: id })),
      supportsCancellation: true,
      supportsRetry: false,
    };
  }

  validate(_input: ExecutorValidationInput): ExecutorValidationResult {
    return { valid: true, errors: [] };
  }

  protected async run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const outputs: Record<string, unknown> = {};
    for (const portId of this.outputPortIds) {
      outputs[portId] = input.inputs.in ?? input.inputs.out ?? {};
    }
    return successResult(outputs, { stub: true, nodeTypeId: this.nodeTypeIdValue });
  }
}

// -- Concrete stubs ------------------------------------------------------------

export class WebhookTriggerExecutor extends StubNodeExecutor {
  protected readonly nodeTypeIdValue = "trigger_webhook";
  protected readonly displayNameValue = "Webhook";
  protected readonly categoryValue = "trigger" as const;
  protected readonly inputPortIds: string[] = [];
  protected readonly outputPortIds = ["out"];

  protected async run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const payload =
      input.context.trigger.payload && typeof input.context.trigger.payload === "object"
        ? (input.context.trigger.payload as Record<string, unknown>)
        : { value: input.context.trigger.payload };

    input.context.services.logger.info(
      `Webhook trigger received`,
      { event: "WEBHOOK_RECEIVED", payload },
      input.node.id
    );

    return successResult({ out: payload }, { stub: true, triggerType: "webhook" });
  }
}

export class ScheduleTriggerExecutor extends StubNodeExecutor {
  protected readonly nodeTypeIdValue = "trigger_schedule";
  protected readonly displayNameValue = "Schedule";
  protected readonly categoryValue = "trigger" as const;
  protected readonly inputPortIds: string[] = [];
  protected readonly outputPortIds = ["out"];

  protected async run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const cron = input.node.config.cron ?? "*";
    const scheduledAt = new Date().toISOString();

    input.context.services.logger.info(
      `Schedule trigger fired (cron: ${cron})`,
      { event: "CUSTOM_EVENT", cron, scheduledAt },
      input.node.id
    );

    return successResult(
      { out: { scheduledAt, cron } },
      { stub: true, triggerType: "schedule" }
    );
  }
}

export class AiClassifierExecutor extends StubNodeExecutor {
  protected readonly nodeTypeIdValue = "ai_classifier";
  protected readonly displayNameValue = "Classifier";
  protected readonly categoryValue = "ai" as const;
  protected readonly outputPortIds = ["out", "score"];

  protected async run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const categories = (input.node.config.categories as string[]) ?? ["positive", "negative"];
    const selected = categories[0] ?? "positive";

    input.context.services.logger.info(
      `Classifier classified input: "${selected}"`,
      { event: "CUSTOM_EVENT", categories, selected, score: 0.95 },
      input.node.id
    );

    return successResult(
      { out: selected, score: 0.95 },
      { stub: true, model: input.node.config.model }
    );
  }
}

// DatabaseExecutor removed and moved to production implementation file

// EmailExecutor removed and moved to production implementation file

// SlackExecutor removed and moved to production implementation file

