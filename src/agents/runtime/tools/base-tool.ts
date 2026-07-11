import type { ITool } from "./tool.interface";
import type { ToolConfig, ToolExecutionContext } from "../../types/tool";

export abstract class BaseTool implements ITool {
  protected readonly config: ToolConfig;

  constructor(config: ToolConfig) {
    this.config = config;
  }

  getConfig(): ToolConfig {
    return this.config;
  }

  /**
   * Asserts whether required parameters are present in invocation args.
   */
  validateParams(params: Record<string, unknown>): void {
    if (!this.config.schema) return;
    const required = (this.config.schema.required as string[]) || [];
    for (const key of required) {
      if (params[key] === undefined || params[key] === null) {
        throw new Error(`Missing required tool execution parameter: "${key}"`);
      }
    }
  }

  abstract execute(
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<string>;
}
