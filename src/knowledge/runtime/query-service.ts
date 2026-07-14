import { RetrievalService } from "./retrieval-service";
import { ContextBuilder } from "../retrieval/context-builder";
import { QueryCache } from "../retrieval/query-cache";
import type { SearchRequest, SearchResponse, QueryServiceStats } from "../types/query";
import type { IEmbeddingProvider } from "../embedding/embedding-provider.interface";
import type { IVectorStore } from "../vector-store/vector-store.interface";

export class QueryService {
  private retrievalService: RetrievalService;
  private contextBuilder: ContextBuilder;
  private cache: QueryCache;

  // Search query performance statistics
  private totalQueries = 0;
  private cacheHits = 0;
  private totalRetrievalTimeMs = 0;
  private totalTokensUsed = 0;

  constructor(embeddingProvider: IEmbeddingProvider, vectorStore: IVectorStore) {
    this.retrievalService = new RetrievalService(embeddingProvider, vectorStore);
    this.contextBuilder = new ContextBuilder();
    this.cache = new QueryCache();
  }

  /**
   * Main entrance of RAG queries, returning context paragraphs, citation objects, and performance metadata.
   */
  async query(request: SearchRequest): Promise<SearchResponse> {
    const totalStart = Date.now();
    this.totalQueries++;

    // 1. Check cache maps
    const cached = this.cache.get(request);
    if (cached) {
      this.cacheHits++;
      return {
        ...cached,
        metrics: {
          ...cached.metrics,
          cacheHit: true,
          totalTimeMs: Date.now() - totalStart,
        },
      };
    }

    // 2. Retrieve search records
    const retrieveStart = Date.now();
    const results = await this.retrievalService.retrieve(request);
    const retrievalTimeMs = Date.now() - retrieveStart;

    // 3. Formats prompt context budget allocations
    const contextStart = Date.now();
    const tokenLimit = request.tokenBudget ?? 2000;
    const { context, citations, tokensUsed } = this.contextBuilder.buildContext(results, { tokenBudget: tokenLimit });
    const contextBuildTimeMs = Date.now() - contextStart;

    const totalTimeMs = Date.now() - totalStart;

    const response: SearchResponse = {
      context,
      citations,
      results,
      metrics: {
        retrievalTimeMs,
        contextBuildTimeMs,
        totalTimeMs,
        cacheHit: false,
        tokenBudgetUsed: tokensUsed,
        tokenBudgetMax: tokenLimit,
      },
    };

    // 4. Save response to cache maps
    this.cache.set(request, response);

    this.totalRetrievalTimeMs += retrievalTimeMs;
    this.totalTokensUsed += tokensUsed;

    return response;
  }

  /**
   * Resets query cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Returns current service counters statistics.
   */
  getStatistics(): QueryServiceStats {
    const divisor = this.totalQueries - this.cacheHits || 1;
    return {
      totalQueries: this.totalQueries,
      cacheHits: this.cacheHits,
      avgRetrievalTimeMs: this.totalRetrievalTimeMs / divisor,
      avgTokenBudgetUsed: this.totalTokensUsed / divisor,
    };
  }
}
