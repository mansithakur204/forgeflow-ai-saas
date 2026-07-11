import type { IChunker, ChunkingStrategyType, ChunkingOptions } from "./chunker.interface";
import type { Chunk } from "../types/document";

export abstract class BaseChunker implements IChunker {
  abstract getStrategy(): ChunkingStrategyType;

  /**
   * Asserts whether the chunk size and overlap configurations are logically valid.
   */
  protected validateOptions(options: ChunkingOptions): void {
    if (options.chunkSize <= 0) {
      throw new Error(`[${this.getStrategy()}] Chunk size must be greater than 0`);
    }
    if (options.chunkOverlap < 0) {
      throw new Error(`[${this.getStrategy()}] Chunk overlap cannot be negative`);
    }
    if (options.chunkOverlap >= options.chunkSize) {
      throw new Error(`[${this.getStrategy()}] Chunk overlap must be less than chunk size`);
    }
  }

  abstract split(
    text: string,
    documentId: string,
    options: ChunkingOptions
  ): Promise<Omit<Chunk, "id" | "createdAt">[]>;

  /**
   * Helper to format split text content to a standard schema with metadata and tokens details.
   */
  protected createChunkOutput(
    content: string,
    documentId: string,
    index: number,
    metadata: Record<string, unknown> = {}
  ): Omit<Chunk, "id" | "createdAt"> {
    const wordCount = content.trim() === "" ? 0 : content.split(/\s+/).length;
    const tokenCount = Math.ceil(wordCount * 1.3); // basic estimate metric

    return {
      documentId,
      content,
      index,
      tokenCount,
      metadata: {
        ...metadata,
        strategy: this.getStrategy(),
        length: content.length,
      },
    };
  }
}
