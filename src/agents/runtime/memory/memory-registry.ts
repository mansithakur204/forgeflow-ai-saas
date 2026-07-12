import type { IMemoryProvider } from "./memory-provider.interface";

export class MemoryRegistry {
  private providers = new Map<string, IMemoryProvider>();

  /**
   * Registers a memory provider instance. Throws if matching ID is already registered.
   */
  register(provider: IMemoryProvider): void {
    const key = provider.getId().toLowerCase().trim();
    if (this.providers.has(key)) {
      throw new Error(
        `Duplicate memory provider registration: Provider with ID "${provider.getId()}" is already registered.`
      );
    }
    this.providers.set(key, provider);
  }

  /**
   * Resolves a registered memory provider instance.
   */
  resolve(id: string): IMemoryProvider | null {
    return this.providers.get(id.toLowerCase().trim()) ?? null;
  }

  /**
   * Unregisters a memory provider.
   */
  unregister(id: string): void {
    this.providers.delete(id.toLowerCase().trim());
  }

  /**
   * Resets registry.
   */
  clear(): void {
    this.providers.clear();
  }
}
