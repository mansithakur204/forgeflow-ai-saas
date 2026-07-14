// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Embedding Engine Service
// Orchestrates cache checks, vector provider generation, and metadata persistences.
// ─────────────────────────────────────────────────────────────────────────────

import type { Chunk } from "../types/document";
import type { IEmbeddingProvider } from "../embedding/embedding-provider.interface";
import type { IEmbeddingCache, EmbeddingCacheKey } from "../embedding/embedding-cache";
import type { IEmbeddingRepository, EmbeddingMetadata, PersistentEmbedding } from "../repository/knowledge-repository.interface";
import { DocumentProcessingError } from "../errors/processing-error";

export type EmbeddingEngineEventType =
  | "EMBEDDING_STARTED"
  | "EMBEDDING_COMPLETED"
  | "EMBEDDING_FAILED"
  | "EMBEDDING_CACHE_HIT"
  | "EMBEDDING_CACHE_MISS";

export interface EmbeddingEngineEvent {
  documentId: string;
  type: EmbeddingEngineEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingJob {
  id: string;
  chunkId: string;
  documentId: string;
  content: string;
  status: "queued" | "processing" | "completed" | "failed";
  error?: string;
  createdAt: string;
}

export interface EmbeddingEngineOptions {
  embeddingRepository: IEmbeddingRepository;
  embeddingCache: IEmbeddingCache;
  onEvent?: (event: EmbeddingEngineEvent) => void;
}

export class EmbeddingEngine {
  private embeddingRepository: IEmbeddingRepository;
  private embeddingCache: IEmbeddingCache;
  private onEvent?: (event: EmbeddingEngineEvent) => void;

  constructor(options: EmbeddingEngineOptions) {
    this.embeddingRepository = options.embeddingRepository;
    this.embeddingCache = options.embeddingCache;
    this.onEvent = options.onEvent;
  }

  private emit(documentId: string, type: EmbeddingEngineEventType, metadata?: Record<string, unknown>): void {
    if (this.onEvent) {
      this.onEvent({
        documentId,
        type,
        timestamp: new Date().toISOString(),
        metadata,
      });
    }
  }

  private makeHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return String(Math.abs(hash));
  }

  /**
   * Triggers embedding resolution for a single text chunk chunk.
   */
  async embedChunk(
    chunk: Chunk,
    provider: IEmbeddingProvider,
    modelName: string,
    version = 1
  ): Promise<PersistentEmbedding> {
    const documentId = chunk.documentId;
    const providerMetadata = provider.getMetadata();
    const contentHash = this.makeHash(chunk.content);

    const cacheKey: EmbeddingCacheKey = {
      chunkId: chunk.id,
      contentHash,
      model: modelName,
      dimensions: providerMetadata.dimension,
      version,
    };

    this.emit(documentId, "EMBEDDING_STARTED", { chunkId: chunk.id, model: modelName });

    try {
      // 1. Resolve Cache check
      let vector = await this.embeddingCache.get(cacheKey);

      if (vector) {
        this.emit(documentId, "EMBEDDING_CACHE_HIT", { chunkId: chunk.id });
      } else {
        this.emit(documentId, "EMBEDDING_CACHE_MISS", { chunkId: chunk.id });

        const startTime = Date.now();
        
        // 2. Query provider to generate vector
        vector = await provider.embedSingle(chunk.content);
        const latencyMs = Date.now() - startTime;

        // 3. Set Cache
        await this.embeddingCache.set(cacheKey, vector);

        // 4. Save to Repository
        const metadata: EmbeddingMetadata = {
          model: modelName,
          dimensions: providerMetadata.dimension,
          generatedAt: new Date().toISOString(),
          provider: providerMetadata.name,
          latencyMs,
          tokenUsage: Math.ceil(chunk.content.split(/\s+/).length * 1.3),
          contentHash,
          version,
        };

        const result = await this.embeddingRepository.save(chunk.id, vector, metadata);
        this.emit(documentId, "EMBEDDING_COMPLETED", { chunkId: chunk.id, latencyMs });
        return result;
      }

      // Cache hit path
      const metadata: EmbeddingMetadata = {
        model: modelName,
        dimensions: providerMetadata.dimension,
        generatedAt: new Date().toISOString(),
        provider: providerMetadata.name,
        latencyMs: 0,
        tokenUsage: Math.ceil(chunk.content.split(/\s+/).length * 1.3),
        contentHash,
        version,
      };

      const result = await this.embeddingRepository.save(chunk.id, vector, metadata);
      this.emit(documentId, "EMBEDDING_COMPLETED", { chunkId: chunk.id, source: "cache" });
      return result;

    } catch (err: any) {
      this.emit(documentId, "EMBEDDING_FAILED", { chunkId: chunk.id, errorMessage: err.message });
      throw new DocumentProcessingError(`Embedding engine failed: ${err.message}`);
    }
  }

  /**
   * Triggers embedding resolution for a batch of text chunks.
   */
  async embedBatch(
    chunks: Chunk[],
    provider: IEmbeddingProvider,
    modelName: string,
    version = 1
  ): Promise<PersistentEmbedding[]> {
    const results: PersistentEmbedding[] = [];
    for (const chunk of chunks) {
      results.push(await this.embedChunk(chunk, provider, modelName, version));
    }
    return results;
  }

  /**
   * Task 11.4E Queue Ready Architecture
   * Generates pipeline jobs payload format for downstream asynchronous dispatchers.
   */
  createQueueJob(chunk: Chunk, providerName: string, modelName: string): EmbeddingJob {
    return {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      chunkId: chunk.id,
      documentId: chunk.documentId,
      content: chunk.content,
      status: "queued",
      createdAt: new Date().toISOString(),
    };
  }
}
