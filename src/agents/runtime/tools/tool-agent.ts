// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Tool Agent
// Executes verified workflow tasks using the concrete node executors registry.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAgent } from "../base-agent";
import type { AgentStatus, AgentRole } from "../../types/agent";
import type { AgentSession } from "../../types/session";
import type {
  ToolConfiguration,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolExecutionStatus,
} from "../../types/tool";
import { createDefaultExecutorRegistry } from "@/engine/executors/registry/executor-registry";
import type { ExecutorExecutionInput } from "@/engine/types/executor";

export class ToolAgent extends BaseAgent {
  private configOverride: ToolConfiguration = {};

  constructor() {
    super({
      id: "tool-agent",
      metadata: {
        id: "tool-agent",
        name: "Tool Agent",
        description: "Specialized agent for sandboxed, secure execution of system integration tools.",
        version: "2.0.0",
        author: "ForgeFlow AI",
      },
      capabilities: {
        canPlan: false,
        canExecute: true,
        canSearchCode: false,
        canEditCode: false,
        canAccessMemory: false,
        canUseTools: true,
      },
      role: "tool" as AgentRole,
    });
  }

  /**
   * Overrides execution limits and lists.
   */
  setConfiguration(config: ToolConfiguration): void {
    this.configOverride = {
      allowedTools: [],
      deniedTools: [],
      requireApproval: true,
      timeoutMs: 10000,
      ...config,
    };
  }

  async executeStep(session: AgentSession, input: string) {
    const logger: any = session.context.variables.logger || console;
    const agentId = this.getConfig().id;
    const startTime = Date.now();

    // 1. Parse and extract execution details
    let payload: { toolId: string; config: Record<string, unknown> };
    try {
      payload = JSON.parse(input);
    } catch (e) {
      // Fallback to context variables if input is not structured JSON
      const toolId = String(session.context.variables.toolId || "io_http");
      const config = (session.context.variables.toolConfig || {}) as Record<string, unknown>;
      payload = { toolId, config };
    }

    const { toolId, config } = payload;

    // ── Telemetry: Emit TOOL_EXECUTION_STARTED ──
    logger.info(`Tool execution started`, { event: "TOOL_EXECUTION_STARTED", toolId }, agentId);

    // 2. Enforce Permissions (Task 14.4C Allow/Deny list validations)
    const allowed = this.configOverride.allowedTools || [];
    const denied = this.configOverride.deniedTools || [];

    if (denied.includes(toolId)) {
      const err = `Tool execution blocked: "${toolId}" is blacklisted.`;
      logger.error(err, { event: "TOOL_EXECUTION_FAILED", reason: "BLACKLISTED" }, agentId);
      throw new Error(err);
    }

    if (allowed.length > 0 && !allowed.includes(toolId)) {
      const err = `Tool execution blocked: "${toolId}" is not in the allowed list.`;
      logger.error(err, { event: "TOOL_EXECUTION_FAILED", reason: "NOT_ALLOWED" }, agentId);
      throw new Error(err);
    }

    // Telemetry: Emit TOOL_VALIDATED
    logger.info(`Tool validation passed`, { event: "TOOL_VALIDATED", toolId }, agentId);

    // 3. Resolve Executor from Registry (Task 14.4B Integration)
    const registry = createDefaultExecutorRegistry();
    const executor = registry.get(toolId as any);
    if (!executor) {
      const err = `Unsupported tool requested: Executor "${toolId}" not found in registry.`;
      logger.error(err, { event: "TOOL_EXECUTION_FAILED", reason: "UNKNOWN_EXECUTOR" }, agentId);
      throw new Error(err);
    }

    // 4. Executing inside Sandbox (Task 14.4D Timeouts and Retries)
    const timeoutMs = this.configOverride.timeoutMs || 10000;
    let retriesAttempted = 0;
    const maxRetries = 2;
    let success = false;
    let output = "";
    let errorMsg = "";

    while (true) {
      try {
        const executorInput: ExecutorExecutionInput = {
          node: {
            id: `node-${toolId}-${Date.now()}`,
            typeId: toolId as any,
            label: toolId,
            config,
          },
          context: {
            runId: session.id,
            services: {
              logger,
            },
          } as any,
          inputs: {},
          signal: { aborted: false } as any,
          attempt: retriesAttempted + 1,
        };

        const executionPromise = executor.execute(executorInput);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => {
            logger.error(`Tool execution cancelled due to timeout`, { event: "TOOL_CANCELLED", toolId }, agentId);
            reject(new Error(`Sandbox limit exceeded: Execution timed out after ${timeoutMs}ms`));
          }, timeoutMs)
        );

        const result = await Promise.race([executionPromise, timeoutPromise]);

        if (result.success) {
          success = true;
          output = JSON.stringify(result.outputs || {});
          break;
        } else {
          throw new Error(result.error?.message || "Execution result returned success false.");
        }
      } catch (err: any) {
        if (retriesAttempted < maxRetries) {
          retriesAttempted++;
          logger.warn(`Tool execution failed. Retrying... Attempt ${retriesAttempted}`, { toolId, error: err.message }, agentId);
          continue;
        }
        success = false;
        errorMsg = err.message || "Sandbox runtime execution failed";
        break;
      }
    }

    const durationMs = Date.now() - startTime;

    // 5. Expose Metrics to Execution Inspector (Task 14.4F)
    const toolResult: ToolExecutionResult = {
      toolId,
      success,
      output,
      error: errorMsg || undefined,
      durationMs,
      retries: retriesAttempted,
      executorUsed: toolId,
      status: (success ? "completed" : "failed") as ToolExecutionStatus,
    };

    if (success) {
      // Telemetry: Emit TOOL_EXECUTION_COMPLETED
      logger.info(`Tool execution completed`, { event: "TOOL_EXECUTION_COMPLETED", toolId, durationMs }, agentId);
    } else {
      // Telemetry: Emit TOOL_EXECUTION_FAILED
      logger.error(`Tool execution failed`, { event: "TOOL_EXECUTION_FAILED", toolId, error: errorMsg }, agentId);
      throw new Error(`Tool execution failed: ${errorMsg}`);
    }

    return {
      output,
      newStatus: "completed" as AgentStatus,
      metadata: {
        toolResult,
        executionMetrics: {
          durationMs,
          retriesAttempted,
          toolId,
        },
      },
    };
  }
}
