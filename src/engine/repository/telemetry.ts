// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Telemetry Providers
// Extensible telemetry abstractions ready for OpenTelemetry / Azure Monitor.
// ─────────────────────────────────────────────────────────────────────────────

import type { ITelemetryProvider } from "./interfaces";

// ── NoOpTelemetryProvider (Default fallback) ─────────────────────────────────

export class NoOpTelemetryProvider implements ITelemetryProvider {
  trackEvent(name: string, properties?: Record<string, string>): void {}
  trackMetric(name: string, value: number, properties?: Record<string, string>): void {}
  trackException(
    error: Error,
    severity?: "INFO" | "WARNING" | "ERROR" | "CRITICAL",
    properties?: Record<string, string>
  ): void {}
  trackDependency(
    name: string,
    target: string,
    type: string,
    durationMs: number,
    success: boolean,
    properties?: Record<string, string>
  ): void {}
  trackTrace(
    message: string,
    level?: "VERBOSE" | "INFO" | "WARNING" | "ERROR",
    properties?: Record<string, string>
  ): void {}
  async flush(): Promise<void> {}
}

// ── ConsoleTelemetryProvider (Useful for local debugging) ────────────────────

export class ConsoleTelemetryProvider implements ITelemetryProvider {
  trackEvent(name: string, properties?: Record<string, string>): void {
    console.log(`[Telemetry Event] ${name}`, properties);
  }
  
  trackMetric(name: string, value: number, properties?: Record<string, string>): void {
    console.log(`[Telemetry Metric] ${name}: ${value}`, properties);
  }
  
  trackException(
    error: Error,
    severity?: "INFO" | "WARNING" | "ERROR" | "CRITICAL",
    properties?: Record<string, string>
  ): void {
    console.error(`[Telemetry Exception] [${severity ?? "ERROR"}] ${error.message}`, error, properties);
  }
  
  trackDependency(
    name: string,
    target: string,
    type: string,
    durationMs: number,
    success: boolean,
    properties?: Record<string, string>
  ): void {
    console.log(`[Telemetry Dependency] ${name} -> ${target} (${type}) took ${durationMs}ms, success=${success}`, properties);
  }
  
  trackTrace(
    message: string,
    level?: "VERBOSE" | "INFO" | "WARNING" | "ERROR",
    properties?: Record<string, string>
  ): void {
    console.log(`[Telemetry Trace] [${level ?? "INFO"}] ${message}`, properties);
  }

  async flush(): Promise<void> {
    console.log("[Telemetry] Flushed.");
  }
}
