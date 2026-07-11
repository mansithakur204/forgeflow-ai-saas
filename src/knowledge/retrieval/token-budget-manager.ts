export class TokenBudgetManager {
  private maxTokens: number;
  private currentTokens = 0;

  constructor(maxTokens = 4096) {
    this.maxTokens = maxTokens;
  }

  /**
   * Estimates tokens based on text word metrics (word count * 1.3).
   */
  estimateTokens(text: string): number {
    const cleanText = text.trim();
    if (cleanText === "") return 0;
    const wordCount = cleanText.split(/\s+/).length;
    return Math.ceil(wordCount * 1.3);
  }

  /**
   * Asserts whether adding the token count will keep budget under maximum configured bounds.
   */
  hasBudgetFor(tokensCount: number): boolean {
    return this.currentTokens + tokensCount <= this.maxTokens;
  }

  /**
   * Consumes token budget allocations. Throws if bound is exceeded.
   */
  addTokens(tokensCount: number): void {
    if (!this.hasBudgetFor(tokensCount)) {
      throw new Error(
        `Token budget limit exceeded: Max: ${this.maxTokens}, attempted to add ${tokensCount} when current is ${this.currentTokens}`
      );
    }
    this.currentTokens += tokensCount;
  }

  getUsedTokens(): number {
    return this.currentTokens;
  }

  getMaxTokens(): number {
    return this.maxTokens;
  }
}
