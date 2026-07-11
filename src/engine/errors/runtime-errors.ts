// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Runtime Errors
// Typed errors for workflow runner and state machine operations.
// ─────────────────────────────────────────────────────────────────────────────

export type RuntimeErrorCode =
  | "RUN_NOT_FOUND"
  | "RUN_ALREADY_ACTIVE"
  | "INVALID_STATE_TRANSITION"
  | "RUN_TERMINATED"
  | "GRAPH_VALIDATION_FAILED";

export class RuntimeError extends Error {
  readonly code: RuntimeErrorCode;
  readonly runId?: string;
  readonly nodeId?: string;
  readonly details?: unknown;

  constructor(
    code: RuntimeErrorCode,
    message: string,
    options?: {
      runId?: string;
      nodeId?: string;
      details?: unknown;
    }
  ) {
    super(message);
    this.name = "RuntimeError";
    this.code = code;
    this.runId = options?.runId;
    this.nodeId = options?.nodeId;
    this.details = options?.details;
  }
}
