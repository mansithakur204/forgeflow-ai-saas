import type { LLMMessage } from "../llm/llm-provider.interface";

export class PromptBuilder {
  /**
   * Compiles context information strings to system prompts constraints blocks.
   */
  buildSystemPrompt(contextText: string): string {
    return `You are an expert coding assistant for ForgeFlow AI. Use the following context documents to answer the user request. Focus on accuracy and source attribution (use [Source X] labels where appropriate). If the answer cannot be derived from the context, state that you do not know.

Context information:
---------------------
${contextText}
---------------------`;
  }

  /**
   * Structures prompts lists mapping system instructions and user queries.
   */
  buildConversationMessages(systemPrompt: string, userQuery: string): LLMMessage[] {
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuery },
    ];
  }
}
