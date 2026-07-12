import type { ToolConfig, ToolExecutionContext, ToolResult } from "./tool";

export interface ToolDiscoveryQuery {
  keywords?: string[];
  requiresNetwork?: boolean;
  requiresFileSystem?: boolean;
  requiresDatabase?: boolean;
  requiresAuthentication?: boolean;
  scopes?: string[];
}

export interface IToolSelectionStrategy {
  select(tools: ToolConfig[], query: ToolDiscoveryQuery): ToolConfig | null;
}

export interface ToolChainStep {
  id: string;
  toolId: string;
  parametersTemplate: Record<string, unknown>;
  dependencies: string[]; // Step IDs that must complete first
  timeoutMs?: number;
  maxRetries?: number;
}

export interface ToolChainConfig {
  steps: ToolChainStep[];
  executionMode: "sequential" | "parallel" | "hybrid";
}

export interface ToolChainResult {
  success: boolean;
  stepResults: Map<string, ToolResult>;
  aggregatedOutputs: Record<string, unknown>;
  error?: string | null;
}

export interface ToolExecutionMetrics {
  totalLatencyMs: number;
  successRate: number;
  retryCount: number;
  dataTransferredBytes: number;
  activeExecutions: number;
}

export type BeforeExecuteHook = (
  toolId: string,
  params: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<Record<string, unknown>> | Record<string, unknown>;

export type AfterExecuteHook = (
  toolId: string,
  params: Record<string, unknown>,
  result: ToolResult
) => Promise<ToolResult> | ToolResult;

export type ErrorHook = (
  toolId: string,
  params: Record<string, unknown>,
  error: Error
) => Promise<Error> | Error;

export interface ToolMiddleware {
  beforeExecute?: BeforeExecuteHook;
  afterExecute?: AfterExecuteHook;
  onError?: ErrorHook;
}
