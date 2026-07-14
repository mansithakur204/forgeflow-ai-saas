// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — LLM Environment & Runtime Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface AiConfig {
  googleApiKey?: string;
  openaiApiKey?: string;
  defaultProvider: "gemini" | "openai" | "mock";
  // Centralized runtime parameters
  retryCount: number;
  retryDelay: number;
  timeout: number;
  defaultModel: {
    openai: string;
    gemini: string;
    mock: string;
  };
}

function getEnvProvider(val?: string): "gemini" | "openai" | "mock" {
  if (val === "gemini" || val === "openai" || val === "mock") {
    return val;
  }
  return "mock";
}

function getEnvNumber(val?: string, defaultVal: number = 0): number {
  if (!val) return defaultVal;
  const num = parseInt(val, 10);
  return isNaN(num) ? defaultVal : num;
}

export const aiConfig: AiConfig = {
  googleApiKey: process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  defaultProvider: getEnvProvider(process.env.DEFAULT_LLM_PROVIDER || process.env.NEXT_PUBLIC_DEFAULT_LLM_PROVIDER),
  
  retryCount: getEnvNumber(process.env.AI_RETRY_COUNT || process.env.NEXT_PUBLIC_AI_RETRY_COUNT, 3),
  retryDelay: getEnvNumber(process.env.AI_RETRY_DELAY || process.env.NEXT_PUBLIC_AI_RETRY_DELAY, 1000), // in ms
  timeout: getEnvNumber(process.env.AI_TIMEOUT || process.env.NEXT_PUBLIC_AI_TIMEOUT, 30000), // in ms
  
  defaultModel: {
    openai: process.env.OPENAI_DEFAULT_MODEL || process.env.NEXT_PUBLIC_OPENAI_DEFAULT_MODEL || "gpt-4o-mini",
    gemini: process.env.GEMINI_DEFAULT_MODEL || process.env.NEXT_PUBLIC_GEMINI_DEFAULT_MODEL || "gemini-1.5-flash",
    mock: "mock-model",
  },
};

export function validateProviderConfig(providerId: string): { valid: boolean; error?: string } {
  if (providerId === "gemini") {
    if (!aiConfig.googleApiKey) {
      return { valid: false, error: "GOOGLE_API_KEY environment variable is missing" };
    }
  } else if (providerId === "openai") {
    if (!aiConfig.openaiApiKey) {
      return { valid: false, error: "OPENAI_API_KEY environment variable is missing" };
    }
  }
  return { valid: true };
}
