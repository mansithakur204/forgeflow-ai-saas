import type { IVectorStore } from "./vector-store.interface";

export class VectorStoreRegistry {
  private stores = new Map<string, IVectorStore>();

  /**
   * Registers a store instance. Throws if matching identifier is already registered.
   */
  register(name: string, store: IVectorStore): void {
    const key = name.toLowerCase().trim();
    if (this.stores.has(key)) {
      throw new Error(`Duplicate vector store registration: "${name}" is already registered`);
    }
    this.stores.set(key, store);
  }

  /**
   * Resolves a store instance.
   */
  resolve(name: string): IVectorStore | null {
    return this.stores.get(name.toLowerCase().trim()) ?? null;
  }

  /**
   * Unregisters a store instance.
   */
  unregister(name: string): void {
    this.stores.delete(name.toLowerCase().trim());
  }

  /**
   * Clears all registered stores.
   */
  clear(): void {
    this.stores.clear();
  }
}
