import { MockEmbeddingProvider } from "./mock-embedding-provider";
import { EmbeddingRegistry } from "./embedding-registry";
import type { IEmbeddingProvider } from "./embedding-provider.interface";

export class EmbeddingFactory {
  /**
   * Resolves and returns a new provider instance matching the name.
   */
  static create(name: string): IEmbeddingProvider {
    const normalized = name.toLowerCase().trim();
    if (normalized === "mock" || normalized === "mock-embedding-provider") {
      return new MockEmbeddingProvider();
    }
    throw new Error(`Unsupported embedding provider: "${name}"`);
  }

  /**
   * Generates a pre-registered Default Embedding Registry.
   */
  static createDefaultRegistry(): EmbeddingRegistry {
    const registry = new EmbeddingRegistry();
    registry.register("mock", new MockEmbeddingProvider());
    return registry;
  }
}
