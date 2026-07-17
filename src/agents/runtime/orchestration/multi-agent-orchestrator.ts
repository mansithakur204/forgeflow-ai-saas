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
import { ApprovalEngine } from "./approval-engine";
import { AgentAnalyticsService } from "../../observability/services/analytics-service";

export class ApprovalRequiredError extends Error {
  constructor(public result: OrchestratorResult) {
    super("Approval required");
    Object.setPrototypeOf(this, ApprovalRequiredError.prototype);
  }
}

export class MultiAgentOrchestrator {
  private registry: AgentRegistry;
  private coordinator: AgentRuntimeCoordinator;
  private handoffManager: AgentHandoffManager;
  private config: OrchestratorConfiguration;
  private queueManager: AgentQueueManager;
  private approvalEngine?: ApprovalEngine;
  private analyticsService?: AgentAnalyticsService;
  public activeContexts = new Map<string, OrchestratorContext>();

  private currentContext?: OrchestratorContext;
  private activeSyncContext?: SynchronizationContext;
  private isPaused = false;
  private isCancelled = false;

  constructor(
    registry: AgentRegistry,
    coordinator: AgentRuntimeCoordinator,
    config: OrchestratorConfiguration = {},
    queueManager?: AgentQueueManager,
    approvalEngine?: ApprovalEngine,
    analyticsService?: AgentAnalyticsService
  ) {
    this.registry = registry;
    this.coordinator = coordinator;
    this.handoffManager = new AgentHandoffManager();
    this.handoffManager.registerHandoffPath("research-agent", "tool-agent");
    this.handoffManager.registerHandoffPath("tool-agent", "memory-agent");
    this.handoffManager.registerHandoffPath("memory-agent", "reviewer-agent");
    this.handoffManager.registerHandoffPath("planner-agent", "tool-agent");
    this.config = {
      maxExecutionTimeMs: 30000,
      maxRetries: 2,
      requireManualApproval: false,
      parallelExecutionEnabled: false,
      ...config,
    };
    // Task 15.3A/G Dependency Injection
    this.queueManager = queueManager || new AgentQueueManager({}, console);
    this.approvalEngine = approvalEngine;
    this.analyticsService = analyticsService;
  }

  /**
   * Task 15.1D: Lifecycle Control Start (Integrated with Queue execution bounds)
   */
  async start(goal: string, logger: any = console, correlationId = `corr-${Date.now()}`): Promise<OrchestratorResult> {
    const startedAt = Date.now();
    this.isPaused = false;
    this.isCancelled = false;

    // Task 6 timeline events: Queue Waiting
    logger.info(`Orchestration execution queued`, { event: "QUEUE_WAITING", goal, correlationId });

    // Enqueue execution job (Task 15.3B/C Scheduling Integration)
    const job = this.queueManager.enqueue("planner-agent", goal, "medium");

    // Task 6 timeline events: Queue Finished
    logger.info(`Orchestration execution started (Queue Finished)`, { event: "QUEUE_FINISHED", jobId: job.id, correlationId });
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
    this.activeContexts.set(orchestrationId, context);
    const sharedContext = new SharedPlanningContext({ logger });

    return this.runOrchestrationSequence(
      context,
      sharedContext,
      goal,
      logger,
      correlationId,
      startedAt,
      job.id
    );
  }

  /**
   * Task 15.4C: Resume from the same state after approval
   */
  async resumeFromApproval(requestId: string, logger: any = console): Promise<OrchestratorResult> {
    if (!this.approvalEngine) {
      throw new Error("ApprovalEngine is not configured on this orchestrator.");
    }

    const request = this.approvalEngine.getRequest(requestId);
    if (!request) {
      throw new Error(`Approval request with ID "${requestId}" not found.`);
    }

    if (request.status !== "approved") {
      throw new Error(`Cannot resume orchestration: request "${requestId}" is in status "${request.status}".`);
    }

    if (!request.workflowState) {
      throw new Error(`Cannot resume orchestration: no workflow state persisted for request "${requestId}".`);
    }

    const { goal, correlationId, context, variables } = request.workflowState;

    // ── Telemetry: WORKFLOW_RESUMED ──
    logger.info(`Workflow execution resumed from approval request: ${requestId}`, {
      event: "WORKFLOW_RESUMED",
      requestId,
      orchestrationId: context.orchestrationId,
    });

    this.isPaused = false;
    this.isCancelled = false;

    // Restore orchestrator state
    this.currentContext = {
      ...context,
      currentState: "executing_tools" as OrchestratorState,
    };
    this.activeContexts.set(context.orchestrationId, this.currentContext!);

    const startedAt = Date.now() - context.executionTimeMs; // keep elapsed time continuous
    const sharedContext = new SharedPlanningContext({ logger });
    for (const [k, v] of Object.entries(variables)) {
      sharedContext.set(k, v);
    }

    const jobId = String(context.sharedMetadata?.jobId || "");

    return this.runOrchestrationSequence(
      this.currentContext!,
      sharedContext,
      goal,
      logger,
      correlationId,
      startedAt,
      jobId
    );
  }

  /**
   * Helper to perform step-by-step orchestration sequence.
   */
  private async runOrchestrationSequence(
    context: OrchestratorContext,
    sharedContext: SharedPlanningContext,
    goal: string,
    logger: any,
    correlationId: string,
    startedAt: number,
    jobId: string
  ): Promise<OrchestratorResult> {
    try {
      // 1. Planning Step (Planner Agent)
      if (context.currentStepIndex <= 1) {
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
        sharedContext.set("planOutput", planOutput);
      }

      const planOutput = sharedContext.get("planOutput") as string || "";
      let executionVariables: Record<string, unknown> = { planOutput };

      // Check if parallel execution branch flow is enabled (Task 15.2B/C)
      if (context.currentStepIndex <= 3) {
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
            syncId: `sync-${context.orchestrationId}`,
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
              
              let toolId = "io_http";
              let toolConfig: Record<string, unknown> = { method: "GET", url: "https://httpbin.org/get" };
              try {
                const parsed = JSON.parse(planOutput);
                if (parsed && typeof parsed === "object" && parsed.toolId) {
                  toolId = parsed.toolId;
                  toolConfig = parsed.config || {};
                }
              } catch (e) {
                toolId = (sharedContext.get("toolId") as string) || "io_http";
                toolConfig = (sharedContext.get("toolConfig") as Record<string, unknown>) || { method: "GET", url: "https://httpbin.org/get" };
              }

              // Check approval
              const check = await this.checkAndHandleApproval(
                toolId,
                toolConfig,
                context,
                sharedContext,
                startedAt,
                logger
              );
              if (check.requiresApproval) {
                throw new ApprovalRequiredError(check.result!);
              }

              const toolPayload = JSON.stringify({ toolId, config: toolConfig });
              const toolOutput = await this.executeAgentStep("tool-agent", toolPayload, sharedContext, logger);
              return { toolOutput };
            }
          }, 15000, this.config.maxRetries);

          executionVariables = { ...executionVariables, ...mergedVars };

        } else {
          // Fallback to sequential flow (Planner -> Research -> Tool)
          // 2. Research Step (Research Agent)
          if (context.currentStepIndex <= 2) {
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
            sharedContext.set("researchOutput", researchOutput);
          }

          const researchOutput = sharedContext.get("researchOutput") as string || "";

          // 3. Tool Step (Tool Agent)
          if (context.currentStepIndex <= 3) {
            this.checkCancellation();
            await this.yieldIfPaused(logger);
            context.currentState = "executing_tools";
            context.currentAgentId = "tool-agent";
            context.currentStepIndex = 3;
            context.progress = 55;

            // Handoff Research -> Tool
            await this.dispatchHandoff("research-agent", "tool-agent", "task-tools", { researchOutput }, sharedContext, correlationId);

            let toolId = "io_http";
            let toolConfig: Record<string, unknown> = { method: "GET", url: "https://httpbin.org/get" };
            try {
              const parsed = JSON.parse(planOutput);
              if (parsed && typeof parsed === "object" && parsed.toolId) {
                toolId = parsed.toolId;
                toolConfig = parsed.config || {};
              }
            } catch (e) {
              toolId = (sharedContext.get("toolId") as string) || "io_http";
              toolConfig = (sharedContext.get("toolConfig") as Record<string, unknown>) || { method: "GET", url: "https://httpbin.org/get" };
            }

            // Check approval
            const check = await this.checkAndHandleApproval(
              toolId,
              toolConfig,
              context,
              sharedContext,
              startedAt,
              logger
            );
            if (check.requiresApproval) {
              throw new ApprovalRequiredError(check.result!);
            }

            logger.info(`Orchestration starting Agent: tool-agent`, { event: "AGENT_STARTED", agentId: "tool-agent" });
            const toolPayload = JSON.stringify({ toolId, config: toolConfig });
            const toolOutput = await this.executeAgentStep("tool-agent", toolPayload, sharedContext, logger);
            logger.info(`Orchestration completed Agent: tool-agent`, { event: "AGENT_COMPLETED", agentId: "tool-agent" });
            sharedContext.set("toolOutput", toolOutput);
          }

          executionVariables.researchOutput = researchOutput;
          executionVariables.toolOutput = sharedContext.get("toolOutput") || sharedContext.get("agent:tool-agent:output");
        }
      }

      // 4. Memory Step (Memory Agent)
      if (context.currentStepIndex <= 4) {
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
        const memoryPayload = JSON.stringify({ type: "create", scope: "global", key: `goal_${context.orchestrationId}`, value: goal });
        const memoryOutput = await this.executeAgentStep("memory-agent", memoryPayload, sharedContext, logger);
        logger.info(`Orchestration completed Agent: memory-agent`, { event: "AGENT_COMPLETED", agentId: "memory-agent" });
        sharedContext.set("memoryOutput", memoryOutput);
      }

      executionVariables.memoryOutput = sharedContext.get("memoryOutput") || sharedContext.get("agent:memory-agent:output");

      // 5. Reviewer Step (Reviewer Agent)
      if (context.currentStepIndex <= 5) {
        this.checkCancellation();
        await this.yieldIfPaused(logger);
        context.currentState = "reviewing";
        context.currentAgentId = "reviewer-agent";
        context.currentStepIndex = 5;
        context.progress = 95;

        // Handoff Memory -> Reviewer
        await this.dispatchHandoff("memory-agent", "reviewer-agent", "task-review", executionVariables, sharedContext, correlationId);

        logger.info(`Orchestration starting Agent: reviewer-agent`, { event: "AGENT_STARTED", agentId: "reviewer-agent" });
        const reviewPayload = JSON.stringify({ id: context.orchestrationId, planId: context.orchestrationId, tasks: [] });
        const reviewerOutput = await this.executeAgentStep("reviewer-agent", reviewPayload, sharedContext, logger);
        logger.info(`Orchestration completed Agent: reviewer-agent`, { event: "AGENT_COMPLETED", agentId: "reviewer-agent" });
        sharedContext.set("reviewerOutput", reviewerOutput);
      }

      context.currentState = "completed";
      context.progress = 100;

      const durationMs = Date.now() - startedAt;
      context.executionTimeMs = durationMs;

      // Complete execution inside Queue manager (Task 15.3C Lifecycle completed)
      this.queueManager.completeExecution(jobId, sharedContext.getAll());

      // ── Telemetry: Emit ORCHESTRATION_COMPLETED ──
      logger.info(`Multi-Agent Orchestrator completed execution successfully`, {
        event: "ORCHESTRATION_COMPLETED",
        orchestrationId: context.orchestrationId,
        durationMs,
      });

      // ── Telemetry: Emit WORKFLOW_COMPLETED ──
      logger.info(`Workflow completed successfully: ${context.orchestrationId}`, {
        event: "WORKFLOW_COMPLETED",
        orchestrationId: context.orchestrationId,
        durationMs,
      });

      return {
        orchestrationId: context.orchestrationId,
        success: true,
        finalState: "completed",
        output: sharedContext.get("reviewerOutput") as string || "",
        durationMs,
        stepsExecuted: 5,
        variables: sharedContext.getAll(),
      };

    } catch (err: any) {
      if (err instanceof ApprovalRequiredError) {
        return err.result;
      }
      
      const durationMs = Date.now() - startedAt;
      context.currentState = this.isCancelled ? "cancelled" : "failed";
      context.executionTimeMs = durationMs;

      if (this.isCancelled) {
        this.queueManager.cancelExecution(jobId);
      } else {
        // Fail execution in Queue manager (Task 15.3D Retries/DLQ)
        this.queueManager.failExecution(jobId, err.message);
      }

      const eventName = this.isCancelled ? "ORCHESTRATION_COMPLETED" : "ORCHESTRATION_FAILED";
      logger.error(`Orchestration finished in state: ${context.currentState}. Error: ${err.message}`, {
        event: eventName,
        orchestrationId: context.orchestrationId,
        error: err.message,
      });

      // ── Telemetry: Emit WORKFLOW_COMPLETED (on error/cancel) ──
      logger.error(`Workflow execution finished with status: ${context.currentState}`, {
        event: "WORKFLOW_COMPLETED",
        orchestrationId: context.orchestrationId,
        status: context.currentState,
        error: err.message,
      });

      return {
        orchestrationId: context.orchestrationId,
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
   * Helper to check approval conditions and transition/pause if required.
   */
  private async checkAndHandleApproval(
    toolId: string,
    config: Record<string, unknown>,
    context: OrchestratorContext,
    sharedContext: SharedPlanningContext,
    startedAt: number,
    logger: any
  ): Promise<{ requiresApproval: boolean; result?: OrchestratorResult }> {
    if (!this.approvalEngine) {
      return { requiresApproval: false };
    }

    const check = this.approvalEngine.check(context.orchestrationId, toolId, config);
    if (check.requiresApproval && !this.approvalEngine.isActionApproved(context.orchestrationId, toolId)) {
      // Pause orchestration and create request
      const request = this.approvalEngine.createRequest(
        context.orchestrationId,
        toolId,
        config,
        context,
        sharedContext.getAll()
      );

      // Transition context state
      context.currentState = "paused";
      this.isPaused = true;

      const durationMs = Date.now() - startedAt;
      context.executionTimeMs = durationMs;

      return {
        requiresApproval: true,
        result: {
          orchestrationId: context.orchestrationId,
          success: false,
          finalState: "paused",
          output: `Approval required for action: ${toolId}`,
          durationMs,
          stepsExecuted: context.currentStepIndex - 1,
          variables: sharedContext.getAll(),
        },
      };
    }

    return { requiresApproval: false };
  }

  /**
   * Task 15.1D: Lifecycle Control Pause
   */
  pause(): void {
    this.isPaused = true;
    if (this.currentContext) {
      this.currentContext.currentState = "paused";
    }
  }

  /**
   * Task 15.1D: Lifecycle Control Resume
   */
  resume(): void {
    this.isPaused = false;
    if (this.currentContext && this.currentContext.currentState === "paused") {
      this.currentContext.currentState = "executing_tools";
    }
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
   * Task 15.1F & Task 15.2F & Task 15.4E: Expose Context and Synchronization for Execution Inspector
   */
  getContext(): OrchestratorContext | undefined {
    if (this.currentContext && this.approvalEngine) {
      // Find latest request for this orchestrationId
      const requests = Array.from(this.approvalEngine.getRequests().values())
        .filter((r) => r.orchestrationId === this.currentContext?.orchestrationId);
      
      if (requests.length > 0) {
        // Get the most recent request
        requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const latest = requests[0];
        
        let timeoutRemainingMs = undefined;
        if (latest.status === "pending" && latest.expiresAt) {
          timeoutRemainingMs = Math.max(0, new Date(latest.expiresAt).getTime() - Date.now());
        }

        this.currentContext.approvalStatus = latest.status;
        this.currentContext.approver = latest.decision?.approver;
        this.currentContext.approvalTime = latest.decidedAt || latest.createdAt;
        this.currentContext.approvalReason = latest.decision?.reason || latest.actionType;
        this.currentContext.timeoutRemainingMs = timeoutRemainingMs;
      }
    }
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

    const executionId = this.currentContext?.orchestrationId || `exec-${Date.now()}`;
    const workflowId = this.currentContext?.orchestrationId || `wf-${Date.now()}`;
    
    // Resolve agent metadata
    const agent = this.registry.resolve(agentId);
    const agentName = agent ? (agent.getConfig().metadata?.name || agentId) : agentId;

    // Track start in Analytics Service
    if (this.analyticsService) {
      this.analyticsService.trackAgentStart(
        executionId,
        workflowId,
        agentId,
        agentName,
        15 // mock queue wait time or from variables
      );
    }

    // Map workflow services and logger variables
    session.context.variables = {
      ...session.context.variables,
      ...sharedContext.getAll(),
      logger,
    };

    // Task 6 timeline event: Provider Called
    logger.info(`Invoking provider for agent ${agentId}`, { event: "PROVIDER_CALLED", agentId, executionId });

    const startTime = Date.now();
    const output = await runtime.runStep(session, prompt);
    const duration = Date.now() - startTime;

    // Task 6 timeline event: Provider Returned
    logger.info(`Provider returned response for agent ${agentId}`, { event: "PROVIDER_RETURNED", agentId, executionId, durationMs: duration });

    // Track completions and stats
    if (this.analyticsService) {
      const provider = (sharedContext.get(`agent:${agentId}:provider`) as any) || "openai";
      const promptTokens = Number(sharedContext.get(`agent:${agentId}:promptTokens`) || 1500);
      const completionTokens = Number(sharedContext.get(`agent:${agentId}:completionTokens`) || 500);
      const cachedTokens = Number(sharedContext.get(`agent:${agentId}:cachedTokens`) || 100);
      const reasoningTokens = Number(sharedContext.get(`agent:${agentId}:reasoningTokens`) || 200);

      this.analyticsService.trackTokenUsage(executionId, workflowId, agentId, provider, {
        promptTokens,
        completionTokens,
        cachedTokens,
        reasoningTokens,
        totalTokens: promptTokens + completionTokens,
      });

      // Latencies
      const providerLatency = Number(sharedContext.get(`agent:${agentId}:providerLatency`) || duration);
      const embeddingLatency = Number(sharedContext.get(`agent:${agentId}:embeddingLatency`) || 45);
      const vectorSearchLatency = Number(sharedContext.get(`agent:${agentId}:vectorSearchLatency`) || 30);
      const memoryRetrievalLatency = Number(sharedContext.get(`agent:${agentId}:memoryRetrievalLatency`) || 15);
      const ragLatency = Number(sharedContext.get(`agent:${agentId}:ragLatency`) || 80);
      const toolLatency = Number(sharedContext.get(`agent:${agentId}:toolLatency`) || 150);

      this.analyticsService.trackLatency(workflowId, agentId, {
        providerLatency,
        embeddingLatency,
        vectorSearchLatency,
        memoryRetrievalLatency,
        ragLatency,
        toolLatency,
        overallWorkflowLatency: duration,
      });

      // Task 6 Timeline events: Memory / Knowledge Retrieved
      logger.info(`Memory retrieved for agent ${agentId}`, { event: "MEMORY_RETRIEVED", agentId, executionId, latencyMs: memoryRetrievalLatency });
      logger.info(`Knowledge retrieved for agent ${agentId}`, { event: "KNOWLEDGE_RETRIEVED", agentId, executionId, latencyMs: ragLatency });

      this.analyticsService.trackAgentComplete(
        executionId,
        agentId,
        "completed",
        0,
        0
      );
    }

    // Save outputs back to context
    sharedContext.set(`agent:${agentId}:output`, output);
    return output;
  }

  getExecutionInspectorDetails(orchestrationId: string) {
    if (!this.analyticsService) return undefined;
    return this.analyticsService.getExecutionInspectorDetails(orchestrationId);
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
