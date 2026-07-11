import type { ITool } from "./tool.interface";
import type { ToolExecutionContext, ToolResult } from "../../types/tool";

export class ToolRuntime {
  private tool: ITool;

  constructor(tool: ITool) {
    this.tool = tool;
  }

  /**
   * Invokes tool execution. Checks parameters, manages timeouts, and handles retry limits.
   */
  async invoke(
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const startTime = new Date().toISOString();
    const startMs = Date.now();
    let retriesAttempted = 0;
    const maxRetries = context.maxRetries ?? 0;
    const timeoutMs = context.timeoutMs ?? 10000;

    try {
      this.tool.validateParams(params);
    } catch (err: any) {
      return {
        toolId: this.tool.getConfig().metadata.id,
        success: false,
        output: "",
        error: `Parameter validation failed: ${err.message}`,
        metrics: {
          startTime,
          endTime: new Date().toISOString(),
          executionTimeMs: Date.now() - startMs,
          retriesAttempted: 0,
          dataTransferredBytes: 0,
        },
      };
    }

    while (true) {
      try {
        const output = await this.executeWithTimeout(params, context, timeoutMs);

        return {
          toolId: this.tool.getConfig().metadata.id,
          success: true,
          output,
          error: null,
          metrics: {
            startTime,
            endTime: new Date().toISOString(),
            executionTimeMs: Date.now() - startMs,
            retriesAttempted,
            dataTransferredBytes: output.length,
          },
        };
      } catch (err: any) {
        if (retriesAttempted < maxRetries) {
          retriesAttempted++;
          continue; // Retry execution
        }

        return {
          toolId: this.tool.getConfig().metadata.id,
          success: false,
          output: "",
          error: `Execution failed: ${err.message}`,
          metrics: {
            startTime,
            endTime: new Date().toISOString(),
            executionTimeMs: Date.now() - startMs,
            retriesAttempted,
            dataTransferredBytes: 0,
          },
        };
      }
    }
  }

  private executeWithTimeout(
    params: Record<string, unknown>,
    context: ToolExecutionContext,
    timeoutMs: number
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.tool
        .execute(params, context)
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
