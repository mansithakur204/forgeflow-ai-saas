// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Memory Provider Factory
// ─────────────────────────────────────────────────────────────────────────────

import type { IMemoryProvider } from "./memory-provider.interface";
import { InMemoryMemoryProvider } from "./memory-provider.interface";
import { PostgresMemoryProvider, RedisMemoryProvider } from "./concrete-providers";

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
      case "postgres":
      case "postgresql":
      case "pg":
        return new PostgresMemoryProvider(id);
      case "redis":
        return new RedisMemoryProvider(id);
      default:
        throw new Error(
          `Unsupported memory provider type requested: "${type}".`
        );
    }
  }
}
