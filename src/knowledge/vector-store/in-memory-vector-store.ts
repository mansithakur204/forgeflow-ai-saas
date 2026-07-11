import type {
  IVectorStore,
  VectorRecord,
  VectorSearchOptions,
  VectorSearchResult,
  VectorStoreStats,
} from "./vector-store.interface";

export class InMemoryVectorStore implements IVectorStore {
  private records = new Map<string, VectorRecord>();
  private readonly dimension: number;

  constructor(dimension: number) {
    if (dimension <= 0) {
      throw new Error(`Vector store dimension must be greater than 0. Received: ${dimension}`);
    }
    this.dimension = dimension;
  }

  private validateRecord(record: VectorRecord): void {
    if (record.vector.length !== this.dimension) {
      throw new Error(
        `Vector dimension mismatch: Store configured with ${this.dimension} dimensions, received vector has ${record.vector.length}`
      );
    }
  }

  /**
   * Calculates cosine similarity between two float vectors.
   */
  private cosineSimilarity(v1: number[], v2: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      normA += v1[i] * v1[i];
      normB += v2[i] * v2[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  /**
   * Normalizes score to range [0, 1].
   */
  private normalizeScore(score: number): number {
    return (score + 1) / 2;
  }

  /**
   * Iterates metadata match fields. Supports exact match comparison.
   */
  private matchesMetadata(
    recordMetadata: Record<string, unknown> = {},
    filter: Record<string, unknown> = {}
  ): boolean {
    for (const [key, val] of Object.entries(filter)) {
      if (recordMetadata[key] !== val) return false;
    }
    return true;
  }

  async insert(record: VectorRecord): Promise<void> {
    this.validateRecord(record);
    this.records.set(record.id, { ...record });
  }

  async update(record: VectorRecord): Promise<void> {
    this.validateRecord(record);
    if (!this.records.has(record.id)) {
      throw new Error(`Record with ID "${record.id}" does not exist in vector store`);
    }
    this.records.set(record.id, { ...record });
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  async search(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];
    const queryVector = options.vector;

    for (const record of this.records.values()) {
      if (options.namespace && record.namespace !== options.namespace) continue;
      if (options.collection && record.collection !== options.collection) continue;
      if (
        options.metadataFilter &&
        !this.matchesMetadata(record.metadata, options.metadataFilter)
      ) {
        continue;
      }

      let score = 1.0;
      if (queryVector) {
        const rawScore = this.cosineSimilarity(queryVector, record.vector);
        score = this.normalizeScore(rawScore);
      }

      if (options.minScore !== undefined && score < options.minScore) continue;

      results.push({ record, score });
    }

    // Sort descending by score, breaking ties lexicographically by ID for deterministic ordering
    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.record.id.localeCompare(b.record.id);
    });

    const offset = options.offset || 0;
    const limit = options.limit || 10;
    return results.slice(offset, offset + limit);
  }

  async searchByNamespace(
    namespace: string,
    options: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    return this.search({ ...options, namespace });
  }

  async searchByCollection(
    collection: string,
    options: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    return this.search({ ...options, collection });
  }

  async exists(id: string): Promise<boolean> {
    return this.records.has(id);
  }

  async clear(): Promise<void> {
    this.records.clear();
  }

  async statistics(): Promise<VectorStoreStats> {
    const namespaces = new Set<string>();
    const collections = new Set<string>();

    for (const rec of this.records.values()) {
      if (rec.namespace) namespaces.add(rec.namespace);
      if (rec.collection) collections.add(rec.collection);
    }

    return {
      totalRecords: this.records.size,
      namespacesCount: namespaces.size,
      collectionsCount: collections.size,
      dimension: this.dimension,
    };
  }
}
