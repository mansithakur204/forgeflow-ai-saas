import { InMemoryVectorStore } from "./in-memory-vector-store";
import { VectorStoreRegistry } from "./vector-store-registry";
import type { IVectorStore } from "./vector-store.interface";

export class VectorStoreFactory {
  /**
   * Resolves and returns a new store type instance matching the name and dimension configs.
   */
  static create(name: string, dimension: number): IVectorStore {
    const normalized = name.toLowerCase().trim();
    if (normalized === "in-memory" || normalized === "inmemory") {
      return new InMemoryVectorStore(dimension);
    }
    throw new Error(`Unsupported vector store type requested: "${name}"`);
  }

  /**
   * Generates a pre-registered Default Vector Store Registry.
   */
  static createDefaultRegistry(dimension: number): VectorStoreRegistry {
    const registry = new VectorStoreRegistry();
    registry.register("in-memory", new InMemoryVectorStore(dimension));
    return registry;
  }
}
