// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Agent Node Executor
// Workflow runner node that orchestrates specialized AI agent lifecycles.
// Integrates Agent Domain, Registry, Runtime controls, and Telemetry events.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseNodeExecutor } from "@/engine/executors/base/base-node-executor";
import { successResult, failureResult } from "@/engine/executors/base/executor-result";
import type {
  ExecutorExecutionInput,
  ExecutorExecutionResult,
  ExecutorValidationInput,
  ExecutorValidationResult,
  NodeExecutorMetadata,
} from "@/engine/types/executor";
import { AgentFactory } from "@/agents/runtime/agent-factory";
import { AgentRuntime } from "@/agents/runtime/agent-runtime";

export class AgentNodeExecutor extends BaseNodeExecutor {
  getMetadata(): NodeExecutorMetadata {
    return {
      nodeTypeId: "agent_executor",
      category: "ai",
      version: "1.0.0",
      displayName: "Agent Executor",
      description: "Orchestrate steps using a specialized AI agent workspace.",
      inputPorts: [{ id: "in", label: "Prompt" }],
      outputPorts: [
        { id: "out", label: "Output" },
        { id: "err", label: "Error" },
      ],
      supportsCancellation: true,
      supportsRetry: true,
    };
  }

  validate(input: ExecutorValidationInput): ExecutorValidationResult {
    const { agentId, prompt } = input.node.config;
    const errors: { code: string; message: string; field: string }[] = [];

    if (!agentId) {
      errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: "Agent ID is required", field: "agentId" });
    }
    if (!prompt) {
      errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: "Input Prompt is required", field: "prompt" });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  protected async run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const agentId = String(input.node.config.agentId || "");
    const prompt = String(input.node.config.prompt || "");
    const timeoutMs = Number(input.node.config.timeoutMs ?? 15000);
    const logger = input.context.services.logger;

    try {
      // 1. Resolve agent registry and locate the target agent
      const registry = AgentFactory.createDefaultRegistry();
      const agentInstance = registry.resolve(agentId);
      if (!agentInstance) {
        throw new Error(`Agent not found in registry: "${agentId}"`);
      }

      // 2. Initialize AgentRuntime for the resolved agent
      const runtime = new AgentRuntime(agentInstance);

      // Register standard execution telemetry event handler to forward runtime notifications to the workflow log
      runtime.onEvent((event) => {
        const uppercaseEvent = `AGENT_${event.type.toUpperCase()}`;
        logger.info(
          `Agent runtime event: ${event.type}`,
          { event: uppercaseEvent, payload: event.payload },
          input.node.id
        );
      });

      // 3. Create session context
      const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const session = runtime.createSession(sessionId);

      // Bind the workflow logger so the runtime can emit telemetries (Task 14.1F)
      session.context.variables.logger = logger;

      // 4. Start agent lifecycle
      runtime.start(session);

      // Fire heartbeat pulse to verify heartbeat tracking (Task 14.1C)
      runtime.heartbeat(session);

      // 5. Execute agent step with timeout
      const stepPromise = runtime.runStep(session, prompt);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Agent step execution timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const output = await Promise.race([stepPromise, timeoutPromise]);

      // Fire heartbeat after operation to update status
      runtime.heartbeat(session);

      // 6. Complete agent lifecycle
      runtime.stop(session);

      return successResult(
        {
          out: output,
          diagnostics: {
            totalStepsExecuted: session.diagnostics.totalStepsExecuted,
            totalLatencyMs: session.diagnostics.totalLatencyMs,
            tokensConsumed: session.diagnostics.tokensConsumed,
            errorsCount: session.diagnostics.errorsCount,
            health: runtime.healthStatus(session),
            status: session.status,
          },
        },
        {
          agentId,
          sessionId,
          status: session.status,
          stepsCount: session.diagnostics.totalStepsExecuted,
        }
      );

    } catch (err: any) {
      logger.error(
        `Agent execution failed: ${err.message}`,
        { event: "AGENT_FAILED", error: err.message },
        input.node.id
      );

      return failureResult({
        code: "AGENT_EXECUTION_FAILED",
        message: err.message || "Failed to execute agent step",
        retryable: true,
      });
    }
  }
}
