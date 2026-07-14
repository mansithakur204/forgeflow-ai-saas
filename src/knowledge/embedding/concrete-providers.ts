// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Pluggable Embedding Providers (Stubs)
// ─────────────────────────────────────────────────────────────────────────────

import { BaseEmbeddingProvider } from "./base-embedding-provider";
import type { EmbeddingProviderMetadata } from "./embedding-provider.interface";

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  protected readonly metadata: EmbeddingProviderMetadata = {
    name: "openai",
    dimension: 1536,
    maxBatchSize: 2048,
    supportedModels: ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
    capabilities: {
      supportsBatching: true,
      supportsCache: true,
    },
  };

  async embedSingle(text: string): Promise<number[]> {
    return new Array(this.metadata.dimension).fill(0.1);
  }
}

export class GoogleGeminiEmbeddingProvider extends BaseEmbeddingProvider {
  protected readonly metadata: EmbeddingProviderMetadata = {
    name: "google-gemini",
    dimension: 768,
    maxBatchSize: 100,
    supportedModels: ["text-embedding-004"],
    capabilities: {
      supportsBatching: true,
      supportsCache: true,
    },
  };

  async embedSingle(text: string): Promise<number[]> {
    return new Array(this.metadata.dimension).fill(0.2);
  }
}

export class AzureOpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  protected readonly metadata: EmbeddingProviderMetadata = {
    name: "azure-openai",
    dimension: 1536,
    maxBatchSize: 1000,
    supportedModels: ["text-embedding-3-small", "text-embedding-ada-002"],
    capabilities: {
      supportsBatching: true,
      supportsCache: true,
    },
  };

  async embedSingle(text: string): Promise<number[]> {
    return new Array(this.metadata.dimension).fill(0.3);
  }
}

export class LocalModelEmbeddingProvider extends BaseEmbeddingProvider {
  protected readonly metadata: EmbeddingProviderMetadata = {
    name: "local-model",
    dimension: 384,
    maxBatchSize: 32,
    supportedModels: ["all-minilm-l6-v2", "bge-small-en-v1.5"],
    capabilities: {
      supportsBatching: true,
      supportsCache: false,
    },
  };

  async embedSingle(text: string): Promise<number[]> {
    return new Array(this.metadata.dimension).fill(0.4);
  }
}
