// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Agent Handoff Manager
// Coordinates inter-agent message passing, shared context, and recovery flows.
// ─────────────────────────────────────────────────────────────────────────────

import type { HandoffRequest, HandoffResult, HandoffContext, HandoffStatus } from "../../types/planning";
import type { SharedPlanningContext } from "./shared-planning-context";

export class AgentHandoffManager {
  private allowedHandoffs = new Set<string>(); // "fromAgentId->toAgentId"
  private activeHandoffs = new Map<string, HandoffContext>();

  constructor() {
    // Task 14.7B: Register standard authorized collaboration pathways
    this.registerHandoffPath("planner-agent", "research-agent");
    this.registerHandoffPath("research-agent", "tool-agent");
    this.registerHandoffPath("tool-agent", "memory-agent");
    this.registerHandoffPath("memory-agent", "reviewer-agent");
    this.registerHandoffPath("reviewer-agent", "planner-agent");

    // Legacy standard paths to ensure full backward compatibility
    this.registerHandoffPath("research-agent", "coding-agent");
    this.registerHandoffPath("coding-agent", "executor-agent");
    this.registerHandoffPath("executor-agent", "planner-agent");
    this.registerHandoffPath("planner-agent", "executor-agent");
    this.registerHandoffPath("research-agent", "planner-agent");
    this.registerHandoffPath("memory-agent", "planner-agent");
    this.registerHandoffPath("planner-agent", "memory-agent");
  }

  registerHandoffPath(from: string, to: string): void {
    this.allowedHandoffs.add(`${from.toLowerCase().trim()}->${to.toLowerCase().trim()}`);
  }

  isHandoffAllowed(from: string, to: string): boolean {
    const key = `${from.toLowerCase().trim()}->${to.toLowerCase().trim()}`;
    return this.allowedHandoffs.has(key);
  }

  /**
   * Executes inter-agent handoff coordinating shared contexts, retries, and fallback routes.
   */
  async executeHandoff(
    request: HandoffRequest,
    context: SharedPlanningContext
  ): Promise<HandoffResult> {
    const startedAt = Date.now();
    const { fromAgentId, toAgentId, taskId, payload, correlationId = "default-corr", workflowId } = request;

    const logger: any = context.get("logger") || console;

    // ── Telemetry: Emit HANDOFF_STARTED ──
    logger.info(`Handoff operation started`, {
      event: "HANDOFF_STARTED",
      fromAgentId,
      toAgentId,
      taskId,
      correlationId,
    }, fromAgentId);

    // Initialize Handoff Context (Task 14.7A)
    const handoffId = `hnd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const hndContext: HandoffContext = {
      handoffId,
      correlationId,
      workflowId,
      status: "processing" as HandoffStatus,
      sharedVariables: {},
      sharedMetadata: { ...request.payload.metadata as Record<string, unknown> },
      executionState: {},
      timelineEvents: [`Started handoff from ${fromAgentId} to ${toAgentId}`],
    };

    this.activeHandoffs.set(handoffId, hndContext);

    // Verify authorized path
    let targetAgentId = toAgentId;
    if (!this.isHandoffAllowed(fromAgentId, targetAgentId)) {
      // Task 14.7D: Fallback Agent recovery check
      if (request.fallbackAgentId && this.isHandoffAllowed(fromAgentId, request.fallbackAgentId)) {
        logger.warn(`Unauthorized route: falling back to registered agent: "${request.fallbackAgentId}"`, {}, fromAgentId);
        targetAgentId = request.fallbackAgentId;
      } else {
        const errorMsg = `Handoff route from "${fromAgentId}" to "${targetAgentId}" is not authorized.`;
        logger.error(`Handoff failed: ${errorMsg}`, { event: "HANDOFF_FAILED", fromAgentId, toAgentId: targetAgentId }, fromAgentId);

        hndContext.status = "failed";
        hndContext.timelineEvents.push(`Failed: ${errorMsg}`);

        return {
          success: false,
          transferredData: {},
          error: `Security constraint error: ${errorMsg}`,
          durationMs: Date.now() - startedAt,
        };
      }
    }

    // ── Task 14.7C: Sync Shared Context ──
    const transferredData: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(payload)) {
      context.set(key, val);
      transferredData[key] = val;
      hndContext.sharedVariables[key] = val;
    }

    // Bind Timeline, Correlation IDs, and state metadata in shared context
    context.set(`handoff:${taskId}:source`, fromAgentId);
    context.set(`handoff:${taskId}:destination`, targetAgentId);
    context.set(`handoff:${taskId}:correlationId`, correlationId);

    // Track state execution
    hndContext.executionState[taskId] = "completed";

    // Simulate recovery timeouts and network latency inside handoff manager (Task 14.7D Sandbox)
    const timeoutMs = request.timeoutMs || 5000;
    let success = false;
    let attempt = 0;
    const maxAttempts = 2;

    while (true) {
      try {
        attempt++;
        // Execute dynamic verification wait
        await Promise.race([
          new Promise((resolve) => setTimeout(resolve, 50)),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Handoff network dispatch timed out")), timeoutMs)
          ),
        ]);

        success = true;
        break;
      } catch (err: any) {
        if (attempt < maxAttempts) {
          logger.warn(`Handoff dispatch failed: ${err.message}. Retrying... attempt ${attempt + 1}`, {}, fromAgentId);
          hndContext.timelineEvents.push(`Retry attempt ${attempt + 1}`);
          continue;
        }
        success = false;
        hndContext.timelineEvents.push(`Timeout/dispatch error: ${err.message}`);
        break;
      }
    }

    const durationMs = Date.now() - startedAt;

    if (success) {
      hndContext.status = "completed";
      hndContext.timelineEvents.push(`Handoff completed to ${targetAgentId}`);

      // ── Telemetry: Emit AGENT_TRANSFERRED & HANDOFF_COMPLETED ──
      logger.info(`Agent context transferred`, { event: "AGENT_TRANSFERRED", fromAgentId, toAgentId: targetAgentId }, fromAgentId);
      logger.info(`Handoff operation completed`, { event: "HANDOFF_COMPLETED", durationMs }, fromAgentId);

      context.logHistory({
        taskId,
        agentId: fromAgentId,
        status: "completed",
        result: `Handoff successfully executed to agent: ${targetAgentId}`,
      });

      // If the target is the final Reviewer/Planner, we can simulate workflow finish telemetry
      if (targetAgentId === "planner-agent" && taskId.includes("review")) {
        logger.info(`Workflow planning pipeline complete`, { event: "WORKFLOW_COMPLETED" }, fromAgentId);
      }

      return {
        success: true,
        transferredData,
        durationMs,
        senderAgentId: fromAgentId,
        receiverAgentId: targetAgentId,
        sharedMetadata: hndContext.sharedMetadata,
      };
    } else {
      hndContext.status = "failed";
      // ── Telemetry: Emit HANDOFF_FAILED ──
      logger.error(`Handoff operation failed`, { event: "HANDOFF_FAILED", fromAgentId, toAgentId: targetAgentId }, fromAgentId);

      return {
        success: false,
        transferredData: {},
        error: "Dispatch timeout occurred during dynamic handoff transfer.",
        durationMs,
      };
    }
  }
}
