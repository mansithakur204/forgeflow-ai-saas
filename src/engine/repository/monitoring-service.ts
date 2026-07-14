// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Repository Monitoring Service
// Keeps rolling metric logs, monitors database health pings, and raises alerts.
// ─────────────────────────────────────────────────────────────────────────────

import { RepositoryProvider } from "./provider";
import type { RepositoryMonitorState } from "./interfaces";

export class RepositoryMonitoringService {
  private static latencyHistory: number[] = [];
  private static errorCount = 0;
  private static lastHealthCheckTimestamp: string | null = null;
  private static status: "healthy" | "unhealthy" | "unknown" = "unknown";

  /**
   * Records execution of a repository action, logging latency and status flags.
   */
  static recordOperation(operation: string, latencyMs: number, isError: boolean): void {
    const telemetry = RepositoryProvider.getTelemetryProvider();
    const provider = RepositoryProvider.getActiveProviderName();

    // 1. Maintain local rolling latency log
    this.latencyHistory.push(latencyMs);
    if (this.latencyHistory.length > 100) {
      this.latencyHistory.shift();
    }

    if (isError) {
      this.errorCount++;
      this.status = "unhealthy";
    }

    // 2. Track telemetry metric
    telemetry.trackMetric(`repository.${operation.toLowerCase()}.latency`, latencyMs, { provider });
    
    // 3. Estimate memory consumption based on stats length
    const statsMemoryBytes = this.latencyHistory.length * 8; // estimation
    telemetry.trackMetric("repository.monitoring.memory_bytes", statsMemoryBytes, { provider });
  }

  /**
   * Tests the connection of the current log and timeline database engines.
   */
  static async checkHealth(): Promise<RepositoryMonitorState> {
    const telemetry = RepositoryProvider.getTelemetryProvider();
    const logRepo = RepositoryProvider.getLogRepository();
    const timelineRepo = RepositoryProvider.getTimelineRepository();
    const provider = RepositoryProvider.getActiveProviderName();
    
    this.lastHealthCheckTimestamp = new Date().toISOString();
    
    try {
      await Promise.all([logRepo.ping(), timelineRepo.ping()]);
      this.status = "healthy";
      
      telemetry.trackEvent("Repository.Healthy", {
        provider,
        timestamp: this.lastHealthCheckTimestamp,
      });
    } catch (err: any) {
      this.status = "unhealthy";
      this.errorCount++;
      
      telemetry.trackException(err, "CRITICAL", {
        op: "HealthCheck",
        provider,
      });
      
      telemetry.trackEvent("Repository.Failed", {
        provider,
        errorMessage: err.message,
      });
    }

    return this.getState();
  }

  /**
   * Emits structural life-cycle logging alerts to telemetry streams.
   */
  static emitEvent(
    event:
      | "Repository Started"
      | "Repository Healthy"
      | "Repository Failed"
      | "Cleanup Started"
      | "Cleanup Completed"
      | "Search Executed"
      | "Batch Saved"
      | "Batch Updated",
    properties?: Record<string, string>
  ): void {
    const telemetry = RepositoryProvider.getTelemetryProvider();
    const provider = RepositoryProvider.getActiveProviderName();

    telemetry.trackEvent(event, {
      ...properties,
      provider,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Compiles the current aggregated state metric logs.
   */
  static getState(): RepositoryMonitorState {
    const totalLatency = this.latencyHistory.reduce((acc, v) => acc + v, 0);
    const avgLatency = this.latencyHistory.length > 0 ? totalLatency / this.latencyHistory.length : 0;

    return {
      currentProvider: RepositoryProvider.getActiveProviderName(),
      repositoryStatus: this.status,
      lastHealthCheck: this.lastHealthCheckTimestamp,
      averageLatencyMs: Math.round(avgLatency * 100) / 100,
      errorCount: this.errorCount,
    };
  }

  /**
   * Resets counts and rolling stats (useful in testing bounds).
   */
  static resetStats(): void {
    this.latencyHistory = [];
    this.errorCount = 0;
    this.status = "healthy";
  }
}
