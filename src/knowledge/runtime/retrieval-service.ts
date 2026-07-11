import type { IEmbeddingProvider } from "../embedding/embedding-provider.interface";
import type { IVectorStore, VectorSearchResult } from "../vector-store/vector-store.interface";
import type { SearchRequest } from "../types/query";
import { RankingEngine } from "../retrieval/retrieval-pipeline";

export class RetrievalService {
  private embeddingProvider: IEmbeddingProvider;
  private vectorStore: IVectorStore;
  private rankingEngine: RankingEngine;

  constructor(embeddingProvider: IEmbeddingProvider, vectorStore: IVectorStore) {
    this.embeddingProvider = embeddingProvider;
    this.vectorStore = vectorStore;
    this.rankingEngine = new RankingEngine();
  }

  /**
   * Performs hybrid search retrieval (vector index scoring augmented by exact word overlap boosts).
   */
  async retrieve(request: SearchRequest): Promise<VectorSearchResult[]> {
    // 1. Generate Query Vector Embedding
    const queryVector = await this.embeddingProvider.embedSingle(request.queryText);

    // 2. Perform Search Lookup in Vector Store (Over-query limit size to allow post-search hybrid updates)
    const results = await this.vectorStore.search({
      vector: queryVector,
      limit: (request.limit ?? 10) * 2,
      minScore: request.minScore ?? 0.0,
      namespace: request.namespace,
      collection: request.collection,
      metadataFilter: request.metadataFilter,
    });

    // 3. Compute lexical hybrid boosts overlap
    const queryWords = request.queryText.toLowerCase().split(/\s+/);
    const boostedResults = results.map((res) => {
      const contentLower = res.record.content.toLowerCase();
      let matchCount = 0;

      for (const word of queryWords) {
        if (word.length > 2 && contentLower.includes(word)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const boostValue = Math.min(matchCount * 0.02, 0.05); // max 0.05 score boost
        const score = Math.min(res.score + boostValue, 1.0);
        return { ...res, score };
      }

      return res;
    });

    // 4. Return ranked outputs filtered by minScore and sliced to limit
    const minScore = request.minScore ?? 0.0;
    const limit = request.limit ?? 10;
    return this.rankingEngine.rank(boostedResults, minScore).slice(0, limit);
  }
}
