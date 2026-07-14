// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — OpenAI LLM Provider with Sprint 9.2 Enhancements
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from "openai";
import type { ILlmProvider, LlmRequest, LlmResponse, LlmCapabilities } from "../provider.interface";
import { LlmExecutionError } from "../provider.interface";
import { aiConfig, validateProviderConfig } from "../config";

export class OpenAiLlmProvider implements ILlmProvider {
  readonly id = "openai";
  readonly displayName = "OpenAI";
  readonly capabilities: LlmCapabilities = {
    supportsStreaming: true,
    supportsVision: true,
    supportsImages: true,
    supportsFunctionCalling: true,
  };

  validateConfig(): { valid: boolean; error?: string } {
    return validateProviderConfig(this.id);
  }

  async generate(request: LlmRequest, options?: { signal?: AbortSignal }): Promise<LlmResponse> {
    const configCheck = this.validateConfig();
    if (!configCheck.valid) {
      throw new LlmExecutionError("INVALID_API_KEY", configCheck.error || "OpenAI API key is missing", false);
    }

    const apiKey = aiConfig.openaiApiKey;
    const openai = new OpenAI({ apiKey: apiKey! });

    let modelName = request.model;
    if (!modelName || !modelName.toLowerCase().includes("gpt")) {
      modelName = aiConfig.defaultModel.openai;
    }

    try {
      const messages: any[] = [];
      if (request.systemPrompt) {
        messages.push({ role: "system", content: request.systemPrompt });
      }
      messages.push({ role: "user", content: request.prompt });

      const response = await openai.chat.completions.create({
        model: modelName,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        response_format: request.responseFormat === "json" ? { type: "json_object" } : undefined,
      }, {
        signal: options?.signal,
      });

      const choice = response.choices[0];
      const text = choice?.message?.content || "";

      const promptTokens = response.usage?.prompt_tokens ?? Math.ceil(request.prompt.length / 4);
      const completionTokens = response.usage?.completion_tokens ?? Math.ceil(text.length / 4);

      return {
        text,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        raw: response,
      };
    } catch (err: any) {
      throw this.mapError(err);
    }
  }

  async generateStream(request: LlmRequest, options?: { signal?: AbortSignal }): Promise<ReadableStream<string>> {
    const configCheck = this.validateConfig();
    if (!configCheck.valid) {
      throw new LlmExecutionError("INVALID_API_KEY", configCheck.error || "OpenAI API key is missing", false);
    }
    
    // Stub implementation supporting streaming design
    return new ReadableStream<string>({
      start(controller) {
        if (options?.signal?.aborted) {
          controller.error(new LlmExecutionError("TIMEOUT", "Stream aborted", false));
          return;
        }
        controller.enqueue(`[Streaming OpenAI Stub]\nModel: ${request.model}`);
        controller.close();
      }
    });
  }

  private mapError(err: any): LlmExecutionError {
    if (err instanceof LlmExecutionError) return err;

    const msg = err?.message || String(err);
    const status = err?.status || err?.statusCode;

    if (msg.includes("API key") || msg.includes("Incorrect API key") || status === 401) {
      return new LlmExecutionError("INVALID_API_KEY", "Invalid OpenAI API key provided.", false, err);
    }
    if (msg.includes("429") || msg.includes("Rate limit") || msg.includes("quota") || status === 429) {
      return new LlmExecutionError("RATE_LIMIT", "OpenAI API rate limit exceeded.", true, err);
    }
    if (msg.includes("timeout") || msg.includes("aborted") || err?.name === "AbortError" || status === 408) {
      return new LlmExecutionError("TIMEOUT", "OpenAI request timed out or was aborted.", true, err);
    }
    if (msg.includes("network") || msg.includes("fetch failed") || msg.includes("ENOTFOUND")) {
      return new LlmExecutionError("NETWORK_ERROR", "OpenAI network connectivity error.", true, err);
    }
    return new LlmExecutionError("PROVIDER_ERROR", `OpenAI Error: ${msg}`, status === 500 || status === 502 || status === 503 || status === 504, err);
  }
}
