// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Knowledge Chunking Engine
// Orchestrates splits generation, quality checking, metadata extraction, and persistences.
// ─────────────────────────────────────────────────────────────────────────────

import type { Chunk, KnowledgeDocument } from "../types/document";
import type { ChunkingOptions } from "../chunker/chunker.interface";
import type { IChunkRepository } from "../repository/knowledge-repository.interface";
import type { ChunkerRegistry } from "../chunker/chunker-registry";
import { ChunkerNotFoundError } from "../errors/processing-error";

export type ChunkingEngineEventType =
  | "CHUNKING_STARTED"
  | "CHUNK_CREATED"
  | "CHUNK_SKIPPED"
  | "CHUNKING_COMPLETED";

export interface ChunkingEngineEvent {
  documentId: string;
  type: ChunkingEngineEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ChunkingEngineOptions {
  chunkRepository: IChunkRepository;
  chunkerRegistry: ChunkerRegistry;
  minChunkLength?: number; // Reject chunks smaller than this size
  onEvent?: (event: ChunkingEngineEvent) => void;
}

export class ChunkingEngine {
  private chunkRepository: IChunkRepository;
  private chunkerRegistry: ChunkerRegistry;
  private minChunkLength: number;
  private onEvent?: (event: ChunkingEngineEvent) => void;

  constructor(options: ChunkingEngineOptions) {
    this.chunkRepository = options.chunkRepository;
    this.chunkerRegistry = options.chunkerRegistry;
    this.minChunkLength = options.minChunkLength ?? 10; // Default: 10 chars minimum
    this.onEvent = options.onEvent;
  }

  private emit(documentId: string, type: ChunkingEngineEventType, metadata?: Record<string, unknown>): void {
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
   * Splits extracted document text using requested strategies, run validation checks and stores chunks.
   */
  async chunkDocument(
    document: KnowledgeDocument,
    parsedText: string,
    options: ChunkingOptions,
    language = "en"
  ): Promise<Chunk[]> {
    const documentId = document.id;
    this.emit(documentId, "CHUNKING_STARTED", { strategy: options.strategy });

    const chunker = this.chunkerRegistry.resolve(options.strategy);
    if (!chunker) {
      throw new ChunkerNotFoundError(`No registered chunker found for strategy: ${options.strategy}`);
    }

    const rawChunks = await chunker.split(parsedText, documentId, options);
    const finalChunks: Omit<Chunk, "id" | "createdAt">[] = [];
    const seenContent = new Set<string>();

    let orderIndex = 0;

    for (const chunk of rawChunks) {
      const content = chunk.content.trim();

      // Quality Validation Checks
      // 1. Reject empty
      if (!content) {
        this.emit(documentId, "CHUNK_SKIPPED", { reason: "empty", index: chunk.index });
        continue;
      }

      // 2. Reject whitespace-only
      if (content.replace(/\s/g, "").length === 0) {
        this.emit(documentId, "CHUNK_SKIPPED", { reason: "whitespace-only", index: chunk.index });
        continue;
      }

      // 3. Reject tiny chunks
      if (content.length < this.minChunkLength) {
        this.emit(documentId, "CHUNK_SKIPPED", { reason: "tiny", length: content.length, index: chunk.index });
        continue;
      }

      // 4. Reject duplicate contents
      if (seenContent.has(content)) {
        this.emit(documentId, "CHUNK_SKIPPED", { reason: "duplicate", index: chunk.index });
        continue;
      }

      seenContent.add(content);

      // Estimate character offset ranges
      const sourceOffset = (chunk.metadata?.startChar as number) ?? parsedText.indexOf(chunk.content);
      const startOffset = sourceOffset >= 0 ? sourceOffset : 0;
      const endOffset = startOffset + chunk.content.length;
      
      const wordCount = content.split(/\s+/).length;

      // Enrich chunk metadata with standard pipeline fields
      const enrichedMetadata = {
        ...chunk.metadata,
        characterRange: { start: startOffset, end: endOffset },
        wordCount,
        tokenEstimate: chunk.tokenCount,
        headingPath: (chunk.metadata?.header as string) ?? (chunk.metadata?.headingPath as string) ?? "Root",
        language,
        sourceOffset: startOffset,
      };

      const finalChunk: Omit<Chunk, "id" | "createdAt"> = {
        documentId,
        content: chunk.content,
        index: orderIndex++,
        tokenCount: chunk.tokenCount,
        metadata: enrichedMetadata,
      };

      finalChunks.push(finalChunk);
      this.emit(documentId, "CHUNK_CREATED", { index: finalChunk.index, size: finalChunk.content.length });
    }

    const createdChunks = await this.chunkRepository.createMany(finalChunks);
    this.emit(documentId, "CHUNKING_COMPLETED", { totalChunks: createdChunks.length });

    return createdChunks;
  }
}
