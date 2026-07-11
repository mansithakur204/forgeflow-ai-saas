import type { ILLMProvider } from "../llm/llm-provider.interface";
import { PromptBuilder } from "../prompt/prompt-builder";
import { ResponseValidator } from "../prompt/response-validator";
import type { SearchResponse } from "../types/query";

export interface CompletionResult {
  answer: string;
  isValid: boolean;
  validationReason?: string;
  warnings: string[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  diagnostics: {
    providerName: string;
    latencyMs: number;
  };
}

export class CompletionService {
  private llmProvider: ILLMProvider;
  private promptBuilder: PromptBuilder;
  private validator: ResponseValidator;

  constructor(llmProvider: ILLMProvider) {
    this.llmProvider = llmProvider;
    this.promptBuilder = new PromptBuilder();
    this.validator = new ResponseValidator();
  }

  /**
   * Generates a RAG-based citation-injected LLM response using prompt builder context mapping.
   */
  async generateAnswer(
    userQuery: string,
    searchResponse: SearchResponse
  ): Promise<CompletionResult> {
    const startTime = Date.now();

    // 1. Build system instructions and conversation query array
    const systemPrompt = this.promptBuilder.buildSystemPrompt(searchResponse.context);
    const messages = this.promptBuilder.buildConversationMessages(systemPrompt, userQuery);

    // 2. Query provider text completion
    const response = await this.llmProvider.generateCompletion(messages);
    const latencyMs = Date.now() - startTime;

    // 3. Run hallucination guards validations
    const validation = this.validator.validate(response.text, searchResponse.context);

    return {
      answer: response.text,
      isValid: validation.isValid,
      validationReason: validation.reason,
      warnings: validation.warnings,
      usage: response.usage,
      diagnostics: {
        providerName: this.llmProvider.getMetadata().name,
        latencyMs,
      },
    };
  }
}
