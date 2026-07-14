// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Vector Search Engine Service
// Orchestrates multi-metric similarity matching, metadata filtration, and indexers.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  IVectorStore,
  VectorRecord,
  VectorSearchOptions,
  SimilarityMetric,
} from "../vector-store/vector-store.interface";
import type { Chunk } from "../types/document";

export type VectorSearchEngineEventType =
  | "VECTOR_SEARCH_STARTED"
  | "VECTOR_SEARCH_COMPLETED"
  | "VECTOR_SEARCH_FAILED"
  | "VECTOR_INDEX_CREATED"
  | "VECTOR_INDEX_UPDATED";

export interface VectorSearchEngineEvent {
  documentId?: string;
  type: VectorSearchEngineEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SearchEngineOptions {
  vectorStore: IVectorStore;
  onEvent?: (event: VectorSearchEngineEvent) => void;
}

export interface SearchMetadataFilter {
  collection?: string;
  tags?: string[];
  documentType?: string;
  language?: string;
  createdBy?: string;
  startDate?: string;
  endDate?: string;
  source?: string;
}

export interface RichSearchResult {
  documentId: string;
  chunkId: string;
  content: string;
  similarityScore: number;
  distance?: number;
  provider: string;
  searchDurationMs: number;
  rank: number;
  chunkMetadata: Record<string, unknown>;
}

export class VectorSearchEngine {
  private vectorStore: IVectorStore;
  private onEvent?: (event: VectorSearchEngineEvent) => void;

  constructor(options: SearchEngineOptions) {
    this.vectorStore = options.vectorStore;
    this.onEvent = options.onEvent;
  }

  private emit(type: VectorSearchEngineEventType, documentId?: string, metadata?: Record<string, unknown>): void {
    if (this.onEvent) {
      this.onEvent({
        documentId,
        type,
        timestamp: new Date().toISOString(),
        metadata,
      });
    }
  }

  /**
   * Search vector index for similarities, returning ranked, structured metrics results.
   */
  async search(
    queryVector: number[],
    filter?: SearchMetadataFilter,
    options?: {
      limit?: number;
      offset?: number;
      minScore?: number;
      metric?: SimilarityMetric;
    }
  ): Promise<RichSearchResult[]> {
    const startTime = Date.now();
    this.emit("VECTOR_SEARCH_STARTED", undefined, { limit: options?.limit });

    try {
      const metadataFilter: Record<string, unknown> = {};
      if (filter) {
        if (filter.collection) metadataFilter.collection = filter.collection;
        if (filter.tags && filter.tags.length > 0) metadataFilter.tags = filter.tags;
        if (filter.documentType) metadataFilter.documentType = filter.documentType;
        if (filter.language) metadataFilter.language = filter.language;
        if (filter.createdBy) metadataFilter.createdBy = filter.createdBy;
        if (filter.source) metadataFilter.source = filter.source;
        if (filter.startDate) metadataFilter.startDate = filter.startDate;
        if (filter.endDate) metadataFilter.endDate = filter.endDate;
      }

      const capabilities = this.vectorStore.getCapabilities();
      const metric = options?.metric ?? (capabilities.supportedMetrics.includes("cosine") ? "cosine" : capabilities.supportedMetrics[0]);

      const searchOptions: VectorSearchOptions = {
        vector: queryVector,
        limit: options?.limit ?? 10,
        offset: options?.offset ?? 0,
        minScore: options?.minScore,
        metric,
        metadataFilter: Object.keys(metadataFilter).length > 0 ? metadataFilter : undefined,
      };

      const results = await this.vectorStore.search(searchOptions);
      const searchDurationMs = Date.now() - startTime;

      const rankedResults: RichSearchResult[] = results.map((res, index) => ({
        documentId: res.record.documentId,
        chunkId: res.record.id,
        content: res.record.content,
        similarityScore: res.score,
        distance: res.distance,
        provider: capabilities.supportedMetrics.join(","),
        searchDurationMs,
        rank: index + 1,
        chunkMetadata: res.record.metadata,
      }));

      this.emit("VECTOR_SEARCH_COMPLETED", undefined, {
        durationMs: searchDurationMs,
        resultsCount: rankedResults.length,
      });

      return rankedResults;

    } catch (err: any) {
      this.emit("VECTOR_SEARCH_FAILED", undefined, { errorMessage: err.message });
      throw err;
    }
  }

  /**
   * Task 11.5G Performance: Batch indexing of document chunks.
   */
  async indexChunks(
    chunks: Chunk[],
    vectors: number[][]
  ): Promise<void> {
    if (chunks.length !== vectors.length) {
      throw new Error("Mismatch between chunks length and generated vectors length");
    }

    this.emit("VECTOR_INDEX_CREATED", undefined, { count: chunks.length });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vector = vectors[i];

      const record: VectorRecord = {
        id: chunk.id,
        documentId: chunk.documentId,
        vector,
        content: chunk.content,
        metadata: {
          ...chunk.metadata,
          collection: chunk.metadata.collectionId,
        },
      };

      await this.vectorStore.insert(record);
    }

    this.emit("VECTOR_INDEX_UPDATED", undefined, { count: chunks.length });
  }

  /**
   * Task 11.5G Performance: Incremental indexing of a single chunk vector.
   */
  async indexIncremental(chunk: Chunk, vector: number[]): Promise<void> {
    const record: VectorRecord = {
      id: chunk.id,
      documentId: chunk.documentId,
      vector,
      content: chunk.content,
      metadata: {
        ...chunk.metadata,
        collection: chunk.metadata.collectionId,
      },
    };
    await this.vectorStore.insert(record);
    this.emit("VECTOR_INDEX_UPDATED", chunk.documentId, { chunkId: chunk.id });
  }

  /**
   * Task 11.5G Performance: Lazy loading index loading stub.
   */
  async lazyLoadIndex(documentId: string): Promise<void> {
    console.log("[VectorSearchEngine] Lazy loading vector indices for document", documentId);
  }

  /**
   * Task 11.5G Performance: Future ANN index creation configurations.
   */
  async configureANNIndex(params: { partitions: number; metric: SimilarityMetric }): Promise<void> {
    console.log("[VectorSearchEngine] Configured ANN index parameters", params);
  }
}
