import { BaseChunker } from "./base-chunker";
import type { Chunk } from "../types/document";
import type { ChunkingOptions } from "./chunker.interface";

export class RecursiveChunker extends BaseChunker {
  private separators = ["\n\n", "\n", " ", ""];

  getStrategy() {
    return "recursive" as const;
  }

  async split(
    text: string,
    documentId: string,
    options: ChunkingOptions
  ): Promise<Omit<Chunk, "id" | "createdAt">[]> {
    this.validateOptions(options);
    if (!text || text.trim() === "") return [];

    const chunks: Omit<Chunk, "id" | "createdAt">[] = [];
    const splits = this.recursiveSplit(text, options.chunkSize, this.separators);

    let currentChunk = "";
    let index = 0;

    for (const split of splits) {
      if (currentChunk.length + split.length <= options.chunkSize) {
        currentChunk += (currentChunk ? " " : "") + split;
      } else {
        if (currentChunk) {
          chunks.push(this.createChunkOutput(currentChunk, documentId, index++));
        }

        // Calculate overlap if enabled
        const overlapSize = options.chunkOverlap;
        if (overlapSize > 0 && currentChunk.length > overlapSize) {
          const words = currentChunk.split(/\s+/);
          let overlapStr = "";

          for (let i = words.length - 1; i >= 0; i--) {
            const candidate = words.slice(i).join(" ");
            if (candidate.length <= overlapSize) {
              overlapStr = candidate;
            } else {
              break;
            }
          }
          currentChunk = overlapStr + (overlapStr ? " " : "") + split;
        } else {
          currentChunk = split;
        }
      }
    }

    if (currentChunk) {
      chunks.push(this.createChunkOutput(currentChunk, documentId, index++));
    }

    return chunks;
  }

  private recursiveSplit(text: string, maxSize: number, separators: string[]): string[] {
    if (text.length <= maxSize) return [text];
    if (separators.length === 0) {
      const result: string[] = [];
      for (let i = 0; i < text.length; i += maxSize) {
        result.push(text.slice(i, i + maxSize));
      }
      return result;
    }

    const separator = separators[0];
    const parts = text.split(separator);
    const finalParts: string[] = [];

    for (const part of parts) {
      if (part.length <= maxSize) {
        finalParts.push(part);
      } else {
        finalParts.push(...this.recursiveSplit(part, maxSize, separators.slice(1)));
      }
    }

    return finalParts;
  }
}
