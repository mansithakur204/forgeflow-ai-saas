// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Runner
// Orchestrates workflow lifecycle: start, stop, cancel, and state tracking.
// ─────────────────────────────────────────────────────────────────────────────

import { ExecutionContext } from "@/engine/context/execution-context";
import { RuntimeError } from "@/engine/errors/runtime-errors";
import { validateWorkflowGraph } from "@/engine/graph/validate-graph";
import { InMemoryExecutionLogger } from "@/engine/logging/in-memory-logger";
import { ExecutionQueue } from "@/engine/queue/execution-queue";
import { resolveExecutionOrder } from "@/engine/runtime/execution-order";
import { NodeRunner } from "@/engine/runtime/node-runner";
import { ExecutionStateMachine } from "@/engine/state/execution-state-machine";
import { RetryManager } from "@/engine/runtime/retry-manager";
import { createDefaultExecutorRegistry } from "@/engine/executors/registry/executor-registry";
import type { ReadonlyExecutorRegistry } from "@/engine/types/executor";
import type {
  NodeExecution,
  WorkflowRun,
  WorkflowRunStatus,
} from "@/engine/types/execution";
import type {
  ActiveRunControl,
  StartWorkflowInput,
  WorkflowRunSnapshot,
  WorkflowRunnerOptions,
} from "@/engine/types/runtime";
import type { WorkflowDefinition, WorkflowNode } from "@/engine/types/workflow-graph";

let nodeExecutionCounter = 0;

function nextNodeExecutionId(): string {
  nodeExecutionCounter += 1;
  return `node-exec-${nodeExecutionCounter}`;
}

interface ActiveRun {
  context: ExecutionContext;
  run: WorkflowRun;
  nodeExecutions: Map<string, NodeExecution>;
  control: ActiveRunControl;
  executionPromise: Promise<WorkflowRunSnapshot> | null;
}

export class WorkflowRunner {
  private readonly stateMachine: ExecutionStateMachine;
  private readonly nodeRunner: NodeRunner;
  private readonly queue: ExecutionQueue;
  private readonly executor: WorkflowRunnerOptions["executor"];
  private readonly executorRegistry: ReadonlyExecutorRegistry;
  private readonly retryManager: RetryManager;
  private readonly activeRuns = new Map<string, ActiveRun>();

  constructor(options: WorkflowRunnerOptions) {
    this.executor = options.executor;
    this.executorRegistry = options.executorRegistry ?? createDefaultExecutorRegistry().asReadonly();
    this.retryManager = new RetryManager();
    this.stateMachine = new ExecutionStateMachine();
    this.nodeRunner = new NodeRunner({ stateMachine: this.stateMachine });
    this.queue = new ExecutionQueue(options.queue);
  }

  async start(input: StartWorkflowInput): Promise<WorkflowRunSnapshot> {
    if (this.activeRuns.has(input.runId)) {
      throw new RuntimeError(
        "RUN_ALREADY_ACTIVE",
        `Workflow run "${input.runId}" is already active`,
        { runId: input.runId }
      );
    }

    const validation = validateWorkflowGraph(input.workflow);
    if (!validation.valid) {
      throw new RuntimeError(
        "GRAPH_VALIDATION_FAILED",
        "Workflow graph validation failed",
        { runId: input.runId, details: validation.errors }
      );
    }

    const logger = new InMemoryExecutionLogger();
    const context = new ExecutionContext({
      runId: input.runId,
      workflow: input.workflow,
      initiatedBy: input.initiatedBy,
      trigger: input.trigger,
      environment: input.environment,
      services: { logger },
    });

    const run = this.createWorkflowRun(input);
    const nodeExecutions = this.createNodeExecutions(input.runId, input.workflow);
    const control: ActiveRunControl = {
      cancelRequested: false,
      stopRequested: false,
    };

    const activeRun: ActiveRun = {
      context,
      run,
      nodeExecutions,
      control,
      executionPromise: null,
    };

    this.activeRuns.set(input.runId, activeRun);
    this.applyWorkflowTransition(activeRun, "queued");

    this.queue.enqueue({
      type: "workflow",
      runId: input.runId,
      nodeId: null,
    });

    const executionPromise = this.processRun(activeRun, input.workflow);
    activeRun.executionPromise = executionPromise;

    return executionPromise;
  }

  async stop(runId: string): Promise<WorkflowRunSnapshot> {
    const activeRun = this.getActiveRun(runId);
    if (this.stateMachine.isTerminalWorkflowStatus(activeRun.run.status)) {
      throw new RuntimeError(
        "RUN_TERMINATED",
        `Workflow run "${runId}" has already terminated with status "${activeRun.run.status}"`,
        { runId }
      );
    }

    activeRun.control.stopRequested = true;
    loggerInfo(activeRun, "Stop requested — remaining nodes will be skipped after current node");

    if (activeRun.executionPromise) {
      return activeRun.executionPromise;
    }

    return this.buildSnapshot(activeRun);
  }

  async cancel(runId: string): Promise<WorkflowRunSnapshot> {
    const activeRun = this.getActiveRun(runId);
    if (this.stateMachine.isTerminalWorkflowStatus(activeRun.run.status)) {
      throw new RuntimeError(
        "RUN_TERMINATED",
        `Workflow run "${runId}" has already terminated with status "${activeRun.run.status}"`,
        { runId }
      );
    }

    activeRun.control.cancelRequested = true;
    activeRun.control.stopRequested = true;
    loggerInfo(activeRun, "Cancel requested — aborting workflow execution");

    if (activeRun.executionPromise) {
      return activeRun.executionPromise;
    }

    this.applyWorkflowTransition(activeRun, "cancelled");
    this.finalizeRun(activeRun);
    return this.buildSnapshot(activeRun);
  }

  getRun(runId: string): WorkflowRunSnapshot | undefined {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      return undefined;
    }
    return this.buildSnapshot(activeRun);
  }

  getQueue(): ExecutionQueue {
    return this.queue;
  }

  private async processRun(
    activeRun: ActiveRun,
    workflow: WorkflowDefinition
  ): Promise<WorkflowRunSnapshot> {
    const job = this.queue.dequeue();
    if (!job || job.runId !== activeRun.run.id) {
      throw new RuntimeError(
        "RUN_NOT_FOUND",
        `Expected workflow job for run "${activeRun.run.id}" was not found in queue`,
        { runId: activeRun.run.id }
      );
    }

    // Wait for a concurrency slot to become available instead of failing immediately
    while (!this.queue.hasCapacity()) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    if (!this.queue.acquireSlot()) {
      throw new RuntimeError(
        "RUN_ALREADY_ACTIVE",
        "Execution queue has no available concurrency slots",
        { runId: activeRun.run.id }
      );
    }

    try {
      this.applyWorkflowTransition(activeRun, "running");
      activeRun.run.startedAt = new Date().toISOString();
      loggerInfo(activeRun, "Workflow execution started");

      const orderedNodes = resolveExecutionOrder(workflow);
      let failedNodeId: string | null = null;

      for (const node of orderedNodes) {
        if (this.shouldAbortImmediately(activeRun)) {
          this.skipRemainingNodes(activeRun, orderedNodes, node, "cancelled");
          this.applyWorkflowTransition(activeRun, "cancelled");
          break;
        }

        if (activeRun.control.stopRequested) {
          this.skipRemainingNodes(activeRun, orderedNodes, node, "stop_requested");
          this.applyWorkflowTransition(activeRun, "cancelled");
          break;
        }

        if (this.hasUpstreamFailure(node.id, workflow, activeRun)) {
          const nodeExecution = this.getNodeExecution(activeRun, node.id);
          this.nodeRunner.skip(nodeExecution, "upstream_failure");
          activeRun.context.services.logger.warn(
            `Node "${node.id}" skipped due to upstream failure`,
            undefined,
            node.id
          );
          continue;
        }

        const nodeExecution = this.getNodeExecution(activeRun, node.id);
        nodeExecution.status = this.stateMachine.transitionNode(
          nodeExecution.status,
          "queued",
          activeRun.run.id,
          node.id
        );
        activeRun.context.services.logger.info(
          `Node "${node.id}" queued for execution`,
          undefined,
          node.id
        );

        this.queue.enqueue({
          type: "node",
          runId: activeRun.run.id,
          nodeId: node.id,
        });
        this.queue.dequeue();

        let result;
        while (true) {
          activeRun.context.services.logger.info(
            `Node "${node.id}" (type "${node.typeId}") execution started`,
            undefined,
            node.id
          );
          result = await this.nodeRunner.execute({
            context: activeRun.context,
            node,
            nodeExecution,
            executor: this.executor,
            edges: workflow.edges,
          });

          if (result.status === "retry_scheduled") {
            const executorInstance = this.executorRegistry.get(node.typeId);
            const metadata = executorInstance?.getMetadata();

            if (
              metadata &&
              this.retryManager.shouldRetry(
                node,
                metadata,
                nodeExecution.attempt,
                new Error(result.errorMessage ?? "Node execution failed")
              ) &&
              !activeRun.control.cancelRequested &&
              !activeRun.control.stopRequested
            ) {
              const delayMs = this.retryManager.calculateDelay(node, nodeExecution.attempt);
              loggerInfo(
                activeRun,
                `Node "${node.id}" (type "${node.typeId}") execution failed with retryable error. Scheduling retry attempt ${
                  nodeExecution.attempt + 1
                } in ${delayMs}ms. Error: ${result.errorMessage}`
              );

              try {
                await this.retryManager.delay(delayMs, {
                  get aborted() {
                    return activeRun.control.cancelRequested || activeRun.control.stopRequested;
                  },
                });

                nodeExecution.attempt += 1;
                // Transition node back to queued status so it can be re-run
                nodeExecution.status = this.stateMachine.transitionNode(
                  nodeExecution.status,
                  "queued",
                  activeRun.run.id,
                  node.id
                );
                continue;
              } catch (retryDelayError) {
                loggerInfo(activeRun, `Retry delay for node "${node.id}" was cancelled`);
                const finalStatus = (activeRun.control.cancelRequested || activeRun.control.stopRequested)
                  ? "skipped"
                  : "failed";
                nodeExecution.status = this.stateMachine.transitionNode(
                  nodeExecution.status,
                  finalStatus,
                  activeRun.run.id,
                  node.id
                );
                result.status = finalStatus;
              }
            } else {
              // Retry limit exhausted or retry not supported/cancelled, transition node to final state
              const finalStatus = (activeRun.control.cancelRequested || activeRun.control.stopRequested)
                ? "skipped"
                : "failed";
              
              nodeExecution.status = this.stateMachine.transitionNode(
                nodeExecution.status,
                finalStatus,
                activeRun.run.id,
                node.id
              );
              result.status = finalStatus;
            }
          }
          break;
        }

        // Log node execution outcome
        if (result.status === "completed") {
          activeRun.context.services.logger.info(
            `Node "${node.id}" executed successfully`,
            { success: true },
            node.id
          );
        } else if (result.status === "failed") {
          activeRun.context.services.logger.error(
            `Node "${node.id}" execution failed: ${result.errorMessage ?? "Unknown error"}`,
            undefined,
            node.id
          );
        } else if (result.status === "skipped") {
          activeRun.context.services.logger.warn(
            `Node "${node.id}" was skipped`,
            undefined,
            node.id
          );
        }

        if (result.status === "failed") {
          failedNodeId = node.id;
          activeRun.run.failedNodeId = failedNodeId;
          activeRun.run.errorMessage = result.errorMessage;
          this.skipRemainingNodes(
            activeRun,
            orderedNodes,
            this.nextNode(orderedNodes, node),
            "upstream_failure"
          );
          this.applyWorkflowTransition(activeRun, "failed");
          break;
        }
      }

      if (!this.stateMachine.isTerminalWorkflowStatus(activeRun.run.status)) {
        this.applyWorkflowTransition(activeRun, "completed");
      }

      this.finalizeRun(activeRun);
      activeRun.context.services.logger.info(
        `Workflow execution finished with status "${activeRun.run.status}"`,
        { failedNodeId, success: activeRun.run.status === "completed" }
      );

      return this.buildSnapshot(activeRun);
    } catch (error) {
      if (!this.stateMachine.isTerminalWorkflowStatus(activeRun.run.status)) {
        this.applyWorkflowTransition(activeRun, "failed");
        activeRun.run.errorMessage =
          error instanceof Error ? error.message : String(error);
      }
      activeRun.context.services.logger.error(
        `Workflow execution crashed: ${activeRun.run.errorMessage}`
      );
      this.finalizeRun(activeRun);
      return this.buildSnapshot(activeRun);
    } finally {
      this.queue.releaseSlot();
    }
  }

  private skipRemainingNodes(
    activeRun: ActiveRun,
    orderedNodes: WorkflowNode[],
    fromNode: WorkflowNode | undefined,
    reason: "cancelled" | "stop_requested" | "upstream_failure"
  ): void {
    if (!fromNode) {
      return;
    }

    const startIndex = orderedNodes.findIndex((node) => node.id === fromNode.id);
    if (startIndex < 0) {
      return;
    }

    for (const node of orderedNodes.slice(startIndex)) {
      const nodeExecution = this.getNodeExecution(activeRun, node.id);
      if (!this.stateMachine.isTerminalNodeStatus(nodeExecution.status)) {
        this.nodeRunner.skip(nodeExecution, reason);
      }
    }
  }

  private hasUpstreamFailure(
    nodeId: string,
    workflow: WorkflowDefinition,
    activeRun: ActiveRun
  ): boolean {
    const inboundNodeIds = workflow.edges
      .filter((edge) => edge.toNodeId === nodeId)
      .map((edge) => edge.fromNodeId);

    for (const upstreamId of inboundNodeIds) {
      const upstreamExecution = activeRun.nodeExecutions.get(upstreamId);
      if (!upstreamExecution) {
        continue;
      }
      if (
        upstreamExecution.status === "failed" ||
        upstreamExecution.status === "skipped" ||
        upstreamExecution.status === "retry_scheduled"
      ) {
        return true;
      }
    }

    return false;
  }

  private shouldAbortImmediately(activeRun: ActiveRun): boolean {
    return activeRun.control.cancelRequested && activeRun.run.status === "running";
  }

  private nextNode(
    orderedNodes: WorkflowNode[],
    current: WorkflowNode
  ): WorkflowNode | undefined {
    const index = orderedNodes.findIndex((node) => node.id === current.id);
    return index >= 0 ? orderedNodes[index + 1] : undefined;
  }

  private getNodeExecution(activeRun: ActiveRun, nodeId: string): NodeExecution {
    const nodeExecution = activeRun.nodeExecutions.get(nodeId);
    if (!nodeExecution) {
      throw new RuntimeError(
        "RUN_NOT_FOUND",
        `Node execution record for node "${nodeId}" was not found`,
        { runId: activeRun.run.id, nodeId }
      );
    }
    return nodeExecution;
  }

  private getActiveRun(runId: string): ActiveRun {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      throw new RuntimeError(
        "RUN_NOT_FOUND",
        `Workflow run "${runId}" was not found`,
        { runId }
      );
    }
    return activeRun;
  }

  private createWorkflowRun(input: StartWorkflowInput): WorkflowRun {
    return {
      id: input.runId,
      workflowId: input.workflow.id,
      workflowVersion: input.workflow.version,
      status: "pending",
      environment: input.environment ?? "preview",
      initiatedBy: input.initiatedBy,
      trigger: { ...input.trigger },
      startedAt: null,
      completedAt: null,
      failedNodeId: null,
      errorMessage: null,
    };
  }

  private createNodeExecutions(
    runId: string,
    workflow: WorkflowDefinition
  ): Map<string, NodeExecution> {
    const executions = new Map<string, NodeExecution>();

    for (const node of workflow.nodes) {
      executions.set(node.id, {
        id: nextNodeExecutionId(),
        runId,
        nodeId: node.id,
        nodeTypeId: node.typeId,
        status: "pending",
        attempt: 1,
        startedAt: null,
        completedAt: null,
        inputs: {},
        outputs: {},
        errorMessage: null,
      });
    }

    return executions;
  }

  private applyWorkflowTransition(activeRun: ActiveRun, to: WorkflowRunStatus): void {
    activeRun.run.status = this.stateMachine.transitionWorkflow(
      activeRun.run.status,
      to,
      activeRun.run.id
    );
    activeRun.context.setStatus(activeRun.run.status);
  }

  private finalizeRun(activeRun: ActiveRun): void {
    activeRun.run.completedAt = new Date().toISOString();
    activeRun.context.setStatus(activeRun.run.status);
    activeRun.control.cancelRequested = false;
    activeRun.control.stopRequested = false;
    activeRun.executionPromise = null;
  }

  private buildSnapshot(activeRun: ActiveRun): WorkflowRunSnapshot {
    return {
      run: { ...activeRun.run, trigger: { ...activeRun.run.trigger } },
      nodeExecutions: [...activeRun.nodeExecutions.values()].map((execution) => ({
        ...execution,
        inputs: { ...execution.inputs },
        outputs: { ...execution.outputs },
      })),
    };
  }
}

function loggerInfo(
  activeRun: ActiveRun,
  message: string,
  data?: Record<string, unknown>
): void {
  activeRun.context.services.logger.info(message, data);
}
