import type { IKnowledgeSourceProvider } from "./source-provider.interface";

export class SourceProviderRegistry {
  private providers = new Map<string, IKnowledgeSourceProvider>();

  /**
   * Registers a provider instance. Throws if matching type is already registered.
   */
  register(type: string, provider: IKnowledgeSourceProvider): void {
    const key = type.toLowerCase().trim();
    if (this.providers.has(key)) {
      throw new Error(`Duplicate source provider registration: "${type}" is already registered`);
    }
    this.providers.set(key, provider);
  }

  /**
   * Resolves a registered provider instance.
   */
  resolve(type: string): IKnowledgeSourceProvider | null {
    return this.providers.get(type.toLowerCase().trim()) ?? null;
  }

  /**
   * Removes a registered provider mapping.
   */
  unregister(type: string): void {
    this.providers.delete(type.toLowerCase().trim());
  }

  /**
   * Resets registry.
   */
  clear(): void {
    this.providers.clear();
  }
}
