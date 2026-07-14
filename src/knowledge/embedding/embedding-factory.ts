// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Embedding Provider Factory
// ─────────────────────────────────────────────────────────────────────────────

import { MockEmbeddingProvider } from "./mock-embedding-provider";
import {
  OpenAIEmbeddingProvider,
  GoogleGeminiEmbeddingProvider,
  AzureOpenAIEmbeddingProvider,
  LocalModelEmbeddingProvider,
} from "./concrete-providers";
import { EmbeddingRegistry } from "./embedding-registry";
import type { IEmbeddingProvider } from "./embedding-provider.interface";

export class EmbeddingFactory {
  /**
   * Resolves and returns a new provider instance matching the name.
   */
  static create(name: string): IEmbeddingProvider {
    const normalized = name.toLowerCase().trim();
    switch (normalized) {
      case "mock":
      case "mock-embedding-provider":
        return new MockEmbeddingProvider();
      case "openai":
        return new OpenAIEmbeddingProvider();
      case "google-gemini":
      case "gemini":
        return new GoogleGeminiEmbeddingProvider();
      case "azure-openai":
      case "azure":
        return new AzureOpenAIEmbeddingProvider();
      case "local-model":
      case "local":
        return new LocalModelEmbeddingProvider();
      default:
        throw new Error(`Unsupported embedding provider: "${name}"`);
    }
  }

  /**
   * Generates a pre-registered Default Embedding Registry.
   */
  static createDefaultRegistry(): EmbeddingRegistry {
    const registry = new EmbeddingRegistry();
    registry.register("mock", new MockEmbeddingProvider());
    registry.register("openai", new OpenAIEmbeddingProvider());
    registry.register("google-gemini", new GoogleGeminiEmbeddingProvider());
    registry.register("azure-openai", new AzureOpenAIEmbeddingProvider());
    registry.register("local-model", new LocalModelEmbeddingProvider());
    return registry;
  }
}
