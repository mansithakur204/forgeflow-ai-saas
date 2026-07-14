// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — LLM Provider Registry
// ─────────────────────────────────────────────────────────────────────────────

import type { ILlmProvider } from "./provider.interface";
import { MockLlmProvider } from "./providers/mock.provider";
import { GeminiLlmProvider } from "./providers/gemini.provider";
import { OpenAiLlmProvider } from "./providers/openai.provider";
import { aiConfig } from "./config";

export class LlmProviderRegistry {
  private readonly providers = new Map<string, ILlmProvider>();

  constructor() {
    this.register(new MockLlmProvider());
    this.register(new GeminiLlmProvider());
    this.register(new OpenAiLlmProvider());
  }

  register(provider: ILlmProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Retrieves the configured provider. If the requested provider's credentials
   * are missing or invalid, automatically falls back to the Mock provider to prevent crashes.
   */
  getProvider(id?: string): ILlmProvider {
    // Determine provider ID based on parameter or default config env
    let targetId = id || aiConfig.defaultProvider || "mock";
    
    // Normalize model-based providers if the model is passed (e.g. gpt-4 -> openai, gemini -> gemini)
    if (targetId.startsWith("gpt") || targetId.includes("openai")) {
      targetId = "openai";
    } else if (targetId.includes("gemini")) {
      targetId = "gemini";
    }

    const provider = this.providers.get(targetId);
    if (!provider) {
      return this.providers.get("mock")!;
    }

    const check = provider.validateConfig();
    if (!check.valid) {
      // API Key missing/invalid, fallback to mock provider as per requirements
      return this.providers.get("mock")!;
    }

    return provider;
  }

  getRawProvider(id: string): ILlmProvider | undefined {
    return this.providers.get(id);
  }

  listProviders(): ILlmProvider[] {
    return Array.from(this.providers.values());
  }
}

export const llmRegistry = new LlmProviderRegistry();
