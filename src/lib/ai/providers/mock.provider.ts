// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Mock LLM Provider with Sprint 9.2 Enhancements
// ─────────────────────────────────────────────────────────────────────────────

import type { ILlmProvider, LlmRequest, LlmResponse, LlmCapabilities } from "../provider.interface";
import { LlmExecutionError } from "../provider.interface";

export class MockLlmProvider implements ILlmProvider {
  readonly id = "mock";
  readonly displayName = "Mock LLM Provider";
  readonly capabilities: LlmCapabilities = {
    supportsStreaming: true,
    supportsVision: false,
    supportsImages: false,
    supportsFunctionCalling: true,
  };

  validateConfig(): { valid: boolean; error?: string } {
    return { valid: true };
  }

  async generate(request: LlmRequest, options?: { signal?: AbortSignal }): Promise<LlmResponse> {
    if (options?.signal?.aborted) {
      throw new LlmExecutionError("TIMEOUT", "Request was aborted / timed out", false);
    }

    const mockResponseText = `[Mock AI Response for model: ${request.model}]\n` +
      `System Instruction: ${request.systemPrompt ?? "None"}\n` +
      `Prompt Output: Resolved context and inputs successfully. Prompt evaluated as: "${request.prompt}"`;

    const promptTokens = Math.ceil(request.prompt.length / 4);
    const completionTokens = Math.ceil(mockResponseText.length / 4);

    return {
      text: mockResponseText,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      raw: {
        model: request.model,
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

  async generateStream(request: LlmRequest, options?: { signal?: AbortSignal }): Promise<ReadableStream<string>> {
    const mockText = `[Streaming Mock Response]\nPrompt: ${request.prompt}`;
    return new ReadableStream<string>({
      start(controller) {
        if (options?.signal?.aborted) {
          controller.error(new LlmExecutionError("TIMEOUT", "Stream aborted", false));
          return;
        }
        controller.enqueue(mockText);
        controller.close();
      }
    });
  }
}
