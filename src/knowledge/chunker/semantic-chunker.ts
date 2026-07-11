import { BaseChunker } from "./base-chunker";
import type { Chunk } from "../types/document";
import type { ChunkingOptions } from "./chunker.interface";

export class SemanticChunker extends BaseChunker {
  getStrategy() {
    return "semantic" as const;
  }

  async split(
    text: string,
    documentId: string,
    options: ChunkingOptions
  ): Promise<Omit<Chunk, "id" | "createdAt">[]> {
    this.validateOptions(options);
    if (!text || text.trim() === "") return [];

    const chunks: Omit<Chunk, "id" | "createdAt">[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    let currentChunk = "";
    let index = 0;

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= options.chunkSize) {
        currentChunk += (currentChunk ? " " : "") + sentence;
      } else {
        if (currentChunk) {
          chunks.push(
            this.createChunkOutput(currentChunk, documentId, index++, {
              semanticBoundary: true,
            })
          );
        }
        currentChunk = sentence;
      }
    }

    if (currentChunk) {
      chunks.push(
        this.createChunkOutput(currentChunk, documentId, index++, {
          semanticBoundary: true,
        })
      );
    }

    return chunks;
  }
}
