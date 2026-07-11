// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Execution Context
// Mutable runtime state bag passed through node execution lifecycle.
// Framework-agnostic — portable to Azure workers.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CreateExecutionContextInput,
  ExecutionContextSnapshot,
  ExecutionMetadata,
  ExecutionServices,
} from "@/engine/types/execution-context";
import type {
  ExecutionEnvironment,
  ExecutionTrigger,
  WorkflowRunStatus,
} from "@/engine/types/execution";
import type { WorkflowDefinition, WorkflowEdge } from "@/engine/types/workflow-graph";

function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class ExecutionContext {
  readonly runId: string;
  readonly workflowId: string;
  readonly workflowVersion: number;
  readonly initiatedBy: string;
  readonly environment: ExecutionEnvironment;
  readonly trigger: ExecutionTrigger;
  readonly services: ExecutionServices;
  readonly metadata: ExecutionMetadata;

  private status: WorkflowRunStatus;
  private readonly variables: Record<string, unknown>;
  private readonly nodeOutputs: Map<string, Record<string, unknown>>;
  private readonly workflow: WorkflowDefinition;

  constructor(input: CreateExecutionContextInput) {
    this.runId = input.runId;
    this.workflow = input.workflow;
    this.workflowId = input.workflow.id;
    this.workflowVersion = input.workflow.version;
    this.initiatedBy = input.initiatedBy;
    this.environment = input.environment ?? "preview";
    this.trigger = input.trigger;
    this.services = input.services;
    this.status = "pending";
    this.variables = {};
    this.nodeOutputs = new Map();

    this.metadata = {
      startedAt: new Date().toISOString(),
      correlationId: input.correlationId ?? generateCorrelationId(),
      workflowName: input.workflow.name,
    };

    this.services.logger.bindRun(this.runId);
  }

  getWorkflow(): WorkflowDefinition {
    return this.workflow;
  }

  getStatus(): WorkflowRunStatus {
    return this.status;
  }

  setStatus(status: WorkflowRunStatus): void {
    this.status = status;
  }

  setVariable(key: string, value: unknown): void {
    this.variables[key] = value;
  }

  getVariable(key: string): unknown {
    return this.variables[key];
  }

  getVariables(): Record<string, unknown> {
    return { ...this.variables };
  }

  setNodeOutput(nodeId: string, portId: string, value: unknown): void {
    const existing = this.nodeOutputs.get(nodeId) ?? {};
    existing[portId] = value;
    this.nodeOutputs.set(nodeId, existing);
  }

  setNodeOutputs(nodeId: string, outputs: Record<string, unknown>): void {
    this.nodeOutputs.set(nodeId, { ...outputs });
  }

  getNodeOutput(nodeId: string, portId: string): unknown {
    return this.nodeOutputs.get(nodeId)?.[portId];
  }

  getNodeOutputs(nodeId: string): Record<string, unknown> {
    return { ...(this.nodeOutputs.get(nodeId) ?? {}) };
  }

  resolveNodeInputs(
    nodeId: string,
    edges: WorkflowEdge[]
  ): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};
    const inboundEdges = edges.filter((edge) => edge.toNodeId === nodeId);

    for (const edge of inboundEdges) {
      const outputValue = this.getNodeOutput(edge.fromNodeId, edge.fromPortId);
      if (outputValue !== undefined) {
        inputs[edge.toPortId] = outputValue;
      }
    }

    return inputs;
  }

  snapshot(): ExecutionContextSnapshot {
    const serializedOutputs: Record<string, Record<string, unknown>> = {};
    for (const [nodeId, outputs] of this.nodeOutputs) {
      serializedOutputs[nodeId] = { ...outputs };
    }

    return {
      runId: this.runId,
      workflowId: this.workflowId,
      workflowVersion: this.workflowVersion,
      initiatedBy: this.initiatedBy,
      environment: this.environment,
      status: this.status,
      trigger: { ...this.trigger },
      variables: { ...this.variables },
      nodeOutputs: serializedOutputs,
      metadata: { ...this.metadata },
    };
  }
}
