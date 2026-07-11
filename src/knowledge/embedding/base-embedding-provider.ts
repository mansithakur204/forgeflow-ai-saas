import type { IEmbeddingProvider, EmbeddingProviderMetadata } from "./embedding-provider.interface";

export abstract class BaseEmbeddingProvider implements IEmbeddingProvider {
  protected abstract readonly metadata: EmbeddingProviderMetadata;

  getMetadata(): EmbeddingProviderMetadata {
    return this.metadata;
  }

  abstract embedSingle(text: string): Promise<number[]>;

  /**
   * Default batching runner, partitioning inputs to match the maximum allowed provider size.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];

    const limit = this.metadata.maxBatchSize;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += limit) {
      const batch = texts.slice(i, i + limit);
      const batchResult = await Promise.all(batch.map((txt) => this.embedSingle(txt)));
      results.push(...batchResult);
    }

    return results;
  }
}
