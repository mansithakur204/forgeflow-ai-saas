import type { IntentAnalysis, ObjectiveCategory } from "../../types/autonomous";

export class IntentAnalyzer {
  /**
   * Classifies an objective and assigns category weights.
   */
  analyze(objective: string): IntentAnalysis {
    const text = objective.toLowerCase().trim();
    let category: ObjectiveCategory = "general";
    let confidence = 0.5;

    if (text.includes("compile") || text.includes("build") || text.includes("assemble")) {
      category = "compile";
      confidence = 0.9;
    } else if (text.includes("refactor") || text.includes("rewrite") || text.includes("modify")) {
      category = "refactor";
      confidence = 0.85;
    } else if (text.includes("query") || text.includes("fetch") || text.includes("search") || text.includes("retrieve")) {
      category = "query";
      confidence = 0.8;
    } else if (text.includes("deploy") || text.includes("release") || text.includes("publish")) {
      category = "deploy";
      confidence = 0.9;
    }

    return {
      intent: `Execution of objective: "${objective}"`,
      category,
      confidence,
    };
  }
}
