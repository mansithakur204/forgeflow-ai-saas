// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Shared Integration SDK
// Centralized reusable abstractions for production integration executors.
// Handles Connection management, Authentication, Rate limiting, Health, and Telemetry.
// ─────────────────────────────────────────────────────────────────────────────

import { failureResult } from "@/engine/executors/base/executor-result";
import type { ExecutorErrorDetail, ExecutorExecutionResult } from "@/engine/types/executor";

// ── 1. Telemetry Adapter (Task 13.7E) ─────────────────────────────────────────

export type IntegrationTelemetryEvent =
  | "INTEGRATION_CONNECTED"
  | "INTEGRATION_HEALTHY"
  | "INTEGRATION_DEGRADED"
  | "INTEGRATION_FAILED"
  | "INTEGRATION_RECOVERED";

export class IntegrationTelemetryAdapter {
  constructor(private readonly logger: any, private readonly nodeId: string) {}

  emit(event: IntegrationTelemetryEvent, properties?: Record<string, unknown>): void {
    const logMsg = `[Integration Telemetry] ${event}`;
    const payload = { event, ...properties };

    if (event === "INTEGRATION_FAILED") {
      this.logger.error(logMsg, payload, this.nodeId);
    } else {
      this.logger.info(logMsg, payload, this.nodeId);
    }
  }
}

// ── 2. Connection Manager & Health Checker (Task 13.7A, B, C) ─────────────────

export type IntegrationHealthStatus = "healthy" | "degraded" | "failed" | "recovered";

export interface IntegrationConnectionState {
  providerId: string;
  workspaceId?: string;
  status: IntegrationHealthStatus;
  lastSuccessfulOperationAt?: string;
  failureCounter: number;
  successCounter: number;
}

export class IntegrationConnectionManager {
  private static readonly connections = new Map<string, IntegrationConnectionState>();

  /**
   * Resolves or initializes the connection state.
   */
  static getOrCreateConnection(providerId: string, workspaceId = "global"): IntegrationConnectionState {
    const key = `${providerId}:${workspaceId}`;
    let state = this.connections.get(key);
    if (!state) {
      state = {
        providerId,
        workspaceId,
        status: "healthy",
        failureCounter: 0,
        successCounter: 0,
      };
      this.connections.set(key, state);
    }
    return state;
  }

  /**
   * Records a successful operation, triggering health transition to healthy/recovered if appropriate.
   */
  static recordSuccess(providerId: string, workspaceId = "global", telemetry?: IntegrationTelemetryAdapter): void {
    const key = `${providerId}:${workspaceId}`;
    const state = this.connections.get(key);
    if (state) {
      state.successCounter += 1;
      state.lastSuccessfulOperationAt = new Date().toISOString();

      const oldStatus = state.status;
      if (oldStatus === "failed" || oldStatus === "degraded") {
        state.status = "recovered";
        state.failureCounter = 0;
        if (telemetry) {
          telemetry.emit("INTEGRATION_RECOVERED", { providerId, workspaceId, oldStatus });
          telemetry.emit("INTEGRATION_HEALTHY", { providerId, workspaceId });
        }
      } else {
        state.status = "healthy";
      }
    }
  }

  /**
   * Records a failed operation, updating counters and checking if health is degraded or failed.
   */
  static recordFailure(
    providerId: string,
    workspaceId = "global",
    isTransient: boolean,
    telemetry?: IntegrationTelemetryAdapter
  ): void {
    const key = `${providerId}:${workspaceId}`;
    const state = this.connections.get(key);
    if (state) {
      state.failureCounter += 1;

      const oldStatus = state.status;
      if (isTransient) {
        state.status = "degraded";
        if (telemetry && oldStatus !== "degraded") {
          telemetry.emit("INTEGRATION_DEGRADED", { providerId, workspaceId, reason: "Transient rate-limiting/429" });
        }
      } else {
        state.status = "failed";
        if (telemetry && oldStatus !== "failed") {
          telemetry.emit("INTEGRATION_FAILED", { providerId, workspaceId, reason: "Persistent connection/auth error" });
        }
      }
    }
  }

  /**
   * Performs connection test simulation.
   */
  static async testConnectivity(providerId: string, checkFn: () => Promise<boolean>): Promise<boolean> {
    try {
      return await checkFn();
    } catch {
      return false;
    }
  }
}

// ── 3. Authentication Manager (Task 13.7B) ────────────────────────────────────

export class IntegrationAuthenticationManager {
  /**
   * Centralized env/secrets loader.
   */
  static loadSecret(secretName: string): string | undefined {
    return process.env[secretName];
  }

  /**
   * Enforces specific prefix rules for tokens (Slack Bot, Notion Integration, etc.).
   */
  static validateTokenPrefix(token: string, prefix: string): boolean {
    return token.startsWith(prefix);
  }

  /**
   * Enforces standard Snowflake formats.
   */
  static validateSnowflake(id: string): boolean {
    return /^\d{17,20}$/.test(id);
  }

  /**
   * Enforces standard UUID format (with or without dashes).
   */
  static validateUUID(id: string): boolean {
    return /^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/.test(id);
  }
}

// ── 4. Rate Limiter (Task 13.7A) ──────────────────────────────────────────────

export interface RateLimitBucket {
  remaining: number;
  resetTime: number;
}

export class IntegrationRateLimiter {
  private static readonly buckets = new Map<string, RateLimitBucket>();

  /**
   * Pre-emptive rate limit bucket check. Delays thread if bucket has 0 requests.
   */
  static async checkAndDelay(
    bucketKey: string,
    logger: any,
    nodeId: string,
    onDelay?: (ms: number) => void
  ): Promise<void> {
    const bucket = this.buckets.get(bucketKey);
    if (bucket && bucket.remaining === 0 && Date.now() < bucket.resetTime) {
      const waitMs = bucket.resetTime - Date.now();
      logger.info(
        `Rate limit bucket active for "${bucketKey}". SDK pausing execution for ${waitMs}ms.`,
        { event: "CUSTOM_EVENT", bucketKey, waitMs },
        nodeId
      );
      if (onDelay) onDelay(waitMs);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  /**
   * Update bucket state after a successful or rate limited call.
   */
  static updateBucket(bucketKey: string, remaining: number, resetTimeMs: number): void {
    this.buckets.set(bucketKey, { remaining, resetTime: resetTimeMs });
  }

  /**
   * Registers a 429 response rate-limiting bucket block.
   */
  static register429(bucketKey: string, retryAfterSeconds: number): void {
    this.buckets.set(bucketKey, {
      remaining: 0,
      resetTime: Date.now() + retryAfterSeconds * 1000,
    });
  }
}

// ── 5. Timeout Manager (Task 13.7A) ───────────────────────────────────────────

export class IntegrationTimeoutManager {
  /**
   * Wraps an execution promise inside a timeout constraints promise.
   */
  static async runWithTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage = "Request timed out"): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    );
    return Promise.race([promise, timeoutPromise]);
  }
}

// ── 6. Structured Error Mapper (Task 13.7A) ───────────────────────────────────

export class IntegrationErrorMapper {
  /**
   * Maps third-party API or network failures into a unified executor error response.
   */
  static mapToExecutorError(error: any, defaultCode: string): ExecutorErrorDetail {
    const isRateLimited = error?.status === 429 || error?.message?.toLowerCase().includes("rate limit") || error?.code === "DISCORD_RATE_LIMITED" || error?.code === "NOTION_RATE_LIMITED";
    const code = isRateLimited ? "INTEGRATION_RATE_LIMITED" : error?.code || defaultCode;
    const message = error.message || "An unexpected integration error occurred";
    const retryable = isRateLimited || error?.retryable !== false;

    return {
      code,
      message,
      retryable,
      details: error?.details || { status: error?.status, retryAfter: error?.retryAfter },
    };
  }
}
