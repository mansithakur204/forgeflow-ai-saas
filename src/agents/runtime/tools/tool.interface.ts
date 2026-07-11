import type { ToolConfig, ToolExecutionContext } from "../../types/tool";

export interface ITool {
  /**
   * Returns configurations, schemas, and permissions settings.
   */
  getConfig(): ToolConfig;

  /**
   * Validates parameters against parameter schema bounds.
   */
  validateParams(params: Record<string, unknown>): void;

  /**
   * Triggers tool execution step in active context.
   */
  execute(params: Record<string, unknown>, context: ToolExecutionContext): Promise<string>;
}
