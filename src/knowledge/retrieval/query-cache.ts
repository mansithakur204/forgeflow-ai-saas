import type { SearchRequest, SearchResponse } from "../types/query";

export class QueryCache {
  private cache = new Map<string, SearchResponse>();

  /**
   * Generates a request hash key mapping fields combinations.
   */
  private makeKey(request: SearchRequest): string {
    const filters = request.metadataFilter
      ? JSON.stringify(
          Object.keys(request.metadataFilter)
            .sort()
            .reduce((r, k) => ({ ...r, [k]: request.metadataFilter![k] }), {})
        )
      : "";
    return `${request.namespace ?? ""}:${request.collection ?? ""}:${request.minScore ?? 0}:${request.limit ?? 10}:${request.tokenBudget ?? 0}:${filters}:${request.queryText.toLowerCase().trim()}`;
  }

  /**
   * Resolves search results response mapping matching search key.
   */
  get(request: SearchRequest): SearchResponse | null {
    return this.cache.get(this.makeKey(request)) ?? null;
  }

  /**
   * Saves search results response mapping matching search key.
   */
  set(request: SearchRequest, response: SearchResponse): void {
    this.cache.set(this.makeKey(request), response);
  }

  /**
   * Clears query cache.
   */
  clear(): void {
    this.cache.clear();
  }
}
