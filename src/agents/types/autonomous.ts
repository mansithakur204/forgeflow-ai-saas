export type ObjectiveCategory =
  | "compile"
  | "refactor"
  | "query"
  | "deploy"
  | "general";

export interface IntentAnalysis {
  intent: string;
  category: ObjectiveCategory;
  confidence: number;
}

export interface CapabilityMatch {
  agentId: string;
  score: number;
  matchedCapabilities: string[];
}

export interface DecisionPolicy {
  maxReasoningSteps: number;
  confidenceThreshold: number;
}

export interface DecisionEvaluation {
  success: boolean;
  score: number; // 0.0 to 1.0
  feedback: string;
}

export interface ReflectionResult {
  evaluation: DecisionEvaluation;
  requiresReplan: boolean;
  suggestedFixes: string[];
}

export type AutonomousActionType =
  | "execute_tool"
  | "trigger_workflow"
  | "query_knowledge"
  | "query_memory"
  | "plan"
  | "complete";

export interface AutonomousDecision {
  stepIndex: number;
  actionType: AutonomousActionType;
  targetId: string;
  parameters: Record<string, unknown>;
  reasoning: string;
  confidence: number; // 0.0 to 1.0
}
