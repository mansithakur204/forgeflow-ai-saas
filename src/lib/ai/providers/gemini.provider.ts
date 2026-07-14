// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Google Gemini LLM Provider with Sprint 9.2 Enhancements
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ILlmProvider, LlmRequest, LlmResponse, LlmCapabilities } from "../provider.interface";
import { LlmExecutionError } from "../provider.interface";
import { aiConfig, validateProviderConfig } from "../config";

export class GeminiLlmProvider implements ILlmProvider {
  readonly id = "gemini";
  readonly displayName = "Google Gemini";
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
      throw new LlmExecutionError("INVALID_API_KEY", configCheck.error || "Gemini API key is missing", false);
    }

    const apiKey = aiConfig.googleApiKey;
    const genAI = new GoogleGenerativeAI(apiKey!);
    
    let modelName = request.model;
    if (!modelName || !modelName.toLowerCase().includes("gemini")) {
      modelName = aiConfig.defaultModel.gemini;
    }

    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: request.systemPrompt,
      });

      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens,
          responseMimeType: request.responseFormat === "json" ? "application/json" : "text/plain",
        },
      }, {
        signal: options?.signal,
      });

      const result = response.response;
      const text = result.text();

      const promptTokens = result.usageMetadata?.promptTokenCount ?? Math.ceil(request.prompt.length / 4);
      const completionTokens = result.usageMetadata?.candidatesTokenCount ?? Math.ceil(text.length / 4);

      return {
        text,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        raw: result,
      };
    } catch (err: any) {
      throw this.mapError(err);
    }
  }

  async generateStream(request: LlmRequest, options?: { signal?: AbortSignal }): Promise<ReadableStream<string>> {
    const configCheck = this.validateConfig();
    if (!configCheck.valid) {
      throw new LlmExecutionError("INVALID_API_KEY", configCheck.error || "Gemini API key is missing", false);
    }
    
    // Stub implementation supporting streaming design
    return new ReadableStream<string>({
      start(controller) {
        if (options?.signal?.aborted) {
          controller.error(new LlmExecutionError("TIMEOUT", "Stream aborted", false));
          return;
        }
        controller.enqueue(`[Streaming Gemini Stub]\nModel: ${request.model}`);
        controller.close();
      }
    });
  }

  private mapError(err: any): LlmExecutionError {
    if (err instanceof LlmExecutionError) return err;

    const msg = err?.message || String(err);
    const status = err?.status;

    if (msg.includes("API key") || msg.includes("key not valid") || msg.includes("API_KEY_INVALID")) {
      return new LlmExecutionError("INVALID_API_KEY", "Invalid Google API key provided.", false, err);
    }
    if (msg.includes("429") || msg.includes("quota") || msg.includes("Quota exceeded") || msg.includes("RESOURCE_EXHAUSTED") || status === 429) {
      return new LlmExecutionError("RATE_LIMIT", "Gemini API rate limit exceeded.", true, err);
    }
    if (msg.includes("timeout") || msg.includes("deadline") || msg.includes("aborted") || err?.name === "AbortError") {
      return new LlmExecutionError("TIMEOUT", "Gemini request timed out or was aborted.", true, err);
    }
    if (msg.includes("network") || msg.includes("fetch failed") || msg.includes("ENOTFOUND")) {
      return new LlmExecutionError("NETWORK_ERROR", "Gemini network connectivity error.", true, err);
    }
    return new LlmExecutionError("PROVIDER_ERROR", `Google Gemini Error: ${msg}`, false, err);
  }
}
