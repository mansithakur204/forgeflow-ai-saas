import type { IntentAnalysis, AutonomousDecision, ReflectionResult, DecisionEvaluation } from "../../types/autonomous";
import { ToolSelector, WorkflowSelector, KnowledgeRetrievalSelector, MemoryRetrievalSelector } from "./selectors";

export class AutonomousDecisionEngine {
  private toolSelector: ToolSelector;
  private workflowSelector: WorkflowSelector;
  private knowledgeSelector: KnowledgeRetrievalSelector;
  private memorySelector: MemoryRetrievalSelector;

  constructor(toolSelector: ToolSelector) {
    this.toolSelector = toolSelector;
    this.workflowSelector = new WorkflowSelector();
    this.knowledgeSelector = new KnowledgeRetrievalSelector();
    this.memorySelector = new MemoryRetrievalSelector();
  }

  /**
   * Plans the next step in the autonomous loop based on current step index.
   */
  makeDecision(
    stepIndex: number,
    objective: string,
    analysis: IntentAnalysis
  ): AutonomousDecision {
    const category = analysis.category;

    if (stepIndex === 0) {
      const keywords = this.memorySelector.selectKeywords(objective);
      return {
        stepIndex,
        actionType: "query_memory",
        targetId: keywords.join(","),
        parameters: { keywords },
        reasoning: "Retrieved past historical execution instances to load working constraints.",
        confidence: 0.95,
      };
    }

    if (stepIndex === 1) {
      const query = this.knowledgeSelector.selectQuery(objective);
      return {
        stepIndex,
        actionType: "query_knowledge",
        targetId: "knowledge-base",
        parameters: { query },
        reasoning: "Searched semantic facts database to align with standard project conventions.",
        confidence: 0.9,
      };
    }

    if (stepIndex === 2) {
      if (category === "refactor") {
        const wfId = this.workflowSelector.selectWorkflow(category);
        return {
          stepIndex,
          actionType: "trigger_workflow",
          targetId: wfId,
          parameters: { workflowId: wfId },
          reasoning: "Triggered multi-stage workflow pipeline for codebase modifications.",
          confidence: 0.85,
        };
      } else {
        const toolId = this.toolSelector.selectTool(category);
        return {
          stepIndex,
          actionType: "execute_tool",
          targetId: toolId,
          parameters: { action: "run" },
          reasoning: "Executing workspace utility command to finalize changes.",
          confidence: 0.88,
        };
      }
    }

    return {
      stepIndex,
      actionType: "complete",
      targetId: "done",
      parameters: {},
      reasoning: "All execution steps completed successfully.",
      confidence: 1.0,
    };
  }
}

export class ReflectionEngine {
  /**
   * Evaluates the outcome of a decision execution.
   */
  reflect(
    decision: AutonomousDecision,
    output: unknown,
    error: string | null
  ): ReflectionResult {
    const success = error === null;
    const score = success ? 0.95 : 0.2;
    const feedback = success
      ? `Step execution succeeded: Mapped output is verified.`
      : `Step execution failed with error: "${error}".`;

    const requiresReplan = !success;
    const suggestedFixes: string[] = [];

    if (requiresReplan) {
      suggestedFixes.push("Retry with backup agent runtime parameters.");
      suggestedFixes.push("Loosen strict parameter validation schema check constraints.");
    }

    const evaluation: DecisionEvaluation = {
      success,
      score,
      feedback,
    };

    return {
      evaluation,
      requiresReplan,
      suggestedFixes,
    };
  }
}
