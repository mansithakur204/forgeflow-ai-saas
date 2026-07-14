// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Integration Test Harness
// Test utility to validate rate limiting, failure rates, and timeout simulation.
// ─────────────────────────────────────────────────────────────────────────────

import {
  IntegrationRateLimiter,
  IntegrationTimeoutManager,
  IntegrationErrorMapper,
} from "@/engine/executors/base/integration-sdk";

export interface TestHarnessProviderConfig {
  name: string;
  simulateFailureRate?: number; // float 0 to 1
  simulateTimeout?: boolean;
  simulateRateLimit?: boolean;
  rateLimitRetryAfterSeconds?: number;
  fixedLatencyMs?: number;
}

export interface TestHarnessRunResult {
  success: boolean;
  durationMs: number;
  attempts: number;
  errorMessage: string | null;
  errorCode: string | null;
  retryable: boolean;
  bucketKey: string;
}

export class IntegrationTestHarness {
  private readonly config: TestHarnessProviderConfig;

  constructor(config: TestHarnessProviderConfig) {
    this.config = {
      simulateFailureRate: 0,
      simulateTimeout: false,
      simulateRateLimit: false,
      rateLimitRetryAfterSeconds: 2,
      fixedLatencyMs: 50,
      ...config,
    };
  }

  /**
   * Simulates running a provider operation through SDK wrapper logic to inspect behavior.
   */
  async runOperation(
    bucketKey: string,
    operationFn: () => Promise<string>,
    timeoutMs = 1000,
    logger: any = { info: () => {}, error: () => {} },
    nodeId = "test-node"
  ): Promise<TestHarnessRunResult> {
    const startedAt = Date.now();
    let attempts = 0;
    let success = false;
    let errorMessage: string | null = null;
    let errorCode: string | null = null;
    let retryable = false;

    // Check rate limits pre-emptively using the rate limiter SDK
    await IntegrationRateLimiter.checkAndDelay(bucketKey, logger, nodeId);

    attempts += 1;

    try {
      // Simulate network request using IntegrationTimeoutManager
      const response = await IntegrationTimeoutManager.runWithTimeout(
        this.simulateProviderNetworkCall(operationFn),
        timeoutMs,
        `Operation on ${this.config.name} timed out`
      );

      // Successfully finished call: update bucket state
      IntegrationRateLimiter.updateBucket(bucketKey, 5, Date.now() + 5000);
      success = true;

    } catch (err: any) {
      errorMessage = err.message;
      success = false;

      // Map structured errors using IntegrationErrorMapper
      const mapped = IntegrationErrorMapper.mapToExecutorError(err, `${this.config.name.toUpperCase()}_API_ERROR`);
      errorCode = mapped.code;
      retryable = mapped.retryable;

      if (mapped.code === "INTEGRATION_RATE_LIMITED") {
        IntegrationRateLimiter.register429(bucketKey, this.config.rateLimitRetryAfterSeconds ?? 2);
      }
    }

    return {
      success,
      durationMs: Date.now() - startedAt,
      attempts,
      errorMessage,
      errorCode,
      retryable,
      bucketKey,
    };
  }

  /**
   * Internal simulation of network latency, rate limits, timeouts, and failures.
   */
  private async simulateProviderNetworkCall(operationFn: () => Promise<string>): Promise<string> {
    // 1. Simulate Latency
    if (this.config.fixedLatencyMs && this.config.fixedLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.fixedLatencyMs));
    }

    // 2. Simulate Timeout (by hanging indefinitely)
    if (this.config.simulateTimeout) {
      await new Promise(() => {}); // hanging
    }

    // 3. Simulate Rate Limit (429)
    if (this.config.simulateRateLimit) {
      const error: any = new Error("Rate limit exceeded");
      error.status = 429;
      error.retryAfter = this.config.rateLimitRetryAfterSeconds;
      throw error;
    }

    // 4. Simulate Failure Rate
    if (this.config.simulateFailureRate && this.config.simulateFailureRate > 0) {
      if (Math.random() < this.config.simulateFailureRate) {
        throw new Error("Transient connection handshake failed");
      }
    }

    return await operationFn();
  }
}
