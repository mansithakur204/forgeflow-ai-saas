// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — AI Executor
// Concrete execution engine for processing prompts using an LLM.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAiExecutor, type AiExecutorConfig } from "@/engine/executors/ai/base-ai-executor";
import type { ExecutorAbortSignal } from "@/engine/types/executor";
import { llmManager } from "@/lib/ai/manager";

export class AiExecutor extends BaseAiExecutor {
  // Must match the NODE_TYPE_CATALOG typeId exactly
  protected readonly nodeTypeId = "ai_llm";
  protected readonly displayName = "LLM Prompt";
  protected readonly description = "Generate text response using an LLM model";

  protected async callModel(
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
    metrics?: any;
    events?: any;
  }> {
    if (signal?.aborted) {
      throw new Error("AI model call cancelled");
    }

    const payload = {
      model: config.model,
      prompt: renderedPrompt,
      systemPrompt: renderedSystemPrompt,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      responseFormat: config.responseFormat,
    };

    // Server-side direct execution using llmManager (which wraps providers with retries, timeouts, and fallbacks)
    if (typeof window === "undefined") {
      try {
        const result = await llmManager.execute(payload, { provider: config.model });
        return {
          text: result.text,
          usage: result.usage,
          raw: result.raw,
          metrics: result.metrics,
          events: result.events,
        };
      } catch (err: any) {
        throw new Error(err.message || "Server-side LLM execution failed");
      }
    }

    // Client-side execution via API route (protect API keys)
    try {
      const controller = new AbortController();
      if (signal) {
        // If aborted, cancel the fetch request
        signal.aborted && controller.abort();
      }

      const res = await fetch("/api/llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "LLM API request failed");
      }

      return {
        text: data.text,
        usage: data.usage,
        raw: data.raw,
        metrics: data.metrics,
        events: data.events,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("AI model call cancelled");
      }
      throw new Error(err.message || "Failed to fetch response from AI provider endpoint");
    }
  }
}
