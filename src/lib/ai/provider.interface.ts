// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — LLM Provider Contract Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface LlmRequest {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}

export interface LlmResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  raw: unknown;
}

export interface LlmCapabilities {
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsImages: boolean;
  supportsFunctionCalling: boolean;
}

export interface ILlmProvider {
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: LlmCapabilities;
  
  validateConfig(): { valid: boolean; error?: string };
  generate(request: LlmRequest, options?: { signal?: AbortSignal }): Promise<LlmResponse>;
  generateStream(request: LlmRequest, options?: { signal?: AbortSignal }): Promise<ReadableStream<string>>;
}

export interface LlmExecutionMetrics {
  startTime: string;
  endTime: string;
  durationMs: number;
  providerName: string;
  modelName: string;
  success: boolean;
  retryCount: number;
  error?: string;
}

export type LlmErrorCode =
  | "INVALID_API_KEY"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "UNKNOWN_ERROR";

export class LlmExecutionError extends Error {
  readonly code: LlmErrorCode;
  readonly retryable: boolean;
  readonly originalError?: any;

  constructor(code: LlmErrorCode, message: string, retryable: boolean, originalError?: any) {
    super(message);
    this.name = "LlmExecutionError";
    this.code = code;
    this.retryable = retryable;
    this.originalError = originalError;
  }
}
