// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Context Builder Service
// Merges, deduplicates, orders and constructs LLM prompt contexts.
// ─────────────────────────────────────────────────────────────────────────────

import type { VectorSearchResult } from "../vector-store/vector-store.interface";
import type { Citation } from "../types/query";
import { TokenBudgetManager } from "./token-budget-manager";

export interface BuildContextResult {
  context: string;
  citations: Citation[];
  tokensUsed: number;
}

export type ContextOrderingType = "similarity" | "index";

export interface ContextBuilderOptions {
  tokenBudget?: number;
  ordering?: ContextOrderingType;
}

export class ContextBuilder {
  /**
   * Removes duplicate chunks based on their ID key.
   */
  deduplicate(results: VectorSearchResult[]): VectorSearchResult[] {
    const seen = new Set<string>();
    return results.filter((res) => {
      const key = res.record.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Orders chunks by similarity score or chunk index.
   */
  orderChunks(results: VectorSearchResult[], ordering: ContextOrderingType = "similarity"): VectorSearchResult[] {
    const sorted = [...results];
    if (ordering === "similarity") {
      return sorted.sort((a, b) => b.score - a.score);
    } else if (ordering === "index") {
      return sorted.sort((a, b) => {
        const indexA = (a.record.metadata?.index as number) ?? 0;
        const indexB = (b.record.metadata?.index as number) ?? 0;
        return indexA - indexB;
      });
    }
    return sorted;
  }

  /**
   * Compiles search results into a clean context prompt block, keeping track of token usage.
   */
  buildContext(results: VectorSearchResult[], options: ContextBuilderOptions = {}): BuildContextResult {
    const tokenBudget = options.tokenBudget ?? 2000;
    const ordering = options.ordering ?? "similarity";

    const budgetManager = new TokenBudgetManager(tokenBudget);
    const uniqueResults = this.deduplicate(results);
    const orderedResults = this.orderChunks(uniqueResults, ordering);

    const citations: Citation[] = [];
    const contextBlocks: string[] = [];

    for (let i = 0; i < orderedResults.length; i++) {
      const res = orderedResults[i];
      const chunkId = res.record.id;
      const docId = res.record.documentId;
      const text = res.record.content;
      const score = res.score;
      const metadata = res.record.metadata;

      const textEstimate = budgetManager.estimateTokens(text);

      if (!budgetManager.hasBudgetFor(textEstimate)) {
        continue;
      }

      budgetManager.addTokens(textEstimate);

      contextBlocks.push(`[Source ${i + 1}] (Doc ID: ${docId}, Chunk ID: ${chunkId})\n${text}`);

      citations.push({
        chunkId,
        documentId: docId,
        content: text,
        score,
        metadata: {
          ...metadata,
          source: (metadata?.source as string) ?? "unknown",
          section: (metadata?.headingPath as string) ?? (metadata?.header as string) ?? "Root",
        },
      });
    }

    const context = contextBlocks.join("\n\n---\n\n");

    return {
      context,
      citations,
      tokensUsed: budgetManager.getUsedTokens(),
    };
  }
}
