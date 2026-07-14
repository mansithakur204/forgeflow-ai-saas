// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Sentence Chunker Strategy
// ─────────────────────────────────────────────────────────────────────────────

import { BaseChunker } from "./base-chunker";
import type { Chunk } from "../types/document";
import type { ChunkingOptions } from "./chunker.interface";

export class SentenceChunker extends BaseChunker {
  getStrategy() {
    return "sentence" as const;
  }

  async split(
    text: string,
    documentId: string,
    options: ChunkingOptions
  ): Promise<Omit<Chunk, "id" | "createdAt">[]> {
    this.validateOptions(options);
    if (!text || text.trim() === "") return [];

    // Splits text using basic punctuation boundary match groups
    const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [text];
    const chunks: Omit<Chunk, "id" | "createdAt">[] = [];
    let currentChunk = "";
    let startChar = 0;
    let index = 0;

    for (const sentence of sentences) {
      const sText = sentence.trim();
      if (!sText) continue;

      if (!currentChunk) {
        currentChunk = sText;
      } else if (currentChunk.length + sText.length + 1 <= options.chunkSize) {
        currentChunk += " " + sText;
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
          currentChunk = currentChunk.slice(-overlapSize) + " " + sText;
        } else {
          currentChunk = sText;
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
