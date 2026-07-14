import type { Chunk } from "../types/document";

export type ChunkingStrategyType = "fixed-size" | "semantic" | "recursive" | "markdown-aware" | "paragraph" | "sentence" | "html-sections";

export interface ChunkingOptions {
  strategy: ChunkingStrategyType;
  chunkSize: number;
  chunkOverlap: number;
  customOptions?: Record<string, unknown>;
}

export interface IChunker {
  /**
   * Identifies the specific strategy type implemented by this chunker instance.
   */
  getStrategy(): ChunkingStrategyType;

  /**
   * Splits extracted document text into sequential chunks with overlaps.
   */
  split(
    text: string,
    documentId: string,
    options: ChunkingOptions
  ): Promise<Omit<Chunk, "id" | "createdAt">[]>;
}
