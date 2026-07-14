// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Paragraph Chunker Strategy
// ─────────────────────────────────────────────────────────────────────────────

import { BaseChunker } from "./base-chunker";
import type { Chunk } from "../types/document";
import type { ChunkingOptions } from "./chunker.interface";

export class ParagraphChunker extends BaseChunker {
  getStrategy() {
    return "paragraph" as const;
  }

  async split(
    text: string,
    documentId: string,
    options: ChunkingOptions
  ): Promise<Omit<Chunk, "id" | "createdAt">[]> {
    this.validateOptions(options);
    if (!text || text.trim() === "") return [];

    const paragraphs = text.split(/\n\s*\n/);
    const chunks: Omit<Chunk, "id" | "createdAt">[] = [];
    let currentChunk = "";
    let startChar = 0;
    let index = 0;

    for (const paragraph of paragraphs) {
      const pText = paragraph.trim();
      if (!pText) continue;

      if (!currentChunk) {
        currentChunk = pText;
      } else if (currentChunk.length + pText.length + 2 <= options.chunkSize) {
        currentChunk += "\n\n" + pText;
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

        // Implement overlap window
        const overlapSize = options.chunkOverlap;
        if (overlapSize > 0 && currentChunk.length > overlapSize) {
          currentChunk = currentChunk.slice(-overlapSize) + "\n\n" + pText;
        } else {
          currentChunk = pText;
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
