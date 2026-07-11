import { BaseChunker } from "./base-chunker";
import type { Chunk } from "../types/document";
import type { ChunkingOptions } from "./chunker.interface";

export class FixedSizeChunker extends BaseChunker {
  getStrategy() {
    return "fixed-size" as const;
  }

  async split(
    text: string,
    documentId: string,
    options: ChunkingOptions
  ): Promise<Omit<Chunk, "id" | "createdAt">[]> {
    this.validateOptions(options);
    if (!text || text.trim() === "") return [];

    const chunks: Omit<Chunk, "id" | "createdAt">[] = [];
    const size = options.chunkSize;
    const overlap = options.chunkOverlap;
    const step = size - overlap;

    let index = 0;
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + size, text.length);
      const content = text.slice(start, end);

      chunks.push(
        this.createChunkOutput(content, documentId, index++, {
          startChar: start,
          endChar: end,
        })
      );

      if (end === text.length) break;
      start += step;
    }

    return chunks;
  }
}
