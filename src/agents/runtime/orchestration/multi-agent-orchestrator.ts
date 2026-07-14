// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Multi-Agent Orchestrator
// Coordinates the sequential/collaboration flow across Planner, Research,
// Tool, Memory, and Reviewer agents via a central orchestration engine.
// Supports dependency-aware parallel execution and queue-based job scheduling.
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentRegistry } from "../agent-registry";
import type { AgentRuntimeCoordinator } from "../agent-runtime-coordinator";
import { AgentHandoffManager } from "../planning/agent-handoff-manager";
import { SharedPlanningContext } from "../planning/shared-planning-context";
import type {
  OrchestratorConfiguration,
  OrchestratorContext,
  OrchestratorResult,
  OrchestratorState,
} from "../../types/orchestration";
import type { HandoffRequest } from "../../types/planning";
import { ParallelExecutionScheduler } from "./parallel-execution-scheduler";
import type { ExecutionBranch, ExecutionBarrier, SynchronizationContext } from "../../types/parallel";
import { AgentQueueManager } from "./agent-queue-manager";

export class MultiAgentOrchestrator {
  private registry: AgentRegistry;
  private coordinator: AgentRuntimeCoordinator;
  private handoffManager: AgentHandoffManager;
  private config: OrchestratorConfiguration;
  private queueManager: AgentQueueManager;

  private currentContext?: OrchestratorContext;
  private activeSyncContext?: SynchronizationContext;
  private isPaused = false;
  private isCancelled = false;

  constructor(
    registry: AgentRegistry,
    coordinator: AgentRuntimeCoordinator,
    config: OrchestratorConfiguration = {},
    queueManager?: AgentQueueManager
  ) {
    this.registry = registry;
    this.coordinator = coordinator;
    this.handoffManager = new AgentHandoffManager();
    this.config = {
      maxExecutionTimeMs: 30000,
      maxRetries: 2,
      requireManualApproval: false,
      parallelExecutionEnabled: false,
      ...config,
    };
    // Task 15.3A/G Dependency Injection
    this.queueManager = queueManager || new AgentQueueManager({}, console);
  }

  /**
   * Task 15.1D: Lifecycle Control Start (Integrated with Queue execution bounds)
   */
  async start(goal: string, logger: any = console, correlationId = `corr-${Date.now()}`): Promise<OrchestratorResult> {
    const startedAt = Date.now();
    this.isPaused = false;
    this.isCancelled = false;

    // Enqueue execution job (Task 15.3B/C Scheduling Integration)
    const job = this.queueManager.enqueue("planner-agent", goal, "medium");
    this.queueManager.startExecution(job.id);

    // ── Telemetry: Emit ORCHESTRATION_STARTED ──
    logger.info(`Multi-Agent Orchestrator started orchestration`, { event: "ORCHESTRATION_STARTED", goal, correlationId });

    const orchestrationId = `orch-${Date.now()}`;
    const context: OrchestratorContext = {
      orchestrationId,
      correlationId,
      currentState: "idle" as OrchestratorState,
      currentAgentId: undefined,
      progress: 0,
      executionTimeMs: 0,
      currentStepIndex: 0,
      totalSteps: 5,
      sharedVariables: {},
      sharedMetadata: { goal, jobId: job.id },
    };

    this.currentContext = context;
    const sharedContext = new SharedPlanningContext({ logger });

    try {
      // 1. Planning Step (Planner Agent)
      this.checkCancellation();
      await this.yieldIfPaused(logger);
      context.currentState = "planning";
      context.currentAgentId = "planner-agent";
      context.currentStepIndex = 1;
      context.progress = 15;
      
      // Emit AGENT_STARTED telemetry
      logger.info(`Orchestration starting Agent: planner-agent`, { event: "AGENT_STARTED", agentId: "planner-agent" });
      const planOutput = await this.executeAgentStep("planner-agent", goal, sharedContext, logger);
      logger.info(`Orchestration completed Agent: planner-agent`, { event: "AGENT_COMPLETED", agentId: "planner-agent" });

      let executionVariables: Record<string, unknown> = { planOutput };

      // Check if parallel execution branch flow is enabled (Task 15.2B/C)
      if (this.config.parallelExecutionEnabled) {
        this.checkCancellation();
        await this.yieldIfPaused(logger);

        // Transition State Machine states
        context.currentState = "researching";
        context.currentAgentId = "parallel-branches";
        context.currentStepIndex = 2;
        context.progress = 40;

        const scheduler = new ParallelExecutionScheduler(logger);
        
        // Define two independent execution branches with a join point barrier
        const activeBranches: ExecutionBranch[] = [
          { branchId: "branch-research", taskIds: ["task-research"], status: "pending" },
          { branchId: "branch-tools", taskIds: ["task-tools"], status: "pending" },
        ];

        // Define a barrier requiring both branches to finish before merging context
        const barriers: ExecutionBarrier[] = [
          {
            barrierId: "barrier-join",
            dependencyBranchIds: ["branch-research", "branch-tools"],
            satisfiedBranchIds: [],
            isSatisfied: false,
          }
        ];

        const syncContext: SynchronizationContext = {
          syncId: `sync-${orchestrationId}`,
          activeBranches,
          barriers,
          variables: { goal, planOutput },
        };

        this.activeSyncContext = syncContext;

        const mergedVars = await scheduler.execute(syncContext, async (branchId, vars) => {
          if (branchId === "branch-research") {
            // Handoff to Research
            await this.dispatchHandoff("planner-agent", "research-agent", "task-research", vars, sharedContext, correlationId);
            const researchOutput = await this.executeAgentStep("research-agent", `Research resources for: ${goal}`, sharedContext, logger);
            return { researchOutput };
          } else {
            // Handoff to Tool
            await this.dispatchHandoff("planner-agent", "tool-agent", "task-tools", vars, sharedContext, correlationId);
            const toolPayload = JSON.stringify({ toolId: "io_http", config: { method: "GET", url: "https://httpbin.org/get" } });
            const toolOutput = await this.executeAgentStep("tool-agent", toolPayload, sharedContext, logger);
            return { toolOutput };
          }
        }, 15000, this.config.maxRetries);

        executionVariables = { ...executionVariables, ...mergedVars };

      } else {
        // Fallback to sequential flow (Planner -> Research -> Tool)
        // 2. Research Step (Research Agent)
        this.checkCancellation();
        await this.yieldIfPaused(logger);
        context.currentState = "researching";
        context.currentAgentId = "research-agent";
        context.currentStepIndex = 2;
        context.progress = 35;

        // Handoff Planner -> Research
        await this.dispatchHandoff("planner-agent", "research-agent", "task-research", { planOutput }, sharedContext, correlationId);

        logger.info(`Orchestration starting Agent: research-agent`, { event: "AGENT_STARTED", agentId: "research-agent" });
        const researchOutput = await this.executeAgentStep("research-agent", `Research resources for: ${goal}`, sharedContext, logger);
        logger.info(`Orchestration completed Agent: research-agent`, { event: "AGENT_COMPLETED", agentId: "research-agent" });

        // 3. Tool Step (Tool Agent)
        this.checkCancellation();
        await this.yieldIfPaused(logger);
        context.currentState = "executing_tools";
        context.currentAgentId = "tool-agent";
        context.currentStepIndex = 3;
        context.progress = 55;

        // Handoff Research -> Tool
        await this.dispatchHandoff("research-agent", "tool-agent", "task-tools", { researchOutput }, sharedContext, correlationId);

        logger.info(`Orchestration starting Agent: tool-agent`, { event: "AGENT_STARTED", agentId: "tool-agent" });
        const toolPayload = JSON.stringify({ toolId: "io_http", config: { method: "GET", url: "https://httpbin.org/get" } });
        const toolOutput = await this.executeAgentStep("tool-agent", toolPayload, sharedContext, logger);
        logger.info(`Orchestration completed Agent: tool-agent`, { event: "AGENT_COMPLETED", agentId: "tool-agent" });

        executionVariables.researchOutput = researchOutput;
        executionVariables.toolOutput = toolOutput;
      }

      // 4. Memory Step (Memory Agent)
      this.checkCancellation();
      await this.yieldIfPaused(logger);
      context.currentState = "updating_memory";
      context.currentAgentId = "memory-agent";
      context.currentStepIndex = 4;
      context.progress = 75;

      // Handoff Tool -> Memory
      await this.dispatchHandoff(
        "tool-agent",
        "memory-agent",
        "task-memory",
        executionVariables,
        sharedContext,
        correlationId
      );

      logger.info(`Orchestration starting Agent: memory-agent`, { event: "AGENT_STARTED", agentId: "memory-agent" });
      const memoryPayload = JSON.stringify({ type: "create", scope: "global", key: `goal_${orchestrationId}`, value: goal });
      const memoryOutput = await this.executeAgentStep("memory-agent", memoryPayload, sharedContext, logger);
      logger.info(`Orchestration completed Agent: memory-agent`, { event: "AGENT_COMPLETED", agentId: "memory-agent" });

      executionVariables.memoryOutput = memoryOutput;

      // 5. Reviewer Step (Reviewer Agent)
      this.checkCancellation();
      await this.yieldIfPaused(logger);
      context.currentState = "reviewing";
      context.currentAgentId = "reviewer-agent";
      context.currentStepIndex = 5;
      context.progress = 95;

      // Handoff Memory -> Reviewer
      await this.dispatchHandoff("memory-agent", "reviewer-agent", "task-review", executionVariables, sharedContext, correlationId);

      logger.info(`Orchestration starting Agent: reviewer-agent`, { event: "AGENT_STARTED", agentId: "reviewer-agent" });
      const reviewPayload = JSON.stringify({ id: orchestrationId, planId: orchestrationId, tasks: [] });
      const reviewerOutput = await this.executeAgentStep("reviewer-agent", reviewPayload, sharedContext, logger);
      logger.info(`Orchestration completed Agent: reviewer-agent`, { event: "AGENT_COMPLETED", agentId: "reviewer-agent" });

      context.currentState = "completed";
      context.progress = 100;

      const durationMs = Date.now() - startedAt;
      context.executionTimeMs = durationMs;

      // Complete execution inside Queue manager (Task 15.3C Lifecycle completed)
      this.queueManager.completeExecution(job.id, sharedContext.getAll());

      // ── Telemetry: Emit ORCHESTRATION_COMPLETED ──
      logger.info(`Multi-Agent Orchestrator completed execution successfully`, {
        event: "ORCHESTRATION_COMPLETED",
        orchestrationId,
        durationMs,
      });

      return {
        orchestrationId,
        success: true,
        finalState: "completed",
        output: reviewerOutput,
        durationMs,
        stepsExecuted: 5,
        variables: sharedContext.getAll(),
      };

    } catch (err: any) {
      const durationMs = Date.now() - startedAt;
      context.currentState = this.isCancelled ? "cancelled" : "failed";
      context.executionTimeMs = durationMs;

      if (this.isCancelled) {
        this.queueManager.cancelExecution(job.id);
      } else {
        // Fail execution in Queue manager (Task 15.3D Retries/DLQ)
        this.queueManager.failExecution(job.id, err.message);
      }

      const eventName = this.isCancelled ? "ORCHESTRATION_COMPLETED" : "ORCHESTRATION_FAILED";
      logger.error(`Orchestration finished in state: ${context.currentState}. Error: ${err.message}`, {
        event: eventName,
        orchestrationId,
        error: err.message,
      });

      return {
        orchestrationId,
        success: false,
        finalState: context.currentState,
        output: "",
        error: err.message,
        durationMs,
        stepsExecuted: context.currentStepIndex,
        variables: sharedContext.getAll(),
      };
    }
  }

  /**
   * Task 15.1D: Lifecycle Control Pause
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Task 15.1D: Lifecycle Control Resume
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * Task 15.1D: Lifecycle Control Cancel
   */
  cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Task 15.1D: Lifecycle Control Restart
   */
  async restart(goal: string, logger: any = console): Promise<OrchestratorResult> {
    logger.info(`Multi-Agent Orchestrator restarting session`, { goal });
    return this.start(goal, logger);
  }

  /**
   * Task 15.1F & Task 15.2F: Expose Context and Synchronization for Execution Inspector
   */
  getContext(): OrchestratorContext | undefined {
    return this.currentContext;
  }

  getActiveSynchronizationContext(): SynchronizationContext | undefined {
    return this.activeSyncContext;
  }

  getQueueManager(): AgentQueueManager {
    return this.queueManager;
  }

  private checkCancellation(): void {
    if (this.isCancelled) {
      throw new Error("Orchestration cancelled by user");
    }
  }

  private async yieldIfPaused(logger: any): Promise<void> {
    if (!this.isPaused) return;
    logger.info("Orchestration paused. Waiting for resume signal...");
    while (this.isPaused) {
      this.checkCancellation();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    logger.info("Orchestration resumed.");
  }

  private async executeAgentStep(
    agentId: string,
    prompt: string,
    sharedContext: SharedPlanningContext,
    logger: any
  ): Promise<string> {
    const runtime = this.coordinator.getRuntime(agentId);
    const session = runtime.createSession(`orch-sess-${agentId}-${Date.now()}`);

    // Map workflow services and logger variables
    session.context.variables = {
      ...session.context.variables,
      ...sharedContext.getAll(),
      logger,
    };

    const output = await runtime.runStep(session, prompt);

    // Save outputs back to context
    sharedContext.set(`agent:${agentId}:output`, output);
    return output;
  }

  private async dispatchHandoff(
    from: string,
    to: string,
    taskId: string,
    payload: Record<string, unknown>,
    sharedContext: SharedPlanningContext,
    correlationId: string
  ): Promise<void> {
    const handoffReq: HandoffRequest = {
      fromAgentId: from,
      toAgentId: to,
      taskId,
      payload,
      correlationId,
    };
    const res = await this.handoffManager.executeHandoff(handoffReq, sharedContext);
    if (!res.success) {
      throw new Error(`Orchestration handoff from "${from}" to "${to}" failed: ${res.error}`);
    }
  }
}
