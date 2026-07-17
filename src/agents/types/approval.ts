// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — HITL Approval Engine Domain Types
// ─────────────────────────────────────────────────────────────────────────────

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled"
  | "escalated";

export interface ApprovalConfiguration {
  timeoutMs?: number;
  autoRejectOnTimeout?: boolean;
  requiredRoles?: string[];
  approverIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface ApprovalRequest {
  id: string;
  workflowId?: string;
  orchestrationId: string;
  actionType: string;
  targetResource: string;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  createdAt: string;
  expiresAt?: string;
  decidedAt?: string;
  config: ApprovalConfiguration;
  decision?: ApprovalDecision;
  workflowState?: {
    goal: string;
    correlationId: string;
    context: any; // OrchestratorContext
    variables: Record<string, unknown>;
  };
}

export interface ApprovalDecision {
  decision: "approved" | "rejected" | "escalated";
  approver: string;
  reason?: string;
}

export interface ApprovalResponse {
  requestId: string;
  status: ApprovalStatus;
  decision: ApprovalDecision;
  decidedAt: string;
}
