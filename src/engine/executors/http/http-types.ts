// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — HTTP Executor Types
// Future-ready contracts for REST integration without networking dependencies.
// ─────────────────────────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

export type HttpAuthType = "none" | "basic" | "bearer" | "api_key" | "oauth2";

export interface HttpAuthConfig {
  type: HttpAuthType;
  username?: string;
  password?: string;
  token?: string;
  headerName?: string;
  apiKey?: string;
  oauth2TokenUrl?: string;
}

export interface HttpRetryConfig {
  enabled: boolean;
  maxAttempts: number;
  retryOnStatusCodes: readonly number[];
}

export interface HttpTimeoutConfig {
  connectMs: number;
  requestMs: number;
}

export interface HttpStreamingConfig {
  enabled: boolean;
  chunkEventPort?: string;
}

export interface HttpRequestConfig {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
  body?: unknown;
  auth?: HttpAuthConfig;
  retry?: HttpRetryConfig;
  timeout?: HttpTimeoutConfig;
  streaming?: HttpStreamingConfig;
}

export interface HttpResponseMetadata {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  durationMs: number;
  mock: boolean;
  method: HttpMethod;
  url: string;
}

export interface HttpExecutorOutput {
  response: unknown;
  metadata: HttpResponseMetadata;
}

export interface HttpStreamChunk {
  index: number;
  data: string;
  done: boolean;
}

export interface HttpStreamResult {
  chunks: readonly HttpStreamChunk[];
  aggregated: string;
}

export const DEFAULT_HTTP_TIMEOUT: HttpTimeoutConfig = {
  connectMs: 5000,
  requestMs: 30000,
};

export const DEFAULT_HTTP_RETRY: HttpRetryConfig = {
  enabled: false,
  maxAttempts: 3,
  retryOnStatusCodes: [408, 429, 500, 502, 503, 504],
};
