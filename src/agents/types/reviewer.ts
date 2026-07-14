// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Reviewer Agent Domain Typings
// Defines configurations, contexts, results, and status parameters.
// ─────────────────────────────────────────────────────────────────────────────

export type ReviewStatus =
  | "idle"
  | "validating_plan"
  | "validating_execution"
  | "checking_quality"
  | "completed"
  | "failed";

export interface ReviewerConfiguration {
  minQualityScore?: number;
  requireHumanApprovalThreshold?: number;
  strictDependencyValidation?: boolean;
}

export interface ReviewerContext {
  targetId: string;
  type: "plan" | "execution";
  status: ReviewStatus;
  variables: Record<string, unknown>;
}

export interface ReviewResult {
  targetId: string;
  type: "plan" | "execution";
  approvalStatus: "approved" | "warning" | "rejected";
  retryRecommendation: boolean;
  humanApprovalRequired: boolean;
  qualityScore: number;
  confidence: number;
  warnings: string[];
  recommendations: string[];
  success: boolean;
  error?: string;
}
