import { BaseChunker } from "./base-chunker";
import type { Chunk } from "../types/document";
import type { ChunkingOptions } from "./chunker.interface";

export class MarkdownChunker extends BaseChunker {
  getStrategy() {
    return "markdown-aware" as const;
  }

  async split(
    text: string,
    documentId: string,
    options: ChunkingOptions
  ): Promise<Omit<Chunk, "id" | "createdAt">[]> {
    this.validateOptions(options);
    if (!text || text.trim() === "") return [];

    const chunks: Omit<Chunk, "id" | "createdAt">[] = [];
    const headerRegex = /^(#+\s+.*)$/m;
    const lines = text.split(/\r?\n/);

    let currentSection = "";
    let currentHeader = "Root";
    let index = 0;

    for (const line of lines) {
      const match = line.match(headerRegex);
      if (match) {
        if (currentSection.trim()) {
          chunks.push(
            this.createChunkOutput(currentSection, documentId, index++, {
              header: currentHeader,
            })
          );
        }
        currentHeader = match[1];
        currentSection = line;
      } else {
        currentSection += (currentSection ? "\n" : "") + line;
      }
    }

    if (currentSection.trim()) {
      chunks.push(
        this.createChunkOutput(currentSection, documentId, index++, {
          header: currentHeader,
        })
      );
    }

    return chunks;
  }
}
