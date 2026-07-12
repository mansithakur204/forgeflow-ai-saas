import type { ActionExecutionRequest, ActionExecutionResult, ActionAuditLog } from "../../types/action";
import { ActionRegistry } from "./action-registry";
import { PermissionEnforcer } from "./permission-enforcer";
import { ActionPipeline } from "./action-pipeline";

export class IntegrationCoordinator {
  private registry: ActionRegistry;
  private enforcer: PermissionEnforcer;
  private pipeline: ActionPipeline;

  private totalExecutions = 0;
  private failedExecutions = 0;
  private totalLatencyMs = 0;

  constructor(registry: ActionRegistry) {
    this.registry = registry;
    this.enforcer = new PermissionEnforcer();
    this.pipeline = new ActionPipeline();
  }

  getPipeline(): ActionPipeline {
    return this.pipeline;
  }

  getAuditLogs(): ActionAuditLog[] {
    return this.pipeline.getAuditLogs();
  }

  getMetrics(): { totalExecutions: number; failedExecutions: number; averageLatencyMs: number } {
    return {
      totalExecutions: this.totalExecutions,
      failedExecutions: this.failedExecutions,
      averageLatencyMs: this.totalExecutions > 0 ? this.totalLatencyMs / this.totalExecutions : 0,
    };
  }

  /**
   * Executes a registered action under permission guard checks, middlewares, retry logic and audit tracking.
   */
  async executeAction(request: ActionExecutionRequest, maxRetries: number = 3): Promise<ActionExecutionResult> {
    const startTime = Date.now();
    this.totalExecutions++;

    const action = this.registry.resolveAction(request.actionId);
    if (!action) {
      this.failedExecutions++;
      return {
        success: false,
        output: null,
        error: `Action not found in registry: "${request.actionId}"`,
        metrics: { latencyMs: 0, retryCount: 0 },
      };
    }

    // 1. Permission checks
    try {
      this.enforcer.enforce(action, request.context);
    } catch (err: any) {
      this.failedExecutions++;
      const isApproval = err.message.includes("Approval Required");
      const status = isApproval ? ("pending_approval" as const) : ("permission_denied" as const);

      this.pipeline.logAudit({
        timestamp: new Date().toISOString(),
        actionId: action.id,
        sessionId: request.context.sessionId,
        status,
        details: err.message,
      });

      return {
        success: false,
        output: null,
        error: err.message,
        metrics: { latencyMs: Date.now() - startTime, retryCount: 0 },
      };
    }

    // 2. Resolve adapter
    const adapter = this.registry.resolveAdapter(action.type);
    if (!adapter) {
      this.failedExecutions++;
      return {
        success: false,
        output: null,
        error: `No action adapter registered matching type: "${action.type}"`,
        metrics: { latencyMs: Date.now() - startTime, retryCount: 0 },
      };
    }

    let retryCount = 0;
    let output: unknown = null;
    let errorMsg: string | null = null;
    let success = false;

    // 3. Before execute hooks
    try {
      await this.pipeline.runBefore(request);
    } catch (err: any) {
      this.failedExecutions++;
      return {
        success: false,
        output: null,
        error: `Middleware beforeExecute failed: ${err.message}`,
        metrics: { latencyMs: Date.now() - startTime, retryCount: 0 },
      };
    }

    // 4. Run retry strategy loop
    while (true) {
      try {
        output = await adapter.execute(action, request);
        success = true;
        errorMsg = null;
        break;
      } catch (err: any) {
        errorMsg = err.message;
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 10));
          continue;
        }
        break;
      }
    }

    const latency = Date.now() - startTime;
    this.totalLatencyMs += latency;

    const result: ActionExecutionResult = {
      success,
      output,
      error: errorMsg,
      metrics: {
        latencyMs: latency,
        retryCount,
      },
    };

    // 5. After execute & Error hooks
    if (success) {
      try {
        await this.pipeline.runAfter(request, result);
      } catch (err: any) {
        result.success = false;
        result.error = `Middleware afterExecute failed: ${err.message}`;
      }

      this.pipeline.logAudit({
        timestamp: new Date().toISOString(),
        actionId: action.id,
        sessionId: request.context.sessionId,
        status: "success",
        details: `Action executed successfully with ${retryCount} retries.`,
      });
    } else {
      this.failedExecutions++;
      try {
        await this.pipeline.runError(request, new Error(errorMsg || "Unknown execution error"));
      } catch (err: any) {
        // Suppress middleware error
      }

      this.pipeline.logAudit({
        timestamp: new Date().toISOString(),
        actionId: action.id,
        sessionId: request.context.sessionId,
        status: "failed",
        details: `Action execution failed: ${errorMsg}`,
      });
    }

    return result;
  }
}
