export class ParameterResolver {
  /**
   * Resolves template properties by injecting matching variables from the runtime context.
   */
  resolve(
    template: Record<string, unknown>,
    variables: Record<string, unknown>,
    stepResults: Map<string, { output: string; success: boolean }> = new Map()
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(template)) {
      resolved[key] = this.resolveValue(value, variables, stepResults);
    }

    return resolved;
  }

  private resolveValue(
    value: unknown,
    variables: Record<string, unknown>,
    stepResults: Map<string, { output: string; success: boolean }>
  ): unknown {
    if (typeof value === "string") {
      return this.resolveString(value, variables, stepResults);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.resolveValue(item, variables, stepResults));
    }

    if (value !== null && typeof value === "object") {
      const resolvedObj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        resolvedObj[k] = this.resolveValue(v, variables, stepResults);
      }
      return resolvedObj;
    }

    return value;
  }

  private resolveString(
    str: string,
    variables: Record<string, unknown>,
    stepResults: Map<string, { output: string; success: boolean }>
  ): unknown {
    const pattern = /\{\{([^}]+)\}\}/g;

    // If the entire string is exactly a single placeholder, return the raw type (e.g. object, number)
    const exactMatch = /^\{\{([^}]+)\}\}$/.exec(str);
    if (exactMatch) {
      const path = exactMatch[1].trim();
      return this.getValueByPath(path, variables, stepResults);
    }

    return str.replace(pattern, (_, path) => {
      const val = this.getValueByPath(path.trim(), variables, stepResults);
      if (val === undefined || val === null) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    });
  }

  private getValueByPath(
    path: string,
    variables: Record<string, unknown>,
    stepResults: Map<string, { output: string; success: boolean }>
  ): unknown {
    // 1. Resolve from step results, e.g. "stepResults:stepId:output"
    if (path.startsWith("stepResults:")) {
      const parts = path.split(":");
      const stepId = parts[1];
      const prop = parts[2] || "output";
      const step = stepResults.get(stepId);
      if (step) {
        if (prop === "output") return step.output;
        if (prop === "success") return step.success;
      }
      return undefined;
    }

    // 2. Resolve from context variables dictionary
    const segments = path.split(".");
    let current: unknown = variables;
    for (const segment of segments) {
      if (current === null || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }
}
