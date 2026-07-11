import type { VectorSearchResult } from "../vector-store/vector-store.interface";
import type { Citation } from "../types/query";
import { TokenBudgetManager } from "./token-budget-manager";

export interface BuildContextResult {
  context: string;
  citations: Citation[];
  tokensUsed: number;
}

export class ContextBuilder {
  /**
   * Removes duplicate chunks based on ID key index.
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
   * Compiles search results into a clean context prompt block, checking token budgets.
   */
  buildContext(results: VectorSearchResult[], tokenBudget = 2000): BuildContextResult {
    const budgetManager = new TokenBudgetManager(tokenBudget);
    const uniqueResults = this.deduplicate(results);
    const citations: Citation[] = [];
    const contextBlocks: string[] = [];

    for (let i = 0; i < uniqueResults.length; i++) {
      const res = uniqueResults[i];
      const chunkId = res.record.id;
      const docId = res.record.documentId;
      const text = res.record.content;
      const score = res.score;
      const metadata = res.record.metadata;

      const textEstimate = budgetManager.estimateTokens(text);

      // Verify budget constraint
      if (!budgetManager.hasBudgetFor(textEstimate)) {
        continue; // Context compression: skip chunk if it exceeds budget limit
      }

      budgetManager.addTokens(textEstimate);

      contextBlocks.push(`[Source ${i + 1}] (Doc ID: ${docId}, Chunk ID: ${chunkId})\n${text}`);

      citations.push({
        chunkId,
        documentId: docId,
        content: text,
        score,
        metadata,
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
