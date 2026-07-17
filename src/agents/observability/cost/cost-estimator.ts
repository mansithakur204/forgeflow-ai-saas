// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Cost Estimator
// ─────────────────────────────────────────────────────────────────────────────

import type { ModelProvider } from "../types";

export interface ProviderRates {
  promptCostPerToken: number;
  completionCostPerToken: number;
}

export const PROVIDER_RATES: Record<ModelProvider, ProviderRates> = {
  openai: {
    promptCostPerToken: 0.0000025, // $2.50 per 1M tokens
    completionCostPerToken: 0.000010, // $10.00 per 1M tokens
  },
  gemini: {
    promptCostPerToken: 0.00000125, // $1.25 per 1M tokens
    completionCostPerToken: 0.000005, // $5.00 per 1M tokens
  },
  anthropic: {
    promptCostPerToken: 0.000003, // $3.00 per 1M tokens
    completionCostPerToken: 0.000015, // $15.00 per 1M tokens
  },
  azure_openai: {
    promptCostPerToken: 0.0000025, // $2.50 per 1M tokens
    completionCostPerToken: 0.000010, // $10.00 per 1M tokens
  },
  groq: {
    promptCostPerToken: 0.00000059, // $0.59 per 1M tokens
    completionCostPerToken: 0.00000079, // $0.79 per 1M tokens
  },
  local: {
    promptCostPerToken: 0.0,
    completionCostPerToken: 0.0,
  },
};

export class CostEstimator {
  /**
   * Estimate execution cost of a request based on provider and token usage counts.
   */
  static estimate(
    provider: ModelProvider,
    promptTokens: number,
    completionTokens: number
  ): number {
    const rates = PROVIDER_RATES[provider] || PROVIDER_RATES.local;
    const promptCost = promptTokens * rates.promptCostPerToken;
    const completionCost = completionTokens * rates.completionCostPerToken;
    return Number((promptCost + completionCost).toFixed(8));
  }
}
