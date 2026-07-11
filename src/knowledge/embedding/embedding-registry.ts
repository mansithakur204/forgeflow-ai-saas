import type { IEmbeddingProvider } from "./embedding-provider.interface";

export class EmbeddingRegistry {
  private providers = new Map<string, IEmbeddingProvider>();

  /**
   * Registers a provider instance. Throws if matching identifier is already registered.
   */
  register(name: string, provider: IEmbeddingProvider): void {
    const key = name.toLowerCase().trim();
    if (this.providers.has(key)) {
      throw new Error(`Duplicate provider registration: "${name}" is already registered`);
    }
    this.providers.set(key, provider);
  }

  /**
   * Resolves a provider instance.
   */
  resolve(name: string): IEmbeddingProvider | null {
    return this.providers.get(name.toLowerCase().trim()) ?? null;
  }

  /**
   * Unregisters a provider instance.
   */
  unregister(name: string): void {
    this.providers.delete(name.toLowerCase().trim());
  }

  /**
   * Clears all registered providers.
   */
  clear(): void {
    this.providers.clear();
  }
}
