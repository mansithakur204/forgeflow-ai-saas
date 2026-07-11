import type { VectorSearchResult } from "../vector-store/vector-store.interface";

export interface SearchRequest {
  queryText: string;
  limit?: number;
  offset?: number;
  minScore?: number;
  namespace?: string;
  collection?: string;
  metadataFilter?: Record<string, unknown>;
  tokenBudget?: number; // configured limit for prompt compilation
}

export interface Citation {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface SearchMetrics {
  retrievalTimeMs: number;
  contextBuildTimeMs: number;
  totalTimeMs: number;
  cacheHit: boolean;
  tokenBudgetUsed: number;
  tokenBudgetMax: number;
}

export interface SearchResponse {
  context: string;
  citations: Citation[];
  results: VectorSearchResult[];
  metrics: SearchMetrics;
}

export interface QueryServiceStats {
  totalQueries: number;
  cacheHits: number;
  avgRetrievalTimeMs: number;
  avgTokenBudgetUsed: number;
}
