import type { IMemoryProvider } from "./memory-provider.interface";
import type { MemoryEntry } from "../../types/memory";

export class MemoryCompression {
  private provider: IMemoryProvider;

  constructor(provider: IMemoryProvider) {
    this.provider = provider;
  }

  /**
   * Compresses conversation memories into a single consolidated summary entry, purging old logs.
   */
  async compressConversationHistory(sessionId: string): Promise<MemoryEntry | null> {
    const query = {
      type: "conversation" as const,
      tags: [`session:${sessionId}`],
    };
    const entries = await this.provider.search(query);
    if (entries.length < 5) {
      return null; // Only compress if there are at least 5 messages
    }

    // 1. Sort by age ascending to preserve chronology
    entries.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // 2. Generate a summarized log
    const conversationLog = entries
      .map((e) => `[${e.createdAt}] ${e.key}: ${e.value}`)
      .join("\n");
    const summary = this.summarizeText(conversationLog);

    // 3. Create a consolidated memory entry
    const compressedId = `summary-${sessionId}-${Date.now()}`;
    const compressedEntry: MemoryEntry = {
      id: compressedId,
      type: "conversation",
      key: `conversation_summary:${sessionId}`,
      value: summary,
      importance: 0.8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: null,
      metadata: {
        tags: [`session:${sessionId}`, "compressed_summary"],
        originalEntriesCount: entries.length,
      },
    };

    // Store summary
    await this.provider.store(compressedEntry);

    // Delete compressed logs to free memory space
    for (const entry of entries) {
      await this.provider.delete(entry.id);
    }

    return compressedEntry;
  }

  /**
   * Consolidates episodic memories into a generalized semantic knowledge node.
   */
  async consolidateEpisodicToSemantic(): Promise<number> {
    const episodic = await this.provider.search({ type: "episodic" });
    if (episodic.length < 4) {
      return 0;
    }

    // Group episodic tasks by key
    const groups = new Map<string, MemoryEntry[]>();
    for (const entry of episodic) {
      const groupKey = entry.key.toLowerCase().trim();
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(entry);
    }

    let consolidatedCount = 0;
    for (const [key, entries] of groups.entries()) {
      if (entries.length >= 3) {
        // Summarize learnings from these episodes
        const summary =
          `Consolidated learnings from ${entries.length} executions: ` +
          entries.map((e) => e.value).join("; ");

        const semanticEntry: MemoryEntry = {
          id: `semantic-consolidated-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 5)}`,
          type: "semantic",
          key: `knowledge:${key}`,
          value: summary,
          importance: 0.75,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: null,
          metadata: { consolidatedFromCount: entries.length },
        };

        await this.provider.store(semanticEntry);

        // Delete original episodic events
        for (const e of entries) {
          await this.provider.delete(e.id);
        }
        consolidatedCount += entries.length;
      }
    }

    return consolidatedCount;
  }

  private summarizeText(text: string): string {
    const lines = text.split("\n");
    if (lines.length <= 3) {
      return text;
    }

    const head = lines.slice(0, 2).join(" ");
    const mid = `[Summarized ${lines.length - 4} messages in middle]`;
    const tail = lines.slice(-2).join(" ");
    return `${head} ... ${mid} ... ${tail}`;
  }
}
