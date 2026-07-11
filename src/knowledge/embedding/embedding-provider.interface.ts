export interface EmbeddingProviderMetadata {
  name: string;
  dimension: number;
  maxBatchSize: number;
  supportedModels: string[];
  capabilities: {
    supportsBatching: boolean;
    supportsCache: boolean;
  };
}

export interface IEmbeddingProvider {
  /**
   * Returns provider metadata descriptors.
   */
  getMetadata(): EmbeddingProviderMetadata;

  /**
   * Generates embedding vector representation for a single text input string.
   */
  embedSingle(text: string): Promise<number[]>;

  /**
   * Generates embedding vector representation array for a batch of text input strings.
   */
  embedBatch(texts: string[]): Promise<number[][]>;
}
