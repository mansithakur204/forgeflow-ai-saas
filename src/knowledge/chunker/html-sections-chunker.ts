// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — HTML Sections Chunker Strategy
// ─────────────────────────────────────────────────────────────────────────────

import { BaseChunker } from "./base-chunker";
import type { Chunk } from "../types/document";
import type { ChunkingOptions } from "./chunker.interface";

export class HTMLSectionsChunker extends BaseChunker {
  getStrategy() {
    return "html-sections" as const;
  }

  async split(
    text: string,
    documentId: string,
    options: ChunkingOptions
  ): Promise<Omit<Chunk, "id" | "createdAt">[]> {
    this.validateOptions(options);
    if (!text || text.trim() === "") return [];

    // Split HTML content on structural tag groupings
    const blockRegex = /(<(?:section|div|article|h[1-6]|p)\b[^>]*>)/gi;
    const parts = text.split(blockRegex);
    const chunks: Omit<Chunk, "id" | "createdAt">[] = [];
    
    let currentChunk = "";
    let startChar = 0;
    let index = 0;

    for (const part of parts) {
      if (!part) continue;
      
      if (!currentChunk) {
        currentChunk = part;
      } else if (currentChunk.length + part.length <= options.chunkSize) {
        currentChunk += part;
      } else {
        const offset = text.indexOf(currentChunk, startChar);
        const actualStart = offset >= 0 ? offset : startChar;

        chunks.push(
          this.createChunkOutput(currentChunk, documentId, index++, {
            startChar: actualStart,
            endChar: actualStart + currentChunk.length,
          })
        );

        if (offset >= 0) startChar = offset + currentChunk.length;

        const overlapSize = options.chunkOverlap;
        if (overlapSize > 0 && currentChunk.length > overlapSize) {
          currentChunk = currentChunk.slice(-overlapSize) + part;
        } else {
          currentChunk = part;
        }
      }
    }

    if (currentChunk.trim()) {
      const offset = text.indexOf(currentChunk, startChar);
      const actualStart = offset >= 0 ? offset : startChar;
      
      chunks.push(
        this.createChunkOutput(currentChunk, documentId, index++, {
          startChar: actualStart,
          endChar: actualStart + currentChunk.length,
        })
      );
    }

    return chunks;
  }
}
