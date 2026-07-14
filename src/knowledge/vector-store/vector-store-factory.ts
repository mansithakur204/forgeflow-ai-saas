// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Vector Store Factory
// ─────────────────────────────────────────────────────────────────────────────

import { InMemoryVectorStore } from "./in-memory-vector-store";
import {
  PgVectorStore,
  AzureAISearchVectorStore,
  QdrantVectorStore,
  PineconeVectorStore,
  ChromaVectorStore,
} from "./concrete-providers";
import { VectorStoreRegistry } from "./vector-store-registry";
import type { IVectorStore } from "./vector-store.interface";

export class VectorStoreFactory {
  /**
   * Resolves and returns a new store type instance matching the name and dimension configs.
   */
  static create(name: string, dimension: number): IVectorStore {
    const normalized = name.toLowerCase().trim();
    switch (normalized) {
      case "in-memory":
      case "inmemory":
        return new InMemoryVectorStore(dimension);
      case "pgvector":
      case "postgres":
        return new PgVectorStore(dimension);
      case "azure-ai":
      case "azure":
        return new AzureAISearchVectorStore(dimension);
      case "qdrant":
        return new QdrantVectorStore(dimension);
      case "pinecone":
        return new PineconeVectorStore(dimension);
      case "chroma":
        return new ChromaVectorStore(dimension);
      default:
        throw new Error(`Unsupported vector store type requested: "${name}"`);
    }
  }

  /**
   * Generates a pre-registered Default Vector Store Registry.
   */
  static createDefaultRegistry(dimension: number): VectorStoreRegistry {
    const registry = new VectorStoreRegistry();
    registry.register("in-memory", new InMemoryVectorStore(dimension));
    registry.register("pgvector", new PgVectorStore(dimension));
    registry.register("azure-ai", new AzureAISearchVectorStore(dimension));
    registry.register("qdrant", new QdrantVectorStore(dimension));
    registry.register("pinecone", new PineconeVectorStore(dimension));
    registry.register("chroma", new ChromaVectorStore(dimension));
    return registry;
  }
}
