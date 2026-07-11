import { BaseLLMProvider } from "./base-llm-provider";
import type {
  LLMMessage,
  LLMResponse,
  CompletionOptions,
  LLMProviderMetadata,
} from "./llm-provider.interface";

export class MockLLMProvider extends BaseLLMProvider {
  protected readonly metadata: LLMProviderMetadata = {
    name: "mock-llm-provider",
    supportedModels: ["mock-gpt-v4"],
    maxContextWindow: 8192,
  };

  async generateCompletion(
    messages: LLMMessage[],
    options?: CompletionOptions
  ): Promise<LLMResponse> {
    const userMessage = messages.find((m) => m.role === "user")?.content || "";

    let text = `Mock generated answer to user query: "${userMessage.substring(0, 40)}..."`;

    // Simulate citations inclusion if context is found
    if (userMessage.includes("[Source 1]")) {
      text += `\nAccording to [Source 1], the execution engine compiles correctly.`;
    }

    const promptTokens = Math.ceil(userMessage.split(/\s+/).length * 1.3);
    const completionTokens = Math.ceil(text.split(/\s+/).length * 1.3);

    return {
      text,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  }

  /**
   * Helper implementing AsyncIterable stream simulation.
   */
  async *generateStream(
    messages: LLMMessage[],
    options?: CompletionOptions
  ): AsyncIterable<string> {
    const response = await this.generateCompletion(messages, options);
    const chunks = response.text.split(" ");
    for (const chunk of chunks) {
      yield chunk + " ";
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
}
