// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Base AI Executor Abstraction
// Generic validation, prompt rendering, and lifecycle for AI model execution.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseNodeExecutor } from "@/engine/executors/base/base-node-executor";
import { failureResult, successResult } from "@/engine/executors/base/executor-result";
import { resolvePathValue } from "@/engine/executors/logic/logic-expression";
import type { ExecutionContext } from "@/engine/context/execution-context";
import type {
  ExecutorAbortSignal,
  ExecutorExecutionInput,
  ExecutorExecutionResult,
  ExecutorValidationInput,
  ExecutorValidationResult,
  NodeExecutorMetadata,
} from "@/engine/types/executor";

export interface AiExecutorConfig {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}

export abstract class BaseAiExecutor extends BaseNodeExecutor {
  protected abstract get nodeTypeId(): string;
  protected abstract get displayName(): string;
  protected abstract get description(): string;

  getMetadata(): NodeExecutorMetadata {
    return {
      nodeTypeId: this.nodeTypeId,
      category: "ai",
      version: "1.0.0",
      displayName: this.displayName,
      description: this.description,
      inputPorts: [{ id: "in", label: "Input" }],
      outputPorts: [
        { id: "out", label: "Response" },
        { id: "err", label: "Error" },
      ],
      supportsCancellation: true,
      supportsRetry: true,
    };
  }

  validate(input: ExecutorValidationInput): ExecutorValidationResult {
    if (input.node.typeId !== this.nodeTypeId) {
      return {
        valid: false,
        errors: [
          {
            code: "EXECUTOR_CONFIG_INVALID",
            message: `Expected node type "${this.nodeTypeId}"`,
            field: "typeId",
          },
        ],
      };
    }

    const { model, prompt, temperature, maxTokens } = input.node.config;
    const errors: { code: string; message: string; field: string }[] = [];

    if (typeof model !== "string" || model.trim().length === 0) {
      errors.push({
        code: "EXECUTOR_CONFIG_INVALID",
        message: "Model identifier is required",
        field: "model",
      });
    }

    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      errors.push({
        code: "EXECUTOR_CONFIG_INVALID",
        message: "Prompt template is required",
        field: "prompt",
      });
    }

    if (temperature !== undefined && temperature !== null) {
      const tempVal = Number(temperature);
      if (isNaN(tempVal) || tempVal < 0 || tempVal > 2) {
        errors.push({
          code: "EXECUTOR_CONFIG_INVALID",
          message: "Temperature must be a number between 0 and 2",
          field: "temperature",
        });
      }
    }

    if (maxTokens !== undefined && maxTokens !== null) {
      const maxTokVal = Number(maxTokens);
      if (isNaN(maxTokVal) || maxTokVal <= 0 || !Number.isInteger(maxTokVal)) {
        errors.push({
          code: "EXECUTOR_CONFIG_INVALID",
          message: "Max tokens must be a positive integer",
          field: "maxTokens",
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  protected renderPrompt(
    template: string,
    context: ExecutionContext,
    inputs: Record<string, unknown>
  ): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const val = resolvePathValue(path, context, inputs);
      return val !== undefined && val !== null ? String(val) : "";
    });
  }

  protected abstract callModel(
    config: AiExecutorConfig,
    renderedPrompt: string,
    renderedSystemPrompt?: string,
    signal?: ExecutorAbortSignal
  ): Promise<{
    text: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    raw: unknown;
  }>;

  protected async run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const model = String(input.node.config.model ?? "");
    const prompt = String(input.node.config.prompt ?? "");
    const systemPrompt = input.node.config.systemPrompt ? String(input.node.config.systemPrompt) : undefined;
    
    const temperature =
      input.node.config.temperature !== undefined && input.node.config.temperature !== null
        ? Number(input.node.config.temperature)
        : undefined;
        
    const maxTokens =
      input.node.config.maxTokens !== undefined && input.node.config.maxTokens !== null
        ? Number(input.node.config.maxTokens)
        : undefined;

    const responseFormat = input.node.config.responseFormat === "json" ? "json" : "text";

    const config: AiExecutorConfig = {
      model,
      prompt,
      systemPrompt,
      temperature,
      maxTokens,
      responseFormat,
    };

    const triggerInput = input.inputs.in ?? input.inputs;
    const resolvedInputs =
      typeof triggerInput === "object" && triggerInput !== null
        ? (triggerInput as Record<string, unknown>)
        : { value: triggerInput };

    const renderedPrompt = this.renderPrompt(prompt, input.context, resolvedInputs);
    const renderedSystemPrompt = systemPrompt
      ? this.renderPrompt(systemPrompt, input.context, resolvedInputs)
      : undefined;

    try {
      const response = await this.callModel(config, renderedPrompt, renderedSystemPrompt, input.signal);
      return successResult(
        {
          out: response.text,
          err: null,
        },
        {
          model: config.model,
          promptTokens: response.usage?.promptTokens ?? 0,
          completionTokens: response.usage?.completionTokens ?? 0,
          totalTokens: response.usage?.totalTokens ?? 0,
          rawResponse: response.raw,
        }
      );
    } catch (error: any) {
      return failureResult({
        code: "AI_MODEL_EXECUTION_FAILED",
        message: error?.message || "Failed to execute AI model request",
        retryable: error?.retryable !== false,
      });
    }
  }
}
