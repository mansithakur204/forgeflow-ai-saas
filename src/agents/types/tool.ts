export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
}

export interface ToolCapability {
  requiresNetwork: boolean;
  requiresFileSystem: boolean;
  requiresDatabase: boolean;
  requiresAuthentication: boolean;
}

export interface ToolPermission {
  scopes: string[];
  allowedUsers?: string[];
  requiresApproval: boolean;
}

export interface ToolConfig {
  metadata: ToolMetadata;
  capability: ToolCapability;
  permission: ToolPermission;
  schema?: Record<string, unknown>; // JSON Schema defining parameters requirements
}

export interface ToolExecutionContext {
  userId: string;
  sessionId: string;
  variables: Record<string, unknown>;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface ToolResult {
  toolId: string;
  success: boolean;
  output: string;
  error?: string | null;
  metrics: ToolDiagnostics;
}

export interface ToolDiagnostics {
  startTime: string;
  endTime?: string;
  executionTimeMs: number;
  retriesAttempted: number;
  dataTransferredBytes: number;
}

// ── Tool Agent Domain Typings ────────────────────────────────────────────────

export type ToolExecutionStatus =
  | "idle"
  | "validating"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface ToolConfiguration {
  allowedTools?: string[];
  deniedTools?: string[];
  requireApproval?: boolean;
  timeoutMs?: number;
  maxMemoryBytes?: number;
}

export interface ToolExecutionResult {
  toolId: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
  retries: number;
  executorUsed: string;
  status: ToolExecutionStatus;
}
