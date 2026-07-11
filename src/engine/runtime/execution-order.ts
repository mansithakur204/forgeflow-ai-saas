// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Execution Order
// Resolves topologically sorted node execution order from a validated graph.
// ─────────────────────────────────────────────────────────────────────────────

import type { WorkflowDefinition, WorkflowNode } from "@/engine/types/workflow-graph";

export function resolveExecutionOrder(definition: WorkflowDefinition): WorkflowNode[] {
  const nodeById = new Map(definition.nodes.map((node) => [node.id, node]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of definition.nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of definition.edges) {
    if (!adjacency.has(edge.fromNodeId) || !inDegree.has(edge.toNodeId)) {
      continue;
    }
    adjacency.get(edge.fromNodeId)?.push(edge.toNodeId);
    inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const ordered: WorkflowNode[] = [];
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      break;
    }

    const node = nodeById.get(currentId);
    if (node) {
      ordered.push(node);
    }

    for (const neighborId of adjacency.get(currentId) ?? []) {
      const nextDegree = (inDegree.get(neighborId) ?? 0) - 1;
      inDegree.set(neighborId, nextDegree);
      if (nextDegree === 0) {
        queue.push(neighborId);
      }
    }
  }

  return ordered;
}
