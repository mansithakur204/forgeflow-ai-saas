export interface IEmbeddingCache {
  /**
   * Resolves cached vector projections.
   */
  get(text: string, model: string): Promise<number[] | null>;

  /**
   * Caches a vector projection for a target string.
   */
  set(text: string, model: string, embedding: number[]): Promise<void>;

  /**
   * Resets all cached records.
   */
  clear(): Promise<void>;
}

export class InMemoryEmbeddingCache implements IEmbeddingCache {
  private cache = new Map<string, number[]>();

  private makeKey(text: string, model: string): string {
    return `${model.toLowerCase().trim()}:${text}`;
  }

  async get(text: string, model: string): Promise<number[] | null> {
    const entry = this.cache.get(this.makeKey(text, model));
    return entry ? [...entry] : null;
  }

  async set(text: string, model: string, embedding: number[]): Promise<void> {
    this.cache.set(this.makeKey(text, model), [...embedding]);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}
