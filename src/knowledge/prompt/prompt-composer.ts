// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Prompt Composer Service
// Templates template-based, structured prompt generation for LLMs.
// ─────────────────────────────────────────────────────────────────────────────

import type { LLMMessage } from "../llm/llm-provider.interface";

export interface PromptTemplateConfig {
  systemTemplate?: string;
  contextTemplate?: string;
  userTemplate?: string;
}

export interface ComposerChunkInput {
  content: string;
  documentId: string;
  chunkId: string;
  index: number;
}

export class PromptComposer {
  private systemTemplate: string;
  private contextTemplate: string;
  private userTemplate: string;

  constructor(config: PromptTemplateConfig = {}) {
    this.systemTemplate =
      config.systemTemplate ??
      "You are an expert AI assistant. Use the following context documents to answer the user query: \n\n{context}\n\nInstructions: {instructions}";
    this.contextTemplate =
      config.contextTemplate ??
      "[Source {index}] (Doc ID: {documentId}, Chunk ID: {chunkId})\n{content}";
    this.userTemplate = config.userTemplate ?? "User Query: {query}";
  }

  /**
   * Generates a structural LLM message array from query inputs and contextual chunks.
   */
  compose(
    queryText: string,
    contextChunks: ComposerChunkInput[],
    instructions = "Focus on accuracy and clear source attributions.",
    conversationContext: LLMMessage[] = []
  ): LLMMessage[] {
    const contextText = contextChunks
      .map((c) =>
        this.contextTemplate
          .replace("{index}", String(c.index + 1))
          .replace("{documentId}", c.documentId)
          .replace("{chunkId}", c.chunkId)
          .replace("{content}", c.content)
      )
      .join("\n\n---\n\n");

    const systemPrompt = this.systemTemplate
      .replace("{context}", contextText)
      .replace("{instructions}", instructions);

    const userPrompt = this.userTemplate.replace("{query}", queryText);

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of conversationContext) {
      messages.push(msg);
    }

    messages.push({ role: "user", content: userPrompt });

    return messages;
  }
}
