// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Chunker Factory
// ─────────────────────────────────────────────────────────────────────────────

import { FixedSizeChunker } from "./fixed-size-chunker";
import { RecursiveChunker } from "./recursive-chunker";
import { MarkdownChunker } from "./markdown-chunker";
import { SemanticChunker } from "./semantic-chunker";
import { ParagraphChunker } from "./paragraph-chunker";
import { SentenceChunker } from "./sentence-chunker";
import { HTMLSectionsChunker } from "./html-sections-chunker";
import { ChunkerRegistry } from "./chunker-registry";
import type { IChunker, ChunkingStrategyType } from "./chunker.interface";

export class ChunkerFactory {
  /**
   * Instantiates a concrete chunking strategy handler.
   */
  static create(strategy: ChunkingStrategyType): IChunker {
    switch (strategy) {
      case "fixed-size":
        return new FixedSizeChunker();
      case "recursive":
        return new RecursiveChunker();
      case "markdown-aware":
        return new MarkdownChunker();
      case "semantic":
        return new SemanticChunker();
      case "paragraph":
        return new ParagraphChunker();
      case "sentence":
        return new SentenceChunker();
      case "html-sections":
        return new HTMLSectionsChunker();
      default:
        throw new Error(`Unsupported chunking strategy: "${strategy}"`);
    }
  }

  /**
   * Creates a preloaded ChunkerRegistry mapped with standard splitting strategies.
   */
  static createDefaultRegistry(): ChunkerRegistry {
    const registry = new ChunkerRegistry();
    registry.register("fixed-size", new FixedSizeChunker());
    registry.register("recursive", new RecursiveChunker());
    registry.register("markdown-aware", new MarkdownChunker());
    registry.register("semantic", new SemanticChunker());
    registry.register("paragraph", new ParagraphChunker());
    registry.register("sentence", new SentenceChunker());
    registry.register("html-sections", new HTMLSectionsChunker());
    return registry;
  }
}
