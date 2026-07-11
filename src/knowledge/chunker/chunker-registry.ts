import type { IChunker, ChunkingStrategyType } from "./chunker.interface";

export class ChunkerRegistry {
  private chunkers = new Map<ChunkingStrategyType, IChunker>();

  /**
   * Registers a chunking strategy instance.
   */
  register(strategy: ChunkingStrategyType, chunker: IChunker): void {
    if (this.chunkers.has(strategy)) {
      throw new Error(`Duplicate strategy registration: "${strategy}" is already registered`);
    }
    this.chunkers.set(strategy, chunker);
  }

  /**
   * Resolves a chunking strategy instance matching the specified type.
   */
  resolve(strategy: ChunkingStrategyType): IChunker | null {
    return this.chunkers.get(strategy) ?? null;
  }

  /**
   * Removes a registered chunking strategy.
   */
  unregister(strategy: ChunkingStrategyType): void {
    this.chunkers.delete(strategy);
  }

  /**
   * Clears all registered chunkers.
   */
  clear(): void {
    this.chunkers.clear();
  }
}
