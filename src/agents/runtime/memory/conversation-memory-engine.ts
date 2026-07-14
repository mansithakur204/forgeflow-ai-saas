// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Conversation Memory Engine
// Preserves and handles multi-role sliding context window budgets and snapshots.
// ─────────────────────────────────────────────────────────────────────────────

import type { LLMMessage } from "@/knowledge/llm/llm-provider.interface";

export type ConversationMemoryEventType =
  | "CONVERSATION_CREATED"
  | "MESSAGE_ADDED"
  | "MESSAGE_UPDATED"
  | "CONTEXT_TRIMMED"
  | "CONVERSATION_ARCHIVED";

export interface ConversationMemoryEvent {
  conversationId: string;
  type: ConversationMemoryEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type ConversationRole =
  | "system"
  | "user"
  | "assistant"
  | "tool"
  | "agent";

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  pinned?: boolean;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ConversationSession {
  id: string;
  messages: ConversationMessage[];
  archived: boolean;
  maxMessages: number;
  maxTokens: number;
  history: ConversationMessage[][];
}

export interface ConversationMemoryOptions {
  onEvent?: (event: ConversationMemoryEvent) => void;
}

export class ConversationMemoryEngine {
  private conversations = new Map<string, ConversationSession>();
  private onEvent?: (event: ConversationMemoryEvent) => void;

  constructor(options: ConversationMemoryOptions = {}) {
    this.onEvent = options.onEvent;
  }

  private emit(conversationId: string, type: ConversationMemoryEventType, metadata?: Record<string, unknown>): void {
    if (this.onEvent) {
      this.onEvent({
        conversationId,
        type,
        timestamp: new Date().toISOString(),
        metadata,
      });
    }
  }

  private estimateTokens(text: string): number {
    const cleanText = text.trim();
    if (cleanText === "") return 0;
    const wordCount = cleanText.split(/\s+/).length;
    return Math.ceil(wordCount * 1.3);
  }

  /**
   * Task 12.3A: Create Conversation
   */
  createConversation(
    conversationId: string,
    maxMessages = 100,
    maxTokens = 4096
  ): ConversationSession {
    const session: ConversationSession = {
      id: conversationId,
      messages: [],
      archived: false,
      maxMessages,
      maxTokens,
      history: [],
    };
    this.conversations.set(conversationId, session);
    this.emit(conversationId, "CONVERSATION_CREATED", { maxMessages, maxTokens });
    return session;
  }

  /**
   * Task 12.3A: Append Message
   */
  async appendMessage(
    conversationId: string,
    role: ConversationRole,
    content: string,
    metadata?: Record<string, unknown>,
    pinned = false
  ): Promise<ConversationMessage> {
    const session = this.conversations.get(conversationId);
    if (!session) {
      throw new Error(`Conversation with ID "${conversationId}" does not exist`);
    }

    if (session.archived) {
      throw new Error(`Cannot append messages to archived conversation "${conversationId}"`);
    }

    this.checkpoint(conversationId);

    const msg: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      role,
      content,
      pinned,
      metadata,
      timestamp: new Date().toISOString(),
    };

    session.messages.push(msg);
    this.emit(conversationId, "MESSAGE_ADDED", { messageId: msg.id, role });

    this.trimContext(session);

    return msg;
  }

  /**
   * Task 12.3A: Update Message
   */
  async updateMessage(
    conversationId: string,
    messageId: string,
    content: string
  ): Promise<ConversationMessage> {
    const session = this.conversations.get(conversationId);
    if (!session) {
      throw new Error(`Conversation with ID "${conversationId}" does not exist`);
    }

    const idx = session.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) {
      throw new Error(`Message with ID "${messageId}" not found in conversation "${conversationId}"`);
    }

    this.checkpoint(conversationId);

    const updated: ConversationMessage = {
      ...session.messages[idx],
      content,
      timestamp: new Date().toISOString(),
    };

    session.messages[idx] = updated;
    this.emit(conversationId, "MESSAGE_UPDATED", { messageId });
    return updated;
  }

  /**
   * Task 12.3A: Delete Message
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const session = this.conversations.get(conversationId);
    if (!session) return;

    this.checkpoint(conversationId);
    session.messages = session.messages.filter((m) => m.id !== messageId);
  }

  /**
   * Task 12.3A: Archive Conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    const session = this.conversations.get(conversationId);
    if (!session) return;

    session.archived = true;
    this.emit(conversationId, "CONVERSATION_ARCHIVED");
  }

  /**
   * Task 12.3A: Restore Conversation
   */
  async restoreConversation(conversationId: string): Promise<void> {
    const session = this.conversations.get(conversationId);
    if (!session) return;

    session.archived = false;
  }

  /**
   * Task 12.3A: Summarize Conversation (architecture only)
   */
  async summarizeConversation(conversationId: string): Promise<string> {
    console.log("[ConversationMemoryEngine] Summarizing conversation history for session", conversationId);
    return "Conversation summary placeholder";
  }

  /**
   * Task 12.3D: Checkpoint
   */
  checkpoint(conversationId: string): void {
    const session = this.conversations.get(conversationId);
    if (!session) return;

    const backup = session.messages.map((m) => ({ ...m }));
    session.history.push(backup);
  }

  /**
   * Task 12.3D: Restore Snapshot
   */
  restoreSnapshot(conversationId: string, index: number): void {
    const session = this.conversations.get(conversationId);
    if (!session || index < 0 || index >= session.history.length) return;

    session.messages = session.history[index].map((m) => ({ ...m }));
  }

  /**
   * Task 12.3D: Get Revision History
   */
  getRevisionHistory(conversationId: string): ConversationMessage[][] {
    const session = this.conversations.get(conversationId);
    return session ? session.history : [];
  }

  /**
   * Task 12.3C: Context Window Management
   */
  private trimContext(session: ConversationSession): void {
    let tokensUsed = session.messages.reduce((acc, m) => acc + this.estimateTokens(m.content), 0);

    while (session.messages.length > session.maxMessages) {
      const firstUnpinnedIndex = session.messages.findIndex((m) => !m.pinned);
      if (firstUnpinnedIndex === -1) break;

      const trimmed = session.messages.splice(firstUnpinnedIndex, 1)[0];
      tokensUsed -= this.estimateTokens(trimmed.content);
      this.emit(session.id, "CONTEXT_TRIMMED", { reason: "maxMessages", messageId: trimmed.id });
    }

    while (tokensUsed > session.maxTokens) {
      const firstUnpinnedIndex = session.messages.findIndex((m) => !m.pinned);
      if (firstUnpinnedIndex === -1) break;

      const trimmed = session.messages.splice(firstUnpinnedIndex, 1)[0];
      tokensUsed -= this.estimateTokens(trimmed.content);
      this.emit(session.id, "CONTEXT_TRIMMED", { reason: "maxTokens", messageId: trimmed.id });
    }
  }

  /**
   * Formats messages for LLM ingestion
   */
  getLLMMessages(conversationId: string): LLMMessage[] {
    const session = this.conversations.get(conversationId);
    if (!session) return [];

    return session.messages.map((m) => ({
      role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
      content: m.role === "tool" ? `[Tool Output]\n${m.content}` : m.content,
    }));
  }
}
