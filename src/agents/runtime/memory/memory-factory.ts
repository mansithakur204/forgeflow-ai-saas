import type { IMemoryProvider } from "./memory-provider.interface";
import { InMemoryMemoryProvider } from "./memory-provider.interface";

export class MemoryFactory {
  /**
   * Instantiates a memory provider dynamically based on its provider type.
   */
  static create(type: string, id: string = `provider-${Date.now()}`): IMemoryProvider {
    const normalized = type.toLowerCase().trim();
    switch (normalized) {
      case "in-memory":
      case "inmemory":
      case "memory":
        return new InMemoryMemoryProvider(id);
      default:
        throw new Error(
          `Unsupported memory provider type requested: "${type}". External cloud provider drivers must be registered directly in the MemoryRegistry to follow OCP.`
        );
    }
  }
}
