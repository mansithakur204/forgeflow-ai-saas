// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Embedding Cache Layer
// ─────────────────────────────────────────────────────────────────────────────

export interface EmbeddingCacheKey {
  chunkId: string;
  contentHash: string;
  model: string;
  dimensions: number;
  version: number;
}

export interface IEmbeddingCache {
  /**
   * Resolves cached vector projections.
   */
  get(key: EmbeddingCacheKey): Promise<number[] | null>;

  /**
   * Caches a vector projection for a target split.
   */
  set(key: EmbeddingCacheKey, embedding: number[]): Promise<void>;

  /**
   * Resets all cached records.
   */
  clear(): Promise<void>;
}

export class InMemoryEmbeddingCache implements IEmbeddingCache {
  private cache = new Map<string, number[]>();

  private makeKey(key: EmbeddingCacheKey): string {
    return `${key.chunkId}:${key.contentHash}:${key.model.toLowerCase().trim()}:${key.dimensions}:${key.version}`;
  }

  async get(key: EmbeddingCacheKey): Promise<number[] | null> {
    const entry = this.cache.get(this.makeKey(key));
    return entry ? [...entry] : null;
  }

  async set(key: EmbeddingCacheKey, embedding: number[]): Promise<void> {
    this.cache.set(this.makeKey(key), [...embedding]);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}
