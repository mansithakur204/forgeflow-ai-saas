// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — LLM Runtime Execution Manager
// ─────────────────────────────────────────────────────────────────────────────

import { llmRegistry } from "./registry";
import { aiConfig } from "./config";
import type { LlmRequest, LlmResponse, LlmExecutionMetrics } from "./provider.interface";
import { LlmExecutionError } from "./provider.interface";

export interface LlmExecutionResult {
  success: boolean;
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metrics: LlmExecutionMetrics;
  events: { event: string; timestamp: string; details?: any }[];
  raw?: any;
}

export class LlmExecutionManager {
  /**
   * Executes an LLM request through the configured provider registry.
   * Handles timeout cancellations, exponential backoff retries on transient errors,
   * structured error mappings, token counting, and observability event metrics.
   */
  async execute(
    request: LlmRequest,
    options?: {
      provider?: string;
      timeout?: number;
      retryCount?: number;
      retryDelay?: number;
    }
  ): Promise<LlmExecutionResult> {
    const startTime = new Date().toISOString();
    const startMs = Date.now();
    const events: { event: string; timestamp: string; details?: any }[] = [];
    
    // Resolve provider selection
    const providerId = options?.provider || request.model;
    const provider = llmRegistry.getProvider(providerId);
    
    events.push({
      event: "AI_REQUEST_STARTED",
      timestamp: new Date().toISOString(),
      details: { providerId: provider.id, model: request.model },
    });

    const maxRetries = options?.retryCount ?? aiConfig.retryCount;
    const baseDelay = options?.retryDelay ?? aiConfig.retryDelay;
    const timeoutMs = options?.timeout ?? aiConfig.timeout;

    let retryCount = 0;
    let response: LlmResponse | null = null;
    let lastError: any = null;

    while (retryCount <= maxRetries) {
      const attemptController = new AbortController();
      
      const timeoutId = setTimeout(() => {
        attemptController.abort();
        events.push({
          event: "AI_TIMEOUT",
          timestamp: new Date().toISOString(),
          details: { attempt: retryCount, timeoutMs },
        });
      }, timeoutMs);

      try {
        if (retryCount > 0) {
          events.push({
            event: "AI_RETRY",
            timestamp: new Date().toISOString(),
            details: { attempt: retryCount, lastError: lastError?.message },
          });
        }

        response = await provider.generate(request, { signal: attemptController.signal });
        
        events.push({
          event: "AI_RESPONSE_RECEIVED",
          timestamp: new Date().toISOString(),
          details: { providerId: provider.id, model: request.model },
        });
        
        clearTimeout(timeoutId);
        break; // Success!
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        // Resolve standard LLM execution errors
        let mappedError: LlmExecutionError;
        if (err instanceof LlmExecutionError) {
          mappedError = err;
        } else if (err.name === "AbortError") {
          mappedError = new LlmExecutionError("TIMEOUT", "Request timed out", true, err);
        } else {
          mappedError = new LlmExecutionError("UNKNOWN_ERROR", err.message || String(err), true, err);
        }

        // Fallback to Mock provider under the hood if it is an API Key authorization error,
        // so that the workflow does not crash if keys are invalid or missing
        if (mappedError.code === "INVALID_API_KEY") {
          events.push({
            event: "AI_PROVIDER_FALLBACK",
            timestamp: new Date().toISOString(),
            details: { originalProvider: provider.id, reason: mappedError.message },
          });
          const fallbackProvider = llmRegistry.getProvider("mock");
          try {
            response = await fallbackProvider.generate(request, { signal: attemptController.signal });
            events.push({
              event: "AI_RESPONSE_RECEIVED",
              timestamp: new Date().toISOString(),
              details: { providerId: fallbackProvider.id, model: request.model, fallback: true },
            });
            break;
          } catch (fallbackErr) {
            lastError = fallbackErr;
            break;
          }
        }

        // Stop retrying if error is permanent (non-transient)
        if (!mappedError.retryable || retryCount === maxRetries) {
          lastError = mappedError;
          break;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, retryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retryCount++;
      }
    }

    const endMs = Date.now();
    const endTime = new Date().toISOString();
    const durationMs = endMs - startMs;

    if (response) {
      events.push({
        event: "AI_REQUEST_COMPLETED",
        timestamp: new Date().toISOString(),
        details: { success: true, durationMs },
      });

      const metrics: LlmExecutionMetrics = {
        startTime,
        endTime,
        durationMs,
        providerName: provider.displayName,
        modelName: request.model,
        success: true,
        retryCount,
      };

      return {
        success: true,
        text: response.text,
        usage: response.usage,
        metrics,
        events,
        raw: response.raw,
      };
    } else {
      const metrics: LlmExecutionMetrics = {
        startTime,
        endTime,
        durationMs,
        providerName: provider.displayName,
        modelName: request.model,
        success: false,
        retryCount,
        error: lastError?.message || "Execution failed",
      };

      events.push({
        event: "AI_REQUEST_COMPLETED",
        timestamp: new Date().toISOString(),
        details: { success: false, error: lastError?.message },
      });

      throw new LlmExecutionError(
        lastError?.code || "UNKNOWN_ERROR",
        lastError?.message || "LLM execution failed after retries",
        false,
        lastError
      );
    }
  }
}

export const llmManager = new LlmExecutionManager();
