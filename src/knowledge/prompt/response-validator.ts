export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  warnings: string[];
}

export class ResponseValidator {
  /**
   * Validates generated answers. Detects citation mismatch source hallucinations.
   */
  validate(response: string, context: string): ValidationResult {
    const warnings: string[] = [];
    const sourceRegex = /\[Source\s+(\d+)\]/g;
    let match;

    const contextSources = new Set<string>();
    const sourceMatchRegex = /\[Source\s+(\d+)\]/g;

    while ((match = sourceMatchRegex.exec(context)) !== null) {
      contextSources.add(match[1]);
    }

    sourceRegex.lastIndex = 0;
    while ((match = sourceRegex.exec(response)) !== null) {
      const sourceIndex = match[1];
      if (!contextSources.has(sourceIndex)) {
        return {
          isValid: false,
          reason: `Hallucination detected: Response cites [Source ${sourceIndex}] which is not present in the prompt context`,
          warnings,
        };
      }
    }

    if (context.trim() !== "" && !response.includes("[Source")) {
      warnings.push("Response contains no citations despite context sources being available");
    }

    return {
      isValid: true,
      warnings,
    };
  }
}
