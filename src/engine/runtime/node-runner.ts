// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Node Runner
// Executes a single workflow node and returns a structured execution result.
// ─────────────────────────────────────────────────────────────────────────────

import type { ExecutionContext } from "@/engine/context/execution-context";
import { ExecutionError } from "@/engine/errors/execution-errors";
import type { NodeExecution } from "@/engine/types/execution";
import type {
  NodeExecutionInput,
  NodeExecutionResult,
  NodeExecutor,
} from "@/engine/types/runtime";
import type { WorkflowEdge, WorkflowNode } from "@/engine/types/workflow-graph";
import { ExecutionStateMachine } from "@/engine/state/execution-state-machine";

export interface NodeRunnerOptions {
  stateMachine?: ExecutionStateMachine;
}

export interface ExecuteNodeParams {
  context: ExecutionContext;
  node: WorkflowNode;
  nodeExecution: NodeExecution;
  executor: NodeExecutor;
  edges: WorkflowEdge[];
}

export class NodeRunner {
  private readonly stateMachine: ExecutionStateMachine;

  constructor(options?: NodeRunnerOptions) {
    this.stateMachine = options?.stateMachine ?? new ExecutionStateMachine();
  }

  async execute(params: ExecuteNodeParams): Promise<NodeExecutionResult> {
    const { context, node, nodeExecution, executor, edges } = params;
    const startedAt = new Date().toISOString();

    if (nodeExecution.status === "pending") {
      this.applyNodeTransition(nodeExecution, "queued");
    }
    this.applyNodeTransition(nodeExecution, "running");
    nodeExecution.startedAt = startedAt;

    const inputs = context.resolveNodeInputs(node.id, edges);
    nodeExecution.inputs = { ...inputs };

    const executionInput: NodeExecutionInput = {
      runId: context.runId,
      node,
      inputs,
      attempt: nodeExecution.attempt,
    };

    try {
      const outputs = await executor(executionInput);
      context.setNodeOutputs(node.id, outputs);

      const completedAt = new Date().toISOString();
      this.applyNodeTransition(nodeExecution, "completed");
      nodeExecution.completedAt = completedAt;
      nodeExecution.outputs = { ...outputs };
      nodeExecution.errorMessage = null;

      return this.buildResult(nodeExecution, startedAt, completedAt);
    } catch (error) {
      const completedAt = new Date().toISOString();
      const errorMessage = this.extractErrorMessage(error);
      const retryable = error instanceof ExecutionError && error.retryable;

      if (retryable) {
        this.applyNodeTransition(nodeExecution, "retry_scheduled");
      } else {
        this.applyNodeTransition(nodeExecution, "failed");
      }

      nodeExecution.completedAt = completedAt;
      nodeExecution.errorMessage = errorMessage;
      nodeExecution.outputs = {};

      return this.buildResult(nodeExecution, startedAt, completedAt);
    }
  }

  skip(
    nodeExecution: NodeExecution,
    reason: "upstream_failure" | "cancelled" | "stop_requested" | "condition"
  ): NodeExecutionResult {
    const timestamp = new Date().toISOString();

    if (!this.stateMachine.isTerminalNodeStatus(nodeExecution.status)) {
      if (nodeExecution.status === "pending" || nodeExecution.status === "queued") {
        this.applyNodeTransition(nodeExecution, "skipped");
      }
    }

    nodeExecution.startedAt = nodeExecution.startedAt ?? timestamp;
    nodeExecution.completedAt = timestamp;
    nodeExecution.errorMessage = `Skipped: ${reason}`;
    nodeExecution.outputs = {};

    return this.buildResult(
      nodeExecution,
      nodeExecution.startedAt,
      nodeExecution.completedAt
    );
  }

  private applyNodeTransition(
    nodeExecution: NodeExecution,
    to: NodeExecution["status"]
  ): void {
    nodeExecution.status = this.stateMachine.transitionNode(
      nodeExecution.status,
      to,
      nodeExecution.runId,
      nodeExecution.nodeId
    );
  }

  private buildResult(
    nodeExecution: NodeExecution,
    startedAt: string,
    completedAt: string
  ): NodeExecutionResult {
    const startMs = Date.parse(startedAt);
    const endMs = Date.parse(completedAt);

    return {
      nodeId: nodeExecution.nodeId,
      runId: nodeExecution.runId,
      status: nodeExecution.status,
      attempt: nodeExecution.attempt,
      inputs: { ...nodeExecution.inputs },
      outputs: { ...nodeExecution.outputs },
      startedAt,
      completedAt,
      durationMs: Number.isFinite(startMs) && Number.isFinite(endMs) ? endMs - startMs : 0,
      errorMessage: nodeExecution.errorMessage,
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
