import type { ILLMProvider } from "./llm-provider.interface";

export class LLMRegistry {
  private providers = new Map<string, ILLMProvider>();

  /**
   * Registers a provider instance. Throws if matching identifier is already registered.
   */
  register(name: string, provider: ILLMProvider): void {
    const key = name.toLowerCase().trim();
    if (this.providers.has(key)) {
      throw new Error(`Duplicate LLM provider registration: "${name}" is already registered`);
    }
    this.providers.set(key, provider);
  }

  /**
   * Resolves a registered provider instance.
   */
  resolve(name: string): ILLMProvider | null {
    return this.providers.get(name.toLowerCase().trim()) ?? null;
  }

  /**
   * Removes a registered provider mapping.
   */
  unregister(name: string): void {
    this.providers.delete(name.toLowerCase().trim());
  }

  /**
   * Resets registry.
   */
  clear(): void {
    this.providers.clear();
  }
}
