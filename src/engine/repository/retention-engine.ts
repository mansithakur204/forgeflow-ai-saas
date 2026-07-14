// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Retention Engine
// Orchestrates automatic and manual cleanup of execution history database logs.
// ─────────────────────────────────────────────────────────────────────────────

import { RepositoryProvider } from "./provider";
import type { RetentionConfig, RetentionMetrics } from "./interfaces";

export class RetentionEngine {
  private config: RetentionConfig;
  private timer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<RetentionConfig>) {
    this.config = {
      maxAgeDays: config?.maxAgeDays ?? 30,
      maxEntriesCount: config?.maxEntriesCount ?? 100_000,
      autoCleanupEnabled: config?.autoCleanupEnabled ?? false,
      archiveEnabled: config?.archiveEnabled ?? false,
    };

    if (this.config.autoCleanupEnabled) {
      this.startScheduler();
    }
  }

  /**
   * Gets the active retention policy configuration.
   */
  getConfig(): RetentionConfig {
    return { ...this.config };
  }

  /**
   * Sets/updates the retention configuration.
   */
  updateConfig(config: Partial<RetentionConfig>): void {
    this.config = { ...this.config, ...config };
    this.stopScheduler();
    if (this.config.autoCleanupEnabled) {
      this.startScheduler();
    }
  }

  /**
   * Triggers a manual cleanup across all active repositories immediately.
   */
  async cleanupNow(customConfig?: Partial<RetentionConfig>): Promise<{
    logs: RetentionMetrics;
    timeline: RetentionMetrics;
  }> {
    const activeConfig = customConfig
      ? { ...this.config, ...customConfig }
      : this.config;

    const logRepo = RepositoryProvider.getLogRepository();
    const timelineRepo = RepositoryProvider.getTimelineRepository();

    const [logMetrics, timelineMetrics] = await Promise.all([
      logRepo.applyRetentionPolicy(activeConfig),
      timelineRepo.applyRetentionPolicy(activeConfig),
    ]);

    return {
      logs: logMetrics,
      timeline: timelineMetrics,
    };
  }

  /**
   * Starts a background scheduler running cleanup at set intervals (defaults to 24 hours).
   */
  startScheduler(intervalMs = 24 * 60 * 60 * 1000): void {
    this.stopScheduler();
    this.timer = setInterval(async () => {
      try {
        await this.cleanupNow();
      } catch (err) {
        console.error("[RetentionEngine] Background cleanup failed:", err);
      }
    }, intervalMs);
  }

  /**
   * Stops the background scheduler.
   */
  stopScheduler(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
