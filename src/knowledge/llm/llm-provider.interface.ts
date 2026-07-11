export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMProviderMetadata {
  name: string;
  supportedModels: string[];
  maxContextWindow: number;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  text: string;
  usage?: LLMUsage;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}

export interface ILLMProvider {
  /**
   * Returns metadata descriptors for this provider instance.
   */
  getMetadata(): LLMProviderMetadata;

  /**
   * Triggers generation of a text completion.
   */
  generateCompletion(messages: LLMMessage[], options?: CompletionOptions): Promise<LLMResponse>;

  /**
   * Triggers streaming generation of text completions as an async iterable.
   */
  generateStream?(
    messages: LLMMessage[],
    options?: CompletionOptions
  ): Promise<AsyncIterable<string>>;
}
