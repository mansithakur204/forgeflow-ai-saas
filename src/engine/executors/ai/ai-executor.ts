// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — AI Executor
// Concrete execution engine for processing prompts using an LLM.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAiExecutor, type AiExecutorConfig } from "@/engine/executors/ai/base-ai-executor";
import type { ExecutorAbortSignal } from "@/engine/types/executor";

export class AiExecutor extends BaseAiExecutor {
  protected readonly nodeTypeId = "ai_prompt";
  protected readonly displayName = "AI Prompt";
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
  }> {
    if (signal?.aborted) {
      throw new Error("AI model call cancelled");
    }

    // Standardized mock response from the LLM engine for testing and visual previews
    const mockResponseText = `[Mock AI Response for model: ${config.model}]\n` +
      `System Instruction: ${renderedSystemPrompt ?? "None"}\n` +
      `Prompt Output: Resolved context and inputs successfully. Prompt evaluated as: "${renderedPrompt}"`;

    const promptTokens = Math.ceil(renderedPrompt.length / 4);
    const completionTokens = Math.ceil(mockResponseText.length / 4);

    return {
      text: mockResponseText,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      raw: {
        model: config.model,
        object: "text_completion",
        choices: [
          {
            text: mockResponseText,
            index: 0,
            finish_reason: "stop",
          },
        ],
      },
    };
  }
}
