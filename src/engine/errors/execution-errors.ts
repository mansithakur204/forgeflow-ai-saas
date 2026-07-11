// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Execution Engine Errors
// Typed errors for graph validation and runtime execution.
// ─────────────────────────────────────────────────────────────────────────────

export type ExecutionErrorCode =
  | "GRAPH_EMPTY"
  | "GRAPH_CYCLE"
  | "GRAPH_NO_TRIGGER"
  | "GRAPH_DUPLICATE_NODE_ID"
  | "GRAPH_UNKNOWN_NODE"
  | "GRAPH_UNKNOWN_NODE_TYPE"
  | "GRAPH_INVALID_EDGE"
  | "GRAPH_DUPLICATE_EDGE"
  | "GRAPH_SELF_LOOP"
  | "GRAPH_INVALID_PORT"
  | "GRAPH_TRIGGER_HAS_INPUT"
  | "GRAPH_ORPHAN_NODE";

export interface GraphValidationIssue {
  code: ExecutionErrorCode;
  message: string;
  nodeId?: string;
  edgeId?: string;
  portId?: string;
}

export class ExecutionError extends Error {
  readonly code: ExecutionErrorCode | string;
  readonly retryable: boolean;
  readonly nodeId?: string;
  readonly details?: unknown;

  constructor(
    code: ExecutionErrorCode | string,
    message: string,
    options?: {
      retryable?: boolean;
      nodeId?: string;
      details?: unknown;
    }
  ) {
    super(message);
    this.name = "ExecutionError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.nodeId = options?.nodeId;
    this.details = options?.details;
  }
}

export interface GraphValidationResult {
  valid: boolean;
  errors: GraphValidationIssue[];
  warnings: GraphValidationIssue[];
}
