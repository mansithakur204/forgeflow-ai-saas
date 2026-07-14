// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — In-Memory Execution Logger
// Append-only logger for preview-mode runs until backend persistence is added.
// ─────────────────────────────────────────────────────────────────────────────

import type { ExecutionLogEntry, ExecutionLogger, LogLevel } from "@/engine/types/logs";
import { RepositoryProvider } from "@/engine/repository/provider";
import type { IExecutionLogRepository } from "@/engine/repository/interfaces";

let logCounter = 0;

function nextLogId(): string {
  logCounter += 1;
  return `log-${logCounter}`;
}

export class InMemoryExecutionLogger implements ExecutionLogger {
  private readonly entries = new Map<string, ExecutionLogEntry[]>();
  private readonly logRepo: IExecutionLogRepository;
  private currentRunId: string | null = null;

  constructor(logRepo?: IExecutionLogRepository) {
    this.logRepo = logRepo ?? RepositoryProvider.getLogRepository();
  }

  bindRun(runId: string): void {
    this.currentRunId = runId;
    if (!this.entries.has(runId)) {
      this.entries.set(runId, []);
    }
  }

  unbindRun(): void {
    this.currentRunId = null;
  }

  debug(message: string, data?: Record<string, unknown>, nodeId?: string): void {
    this.append("debug", message, data, nodeId);
  }

  info(message: string, data?: Record<string, unknown>, nodeId?: string): void {
    this.append("info", message, data, nodeId);
  }

  warn(message: string, data?: Record<string, unknown>, nodeId?: string): void {
    this.append("warn", message, data, nodeId);
  }

  error(message: string, data?: Record<string, unknown>, nodeId?: string): void {
    this.append("error", message, data, nodeId);
  }

  getEntries(runId: string): ExecutionLogEntry[] {
    return [...(this.entries.get(runId) ?? [])];
  }

  private append(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    nodeId?: string
  ): void {
    const runId = this.currentRunId;
    if (!runId) return;

    const entry: ExecutionLogEntry = {
      id: nextLogId(),
      runId,
      nodeId,
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };

    // 1. Write to local cache for synchronous backward compatibility
    const existing = this.entries.get(runId) ?? [];
    existing.push(entry);
    this.entries.set(runId, existing);

    // 2. Persist asynchronously via execution log repository interface
    this.logRepo.save(entry).catch((err) => {
      console.error(`[InMemoryExecutionLogger] Failed to persist log entry ${entry.id}:`, err);
    });
  }
}

