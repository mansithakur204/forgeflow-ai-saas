// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Timeline Collector
// Implements ExecutionLogger and simultaneously writes structured TimelineEntry
// objects to the TimelineService. Wraps InMemoryExecutionLogger for full
// backward compatibility — existing LogsPanel continues to work unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import type { ExecutionLogEntry, ExecutionLogger, LogLevel } from "@/engine/types/logs";
import type {
  TimelineEntryStatus,
  TimelineEventType,
  TimelineLogLevel,
} from "@/engine/types/timeline-types";
import { InMemoryExecutionLogger } from "@/engine/logging/in-memory-logger";
import { TimelineService } from "@/engine/logging/timeline-service";

// ── Level Mapping ────────────────────────────────────────────────────────────

const LOG_LEVEL_TO_TIMELINE: Record<LogLevel, TimelineLogLevel> = {
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
};

// ── Event Type Detection ─────────────────────────────────────────────────────

/**
 * Auto-detects a structured TimelineEventType from the message text and
 * attached data. Falls back to CUSTOM_EVENT when no pattern matches.
 */
function detectEventType(
  message: string,
  data?: Record<string, unknown>
): TimelineEventType {
  const lower = message.toLowerCase();

  // Workflow lifecycle
  if (lower.includes("workflow execution started")) return "WORKFLOW_STARTED";
  if (lower.includes("workflow execution finished") || lower.includes("workflow execution completed")) {
    const success = data?.success;
    if (success === false) return "WORKFLOW_FAILED";
    return "WORKFLOW_COMPLETED";
  }
  if (lower.includes("workflow execution crashed")) return "WORKFLOW_FAILED";
  if (lower.includes("cancel requested")) return "WORKFLOW_CANCELLED";

  // Node lifecycle
  if (lower.includes("execution started") && !lower.includes("workflow")) return "NODE_STARTED";
  if (lower.includes("executed successfully")) return "NODE_COMPLETED";
  if (lower.includes("execution failed") && !lower.includes("workflow")) return "NODE_FAILED";
  if (lower.includes("skipped")) return "NODE_SKIPPED";

  // AI events (from LlmExecutionManager event data)
  if (data?.event === "AI_REQUEST_STARTED") return "AI_REQUEST_STARTED";
  if (data?.event === "AI_RESPONSE_RECEIVED") return "AI_RESPONSE_RECEIVED";
  if (data?.event === "AI_RETRY") return "AI_RETRY";
  if (data?.event === "AI_TIMEOUT") return "AI_TIMEOUT";

  // HTTP events
  if (lower.includes("http request")) return "HTTP_REQUEST";
  if (lower.includes("http response")) return "HTTP_RESPONSE";

  // Webhook events
  if (lower.includes("webhook")) return "WEBHOOK_RECEIVED";

  return "CUSTOM_EVENT";
}

/**
 * Infers a TimelineEntryStatus from the detected event type.
 */
function inferStatus(eventType: TimelineEventType): TimelineEntryStatus {
  switch (eventType) {
    case "WORKFLOW_STARTED":
    case "NODE_STARTED":
    case "AI_REQUEST_STARTED":
    case "HTTP_REQUEST":
      return "running";
    case "WORKFLOW_COMPLETED":
    case "NODE_COMPLETED":
    case "AI_RESPONSE_RECEIVED":
    case "HTTP_RESPONSE":
    case "WEBHOOK_RECEIVED":
      return "completed";
    case "WORKFLOW_FAILED":
    case "NODE_FAILED":
    case "AI_TIMEOUT":
      return "failed";
    case "NODE_SKIPPED":
    case "WORKFLOW_CANCELLED":
      return "skipped";
    case "AI_RETRY":
      return "pending";
    case "CUSTOM_EVENT":
      return "running";
  }
}

// ── Timeline Collector ───────────────────────────────────────────────────────

export class TimelineCollector implements ExecutionLogger {
  private readonly legacyLogger: InMemoryExecutionLogger;
  private readonly timeline: TimelineService;
  private readonly workflowId: string;
  private currentRunId: string | null = null;

  constructor(workflowId: string, timeline?: TimelineService) {
    this.workflowId = workflowId;
    this.legacyLogger = new InMemoryExecutionLogger();
    this.timeline = timeline ?? new TimelineService();
  }

  /** Get the underlying TimelineService for direct queries. */
  getTimelineService(): TimelineService {
    return this.timeline;
  }

  bindRun(runId: string): void {
    this.currentRunId = runId;
    this.legacyLogger.bindRun(runId);
  }

  unbindRun(): void {
    this.currentRunId = null;
    this.legacyLogger.unbindRun();
  }

  debug(message: string, data?: Record<string, unknown>, nodeId?: string): void {
    this.legacyLogger.debug(message, data, nodeId);
    this.recordTimeline("debug", message, data, nodeId);
  }

  info(message: string, data?: Record<string, unknown>, nodeId?: string): void {
    this.legacyLogger.info(message, data, nodeId);
    this.recordTimeline("info", message, data, nodeId);
  }

  warn(message: string, data?: Record<string, unknown>, nodeId?: string): void {
    this.legacyLogger.warn(message, data, nodeId);
    this.recordTimeline("warn", message, data, nodeId);
  }

  error(message: string, data?: Record<string, unknown>, nodeId?: string): void {
    this.legacyLogger.error(message, data, nodeId);
    this.recordTimeline("error", message, data, nodeId);
  }

  getEntries(runId: string): ExecutionLogEntry[] {
    return this.legacyLogger.getEntries(runId);
  }

  /**
   * Get structured timeline entries for a specific run.
   */
  getTimelineEntries(runId: string) {
    return this.timeline.getEntries(runId);
  }

  /**
   * Get timeline entries grouped by node for a specific run.
   */
  getTimelineGroupedByNode(runId: string) {
    return this.timeline.getGroupedByNode(runId);
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private recordTimeline(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    nodeId?: string
  ): void {
    const executionId = this.currentRunId;
    if (!executionId) return;

    const eventType = detectEventType(message, data);
    const timelineLevel = this.resolveTimelineLevel(level, data);
    const status = inferStatus(eventType);

    this.timeline.record({
      workflowId: this.workflowId,
      executionId,
      nodeId: nodeId ?? null,
      level: timelineLevel,
      eventType,
      message,
      status,
      durationMs: typeof data?.durationMs === "number" ? data.durationMs : null,
      metadata: data ?? {},
    });
  }

  /**
   * Maps the base LogLevel to TimelineLogLevel, promoting to SUCCESS
   * when the data bag contains `{ success: true }`.
   */
  private resolveTimelineLevel(
    level: LogLevel,
    data?: Record<string, unknown>
  ): TimelineLogLevel {
    if (level === "info" && data?.success === true) {
      return "SUCCESS";
    }
    return LOG_LEVEL_TO_TIMELINE[level];
  }
}
