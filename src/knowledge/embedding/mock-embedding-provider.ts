import { BaseEmbeddingProvider } from "./base-embedding-provider";
import type { EmbeddingProviderMetadata } from "./embedding-provider.interface";

export class MockEmbeddingProvider extends BaseEmbeddingProvider {
  protected readonly metadata: EmbeddingProviderMetadata = {
    name: "mock-embedding-provider",
    dimension: 1536,
    maxBatchSize: 10,
    supportedModels: ["mock-model-v1"],
    capabilities: {
      supportsBatching: true,
      supportsCache: true,
    },
  };

  async embedSingle(text: string): Promise<number[]> {
    const dim = this.metadata.dimension;
    const vector: number[] = new Array(dim).fill(0);

    // Create a deterministic hash integer from string characters
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    for (let d = 0; d < dim; d++) {
      const raw = Math.sin(hash + d) * 10000;
      vector[d] = raw - Math.floor(raw);
    }

    return this.normalize(vector);
  }

  /**
   * Normalizes a vector to unit length (L2 norm) for cosine calculations.
   */
  private normalize(vector: number[]): number[] {
    let sumSq = 0;
    for (const val of vector) {
      sumSq += val * val;
    }
    const norm = Math.sqrt(sumSq) || 1;
    return vector.map((v) => v / norm);
  }
}
