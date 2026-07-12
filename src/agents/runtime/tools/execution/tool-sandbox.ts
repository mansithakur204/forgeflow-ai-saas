import type { ToolExecutionContext } from "../../../types/tool";

export interface SandboxConfig {
  maxOutputSize?: number;
  blockedVariables?: string[];
  readOnly?: boolean;
}

export class ToolSandbox {
  private config: SandboxConfig;

  constructor(config: SandboxConfig = {}) {
    this.config = {
      maxOutputSize: config.maxOutputSize ?? 50 * 1024 * 1024, // 50MB default limit
      blockedVariables: config.blockedVariables ?? ["systemSecret", "adminKey", "privateKey"],
      readOnly: config.readOnly ?? false,
    };
  }

  /**
   * Creates an isolated context clone by stripping blocked variables and deep copying parameters.
   */
  createSandboxContext(context: ToolExecutionContext): ToolExecutionContext {
    const clonedVars: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context.variables)) {
      if (this.config.blockedVariables?.includes(key)) {
        continue; // Strip out sensitive parameters
      }
      clonedVars[key] =
        value !== null && typeof value === "object"
          ? JSON.parse(JSON.stringify(value))
          : value;
    }

    return {
      userId: context.userId,
      sessionId: context.sessionId,
      variables: clonedVars,
      timeoutMs: context.timeoutMs,
      maxRetries: context.maxRetries,
    };
  }

  /**
   * Enforces resource limits on outputs. Throws if the size exceeds maxOutputSize limit.
   */
  enforceLimits(output: string): string {
    const size = Buffer.byteLength(output, "utf8");
    if (this.config.maxOutputSize && size > this.config.maxOutputSize) {
      throw new Error(
        `Sandbox resource limit violation: Tool execution output size (${size} bytes) exceeds limit of ${this.config.maxOutputSize} bytes.`
      );
    }
    return output;
  }
}
