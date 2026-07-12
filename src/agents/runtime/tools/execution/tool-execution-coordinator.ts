import type { ToolRegistry } from "../tool-registry";
import type { ToolExecutionContext, ToolResult } from "../../../types/tool";
import type {
  ToolChainConfig,
  ToolChainResult,
  ToolExecutionMetrics,
  ToolMiddleware,
} from "../../../types/tool-execution";
import type { AgentMessageBus } from "../../orchestration/message-bus";
import { ToolDiscovery } from "./tool-discovery";
import { ToolPermissionValidator } from "./tool-permission-validator";
import { ToolSandbox } from "./tool-sandbox";
import { ToolMiddlewarePipeline } from "./tool-middleware";
import { ToolChainExecutor } from "./tool-chain-executor";
import { ToolRuntime } from "../tool-runtime";

export class ToolExecutionCoordinator {
  private registry: ToolRegistry;
  private messageBus: AgentMessageBus;

  private discovery: ToolDiscovery;
  private permissionValidator: ToolPermissionValidator;
  private sandbox: ToolSandbox;
  private middlewarePipeline: ToolMiddlewarePipeline;
  private chainExecutor: ToolChainExecutor;

  // Telemetry metrics
  private metrics: ToolExecutionMetrics = {
    totalLatencyMs: 0,
    successRate: 1,
    retryCount: 0,
    dataTransferredBytes: 0,
    activeExecutions: 0,
  };

  private executionHistory: Array<{
    timestamp: string;
    action: string;
    toolId?: string;
    success?: boolean;
    error?: string;
    latencyMs?: number;
  }> = [];

  private approvedToolIds = new Set<string>();

  constructor(registry: ToolRegistry, messageBus: AgentMessageBus) {
    this.registry = registry;
    this.messageBus = messageBus;

    this.discovery = new ToolDiscovery(registry);
    this.permissionValidator = new ToolPermissionValidator();
    this.sandbox = new ToolSandbox();
    this.middlewarePipeline = new ToolMiddlewarePipeline();
    this.chainExecutor = new ToolChainExecutor(registry);
  }

  registerApproval(toolId: string): void {
    this.approvedToolIds.add(toolId.toLowerCase().trim());
  }

  use(middleware: ToolMiddleware): void {
    this.middlewarePipeline.use(middleware);
  }

  getMetrics(): ToolExecutionMetrics {
    return { ...this.metrics };
  }

  getAuditLogs() {
    return [...this.executionHistory];
  }

  getDiscoveryEngine(): ToolDiscovery {
    return this.discovery;
  }

  /**
   * Coordinates execution of a single tool.
   */
  async executeTool(
    toolId: string,
    params: Record<string, unknown>,
    context: ToolExecutionContext,
    abortSignal?: AbortSignal
  ): Promise<ToolResult> {
    const startTime = Date.now();
    this.metrics.activeExecutions++;
    this.executionHistory.push({
      timestamp: new Date().toISOString(),
      action: "started",
      toolId,
    });

    this.messageBus.publish("tool:execution:started", "coordinator", {
      toolId,
      sessionId: context.sessionId,
    });

    const tool = this.registry.resolve(toolId);
    if (!tool) {
      this.metrics.activeExecutions--;
      const errorMsg = `Tool not found in registry: "${toolId}"`;
      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        action: "failed",
        toolId,
        success: false,
        error: errorMsg,
      });
      throw new Error(errorMsg);
    }

    try {
      // 1. Permission Validation
      this.permissionValidator.validate(tool, context, this.approvedToolIds);

      // 2. Sandbox Isolation (Cloning parameters and context variables)
      const sandboxContext = this.sandbox.createSandboxContext(context);

      // 3. Before Execution Middleware Hooks
      const resolvedParams = await this.middlewarePipeline.executeBefore(
        toolId,
        params,
        sandboxContext
      );

      // Check cancellation before invoking tool
      if (abortSignal?.aborted) {
        throw new Error("Execution Cancelled: The tool execution was aborted.");
      }

      // 4. Execution via Runtime
      const runtime = new ToolRuntime(tool);

      let rawResult: ToolResult;
      if (abortSignal) {
        let resolveCancel: () => void;
        const abortPromise = new Promise<never>((_, reject) => {
          const handler = () => {
            reject(new Error("Execution Cancelled: The tool execution was aborted."));
          };
          abortSignal.addEventListener("abort", handler);
          resolveCancel = () => abortSignal.removeEventListener("abort", handler);
        });

        try {
          rawResult = await Promise.race([
            runtime.invoke(resolvedParams, sandboxContext),
            abortPromise,
          ]);
          resolveCancel!();
        } catch (err) {
          resolveCancel!();
          throw err;
        }
      } else {
        rawResult = await runtime.invoke(resolvedParams, sandboxContext);
      }

      // 5. Sandbox output constraints check
      if (rawResult.success) {
        this.sandbox.enforceLimits(rawResult.output);
      } else {
        throw new Error(rawResult.error || "Unknown tool execution error");
      }

      // 6. After Execution Middleware Hooks
      const processedResult = await this.middlewarePipeline.executeAfter(
        toolId,
        resolvedParams,
        rawResult
      );

      // Update Telemetry & Metrics
      const latency = Date.now() - startTime;
      this.metrics.activeExecutions--;
      this.metrics.totalLatencyMs += latency;
      this.metrics.dataTransferredBytes += processedResult.metrics.dataTransferredBytes;
      this.metrics.retryCount += processedResult.metrics.retriesAttempted;
      this.updateSuccessRate(true);

      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        action: "completed",
        toolId,
        success: true,
        latencyMs: latency,
      });

      this.messageBus.publish("tool:execution:completed", "coordinator", {
        toolId,
        sessionId: context.sessionId,
        success: true,
      });

      return processedResult;
    } catch (err: any) {
      // 7. Error Middleware Hooks
      const finalError = await this.middlewarePipeline.executeError(toolId, params, err);

      const latency = Date.now() - startTime;
      this.metrics.activeExecutions--;
      this.metrics.totalLatencyMs += latency;
      this.updateSuccessRate(false);

      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        action: "failed",
        toolId,
        success: false,
        error: finalError.message,
        latencyMs: latency,
      });

      this.messageBus.publish("tool:execution:failed", "coordinator", {
        toolId,
        sessionId: context.sessionId,
        error: finalError.message,
      });

      return {
        toolId,
        success: false,
        output: "",
        error: finalError.message,
        metrics: {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          executionTimeMs: latency,
          retriesAttempted: 0,
          dataTransferredBytes: 0,
        },
      };
    }
  }

  /**
   * Coordinates execution of a tool chain (sequential or parallel).
   */
  async executeToolChain(
    chainConfig: ToolChainConfig,
    context: ToolExecutionContext,
    abortSignal?: AbortSignal
  ): Promise<ToolChainResult> {
    const startTime = Date.now();
    this.messageBus.publish("toolchain:execution:started", "coordinator", {
      stepsCount: chainConfig.steps.length,
      mode: chainConfig.executionMode,
    });

    const chainResult = await this.chainExecutor.executeChain(chainConfig, context, abortSignal);

    const latency = Date.now() - startTime;
    this.metrics.totalLatencyMs += latency;

    // Log to execution history
    this.executionHistory.push({
      timestamp: new Date().toISOString(),
      action: chainResult.success ? "chain_completed" : "chain_failed",
      success: chainResult.success,
      error: chainResult.error || undefined,
      latencyMs: latency,
    });

    this.messageBus.publish("toolchain:execution:finished", "coordinator", {
      success: chainResult.success,
      stepsCount: chainConfig.steps.length,
      error: chainResult.error,
    });

    return chainResult;
  }

  private updateSuccessRate(isSuccess: boolean): void {
    const completedRuns = this.executionHistory.filter(
      (h) => h.action === "completed" || h.action === "failed"
    );
    const successRuns = completedRuns.filter((h) => h.success === true);
    this.metrics.successRate =
      completedRuns.length > 0 ? successRuns.length / completedRuns.length : 1;
  }
}
