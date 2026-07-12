import type {
  ToolMiddleware,
  BeforeExecuteHook,
  AfterExecuteHook,
  ErrorHook,
} from "../../../types/tool-execution";
import type { ToolExecutionContext, ToolResult } from "../../../types/tool";

export class ToolMiddlewarePipeline {
  private beforeHooks: BeforeExecuteHook[] = [];
  private afterHooks: AfterExecuteHook[] = [];
  private errorHooks: ErrorHook[] = [];

  use(middleware: ToolMiddleware): void {
    if (middleware.beforeExecute) {
      this.beforeHooks.push(middleware.beforeExecute);
    }
    if (middleware.afterExecute) {
      this.afterHooks.push(middleware.afterExecute);
    }
    if (middleware.onError) {
      this.errorHooks.push(middleware.onError);
    }
  }

  /**
   * Executes all registered beforeExecute hooks sequentially.
   */
  async executeBefore(
    toolId: string,
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    let currentParams = { ...params };
    for (const hook of this.beforeHooks) {
      currentParams = await hook(toolId, currentParams, context);
    }
    return currentParams;
  }

  /**
   * Executes all registered afterExecute hooks sequentially.
   */
  async executeAfter(
    toolId: string,
    params: Record<string, unknown>,
    result: ToolResult
  ): Promise<ToolResult> {
    let currentResult = { ...result };
    for (const hook of this.afterHooks) {
      currentResult = await hook(toolId, params, currentResult);
    }
    return currentResult;
  }

  /**
   * Executes all registered onError hooks, returning a transformed or original Error.
   */
  async executeError(
    toolId: string,
    params: Record<string, unknown>,
    error: Error
  ): Promise<Error> {
    let currentError = error;
    for (const hook of this.errorHooks) {
      currentError = await hook(toolId, params, currentError);
    }
    return currentError;
  }

  clear(): void {
    this.beforeHooks = [];
    this.afterHooks = [];
    this.errorHooks = [];
  }
}
