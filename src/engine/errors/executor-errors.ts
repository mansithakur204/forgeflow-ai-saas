// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Executor Errors
// Typed errors for registry and executor operations.
// ─────────────────────────────────────────────────────────────────────────────

export type ExecutorErrorCode =
  | "EXECUTOR_ALREADY_REGISTERED"
  | "EXECUTOR_NOT_FOUND"
  | "EXECUTOR_VALIDATION_FAILED"
  | "EXECUTOR_EXECUTION_FAILED"
  | "EXECUTOR_CANCELLED"
  | "EXECUTOR_CONFIG_INVALID";

export class ExecutorError extends Error {
  readonly code: ExecutorErrorCode;
  readonly retryable: boolean;
  readonly nodeTypeId?: string;
  readonly nodeId?: string;
  readonly details?: unknown;

  constructor(
    code: ExecutorErrorCode,
    message: string,
    options?: {
      retryable?: boolean;
      nodeTypeId?: string;
      nodeId?: string;
      details?: unknown;
    }
  ) {
    super(message);
    this.name = "ExecutorError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.nodeTypeId = options?.nodeTypeId;
    this.nodeId = options?.nodeId;
    this.details = options?.details;
  }
}
