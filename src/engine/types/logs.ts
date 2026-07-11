// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Execution Log Types
// ─────────────────────────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ExecutionLogEntry {
  id: string;
  runId: string;
  nodeId?: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
  durationMs?: number;
}

export interface ExecutionLogger {
  bindRun(runId: string): void;
  unbindRun(): void;
  debug(message: string, data?: Record<string, unknown>, nodeId?: string): void;
  info(message: string, data?: Record<string, unknown>, nodeId?: string): void;
  warn(message: string, data?: Record<string, unknown>, nodeId?: string): void;
  error(message: string, data?: Record<string, unknown>, nodeId?: string): void;
  getEntries(runId: string): ExecutionLogEntry[];
}
