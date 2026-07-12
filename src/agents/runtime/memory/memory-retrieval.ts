import type { IMemoryProvider } from "./memory-provider.interface";
import type { MemoryEntry, MemorySearchQuery } from "../../types/memory";

export class MemoryRetrievalEngine {
  private provider: IMemoryProvider;

  constructor(provider: IMemoryProvider) {
    this.provider = provider;
  }

  /**
   * Scores importance dynamically (0.0 to 1.0) based on text content and key factors.
   */
  calculateImportance(key: string, value: string): number {
    const text = `${key} ${value}`.toLowerCase();
    let score = 0.15; // baseline

    // Keyword relevance boosts
    if (text.includes("error") || text.includes("fail") || text.includes("crash")) {
      score += 0.3;
    }
    if (text.includes("credential") || text.includes("secret") || text.includes("token")) {
      score += 0.25;
    }
    if (text.includes("success") || text.includes("complete") || text.includes("solved")) {
      score += 0.15;
    }
    if (text.includes("rule") || text.includes("policy") || text.includes("constraint")) {
      score += 0.2;
    }

    // Length boost
    score += Math.min(value.length / 2000, 0.1);

    return Math.min(score, 1.0);
  }

  /**
   * Retrieves memory entries ranked by a combined score of recency, relevance, and importance.
   */
  async retrieveRelevant(
    query: MemorySearchQuery,
    weights: { recency?: number; relevance?: number; importance?: number } = {}
  ): Promise<MemoryEntry[]> {
    const candidates = await this.provider.search(query);
    const now = Date.now();

    const wRec = weights.recency ?? 0.3;
    const wRel = weights.relevance ?? 0.4;
    const wImp = weights.importance ?? 0.3;

    const scored = candidates.map((entry) => {
      // 1. Recency Score: exponentially decays with time (half-life of 1 hour = 3600000 ms)
      const ageMs = now - new Date(entry.updatedAt).getTime();
      const recencyScore = Math.exp(-ageMs / 3600000);

      // 2. Relevance Score: simple keyword coverage
      let relevanceScore = 0;
      if (query.keywords && query.keywords.length > 0) {
        const text = `${entry.key} ${entry.value}`.toLowerCase();
        let matches = 0;
        for (const kw of query.keywords) {
          if (text.includes(kw.toLowerCase())) {
            matches++;
          }
        }
        relevanceScore = matches / query.keywords.length;
      } else {
        relevanceScore = 1.0; // neutral
      }

      // 3. Importance Score
      const importanceScore = entry.importance;

      const finalScore = wRec * recencyScore + wRel * relevanceScore + wImp * importanceScore;

      return {
        entry,
        score: finalScore,
      };
    });

    // Sort by final score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => s.entry);
  }

  /**
   * Purges all expired memory entries from the provider.
   */
  async purgeExpired(): Promise<number> {
    const all = await this.provider.search({ includeExpired: true });
    const now = Date.now();
    let count = 0;

    for (const entry of all) {
      if (entry.expiresAt && new Date(entry.expiresAt).getTime() < now) {
        await this.provider.delete(entry.id);
        count++;
      }
    }

    return count;
  }
}
