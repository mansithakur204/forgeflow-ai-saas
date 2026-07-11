import type {
  ILLMProvider,
  LLMProviderMetadata,
  LLMMessage,
  LLMResponse,
  CompletionOptions,
} from "./llm-provider.interface";

export abstract class BaseLLMProvider implements ILLMProvider {
  protected abstract readonly metadata: LLMProviderMetadata;

  getMetadata(): LLMProviderMetadata {
    return this.metadata;
  }

  abstract generateCompletion(
    messages: LLMMessage[],
    options?: CompletionOptions
  ): Promise<LLMResponse>;
}
