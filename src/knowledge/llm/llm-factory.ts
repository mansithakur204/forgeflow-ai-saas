import { MockLLMProvider } from "./mock-llm-provider";
import { LLMRegistry } from "./llm-registry";
import type { ILLMProvider } from "./llm-provider.interface";

export class LLMFactory {
  /**
   * Instantiates an LLM provider dynamically based on name keys.
   */
  static create(name: string): ILLMProvider {
    const normalized = name.toLowerCase().trim();
    if (normalized === "mock" || normalized === "mock-llm-provider") {
      return new MockLLMProvider();
    }
    throw new Error(`Unsupported LLM provider requested: "${name}"`);
  }

  /**
   * Instantiates a default pre-registered registry collection.
   */
  static createDefaultRegistry(): LLMRegistry {
    const registry = new LLMRegistry();
    registry.register("mock", new MockLLMProvider());
    return registry;
  }
}
