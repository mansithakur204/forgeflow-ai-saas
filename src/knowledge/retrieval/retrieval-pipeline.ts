import type { IEmbeddingProvider } from "../embedding/embedding-provider.interface";
import type { IVectorStore, VectorSearchResult } from "../vector-store/vector-store.interface";

export interface RetrievalDiagnostics {
  queryText: string;
  resolvedProviderName: string;
  dimensionCount: number;
  vectorStoreStats: {
    totalRecords: number;
    dimension: number;
  };
}

export interface RetrievalPerformanceMetrics {
  embeddingDurationMs: number;
  searchDurationMs: number;
  rankingDurationMs: number;
  totalExecutionDurationMs: number;
}

export interface RetrievalResult {
  results: VectorSearchResult[];
  diagnostics: RetrievalDiagnostics;
  metrics: RetrievalPerformanceMetrics;
}

export interface RetrievalOptions {
  limit?: number;
  offset?: number;
  minScore?: number;
  namespace?: string;
  collection?: string;
  metadataFilter?: Record<string, unknown>;
}

export class RankingEngine {
  /**
   * Sorts vector search results by score and filters out any item falling below the minScore threshold.
   */
  rank(results: VectorSearchResult[], minScore = 0.0): VectorSearchResult[] {
    return results
      .filter((r) => r.score >= minScore)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.record.id.localeCompare(b.record.id);
      });
  }
}

export class RetrievalPipeline {
  private embeddingProvider: IEmbeddingProvider;
  private vectorStore: IVectorStore;
  private rankingEngine: RankingEngine;

  constructor(embeddingProvider: IEmbeddingProvider, vectorStore: IVectorStore) {
    this.embeddingProvider = embeddingProvider;
    this.vectorStore = vectorStore;
    this.rankingEngine = new RankingEngine();
  }

  /**
   * Coordinates text embedding generation, vector store retrieval lookup, and ranking.
   */
  async retrieve(queryText: string, options: RetrievalOptions = {}): Promise<RetrievalResult> {
    const totalStart = Date.now();

    // 1. Generate Query Vector Embedding
    const embedStart = Date.now();
    const queryVector = await this.embeddingProvider.embedSingle(queryText);
    const embeddingDurationMs = Date.now() - embedStart;

    // 2. Perform Vector Search Query
    const searchStart = Date.now();
    const searchResults = await this.vectorStore.search({
      vector: queryVector,
      limit: options.limit ?? 10,
      offset: options.offset ?? 0,
      minScore: options.minScore ?? 0.0,
      namespace: options.namespace,
      collection: options.collection,
      metadataFilter: options.metadataFilter,
    });
    const searchDurationMs = Date.now() - searchStart;

    // 3. Run Ranking Engine Sorts & Threshold Filters
    const rankStart = Date.now();
    const rankedResults = this.rankingEngine.rank(searchResults, options.minScore ?? 0.0);
    const rankingDurationMs = Date.now() - rankStart;

    const totalExecutionDurationMs = Date.now() - totalStart;
    const storeStats = await this.vectorStore.statistics();

    return {
      results: rankedResults,
      diagnostics: {
        queryText,
        resolvedProviderName: this.embeddingProvider.getMetadata().name,
        dimensionCount: queryVector.length,
        vectorStoreStats: {
          totalRecords: storeStats.totalRecords,
          dimension: storeStats.dimension,
        },
      },
      metrics: {
        embeddingDurationMs,
        searchDurationMs,
        rankingDurationMs,
        totalExecutionDurationMs,
      },
    };
  }
}
