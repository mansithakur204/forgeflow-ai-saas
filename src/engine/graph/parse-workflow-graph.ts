// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Graph Parser
// Converts canvas editor state into an execution-domain WorkflowDefinition.
// Pure function — no side effects, no React dependencies.
// ─────────────────────────────────────────────────────────────────────────────

import type { CanvasNode, NodeConnection } from "@/lib/workflow-data";
import type {
  ParseWorkflowGraphInput,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
} from "@/engine/types/workflow-graph";

function toExecutionNode(node: ParseWorkflowGraphInput["nodes"][number]): WorkflowNode {
  return {
    id: node.id,
    typeId: node.typeId,
    label: node.label,
    config: { ...node.config },
  };
}

function toExecutionEdge(
  connection: ParseWorkflowGraphInput["connections"][number]
): WorkflowEdge {
  return {
    id: connection.id,
    fromNodeId: connection.fromNodeId,
    fromPortId: connection.fromPortId,
    toNodeId: connection.toNodeId,
    toPortId: connection.toPortId,
  };
}

export function parseWorkflowGraph(input: ParseWorkflowGraphInput): WorkflowDefinition {
  const now = new Date().toISOString();

  return {
    id: input.workflowId,
    name: input.name,
    version: input.version ?? 1,
    nodes: input.nodes.map(toExecutionNode),
    edges: input.connections.map(toExecutionEdge),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

export function parseWorkflowGraphFromCanvas(
  workflowId: string,
  name: string,
  nodes: CanvasNode[],
  connections: NodeConnection[],
  options?: { version?: number; createdAt?: string; updatedAt?: string }
): WorkflowDefinition {
  return parseWorkflowGraph({
    workflowId,
    name,
    nodes: nodes.map((node) => ({
      id: node.id,
      typeId: node.typeId,
      label: node.label,
      config: node.config,
    })),
    connections,
    version: options?.version,
    createdAt: options?.createdAt,
    updatedAt: options?.updatedAt,
  });
}
