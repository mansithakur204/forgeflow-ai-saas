// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Graph Validator
// Validates execution graphs and returns structured results (no throws).
// ─────────────────────────────────────────────────────────────────────────────

import {
  getNodeType,
  NODE_TYPE_CATALOG,
  type NodeTypeId,
} from "@/lib/workflow-data";
import type {
  GraphValidationIssue,
  GraphValidationResult,
} from "@/engine/errors/execution-errors";
import type { WorkflowDefinition } from "@/engine/types/workflow-graph";

const TRIGGER_TYPE_IDS = new Set<NodeTypeId>(
  NODE_TYPE_CATALOG.filter((def) => def.category === "trigger").map((def) => def.typeId)
);

const KNOWN_TYPE_IDS = new Set<NodeTypeId>(
  NODE_TYPE_CATALOG.map((def) => def.typeId)
);

function edgeKey(
  fromNodeId: string,
  fromPortId: string,
  toNodeId: string,
  toPortId: string
): string {
  return `${fromNodeId}:${fromPortId}->${toNodeId}:${toPortId}`;
}

function isTriggerType(typeId: NodeTypeId): boolean {
  return TRIGGER_TYPE_IDS.has(typeId);
}

function validateNodeIds(definition: WorkflowDefinition): GraphValidationIssue[] {
  const errors: GraphValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const node of definition.nodes) {
    if (seenIds.has(node.id)) {
      errors.push({
        code: "GRAPH_DUPLICATE_NODE_ID",
        message: `Duplicate node ID "${node.id}" found in workflow graph.`,
        nodeId: node.id,
      });
    } else {
      seenIds.add(node.id);
    }

    if (!KNOWN_TYPE_IDS.has(node.typeId)) {
      errors.push({
        code: "GRAPH_UNKNOWN_NODE_TYPE",
        message: `Node "${node.id}" references unknown type "${node.typeId}".`,
        nodeId: node.id,
      });
    }
  }

  return errors;
}

function validateEdges(definition: WorkflowDefinition): GraphValidationIssue[] {
  const errors: GraphValidationIssue[] = [];
  const nodeMap = new Map(definition.nodes.map((node) => [node.id, node]));
  const seenEdges = new Set<string>();

  for (const edge of definition.edges) {
    const fromNode = nodeMap.get(edge.fromNodeId);
    const toNode = nodeMap.get(edge.toNodeId);

    if (!fromNode) {
      errors.push({
        code: "GRAPH_UNKNOWN_NODE",
        message: `Edge "${edge.id}" references unknown source node "${edge.fromNodeId}".`,
        edgeId: edge.id,
        nodeId: edge.fromNodeId,
      });
    }

    if (!toNode) {
      errors.push({
        code: "GRAPH_UNKNOWN_NODE",
        message: `Edge "${edge.id}" references unknown target node "${edge.toNodeId}".`,
        edgeId: edge.id,
        nodeId: edge.toNodeId,
      });
    }

    if (edge.fromNodeId === edge.toNodeId) {
      errors.push({
        code: "GRAPH_SELF_LOOP",
        message: `Edge "${edge.id}" connects node "${edge.fromNodeId}" to itself.`,
        edgeId: edge.id,
        nodeId: edge.fromNodeId,
      });
    }

    const key = edgeKey(edge.fromNodeId, edge.fromPortId, edge.toNodeId, edge.toPortId);
    if (seenEdges.has(key)) {
      errors.push({
        code: "GRAPH_DUPLICATE_EDGE",
        message: `Duplicate connection from "${edge.fromNodeId}.${edge.fromPortId}" to "${edge.toNodeId}.${edge.toPortId}".`,
        edgeId: edge.id,
      });
    } else {
      seenEdges.add(key);
    }

    if (fromNode && toNode) {
      errors.push(...validateEdgePorts(edge, fromNode.typeId, toNode.typeId));
    }
  }

  return errors;
}

function validateEdgePorts(
  edge: WorkflowDefinition["edges"][number],
  fromTypeId: NodeTypeId,
  toTypeId: NodeTypeId
): GraphValidationIssue[] {
  const errors: GraphValidationIssue[] = [];

  try {
    const fromDef = getNodeType(fromTypeId);
    const outputPort = fromDef.outputs.find((port) => port.id === edge.fromPortId);
    if (!outputPort) {
      errors.push({
        code: "GRAPH_INVALID_PORT",
        message: `Edge "${edge.id}" references invalid output port "${edge.fromPortId}" on node "${edge.fromNodeId}".`,
        edgeId: edge.id,
        nodeId: edge.fromNodeId,
        portId: edge.fromPortId,
      });
    }
  } catch {
    errors.push({
      code: "GRAPH_UNKNOWN_NODE_TYPE",
      message: `Edge "${edge.id}" source node "${edge.fromNodeId}" has an invalid type.`,
      edgeId: edge.id,
      nodeId: edge.fromNodeId,
    });
  }

  try {
    const toDef = getNodeType(toTypeId);
    const inputPort = toDef.inputs.find((port) => port.id === edge.toPortId);
    if (!inputPort) {
      errors.push({
        code: "GRAPH_INVALID_PORT",
        message: `Edge "${edge.id}" references invalid input port "${edge.toPortId}" on node "${edge.toNodeId}".`,
        edgeId: edge.id,
        nodeId: edge.toNodeId,
        portId: edge.toPortId,
      });
    }
  } catch {
    errors.push({
      code: "GRAPH_UNKNOWN_NODE_TYPE",
      message: `Edge "${edge.id}" target node "${edge.toNodeId}" has an invalid type.`,
      edgeId: edge.id,
      nodeId: edge.toNodeId,
    });
  }

  return errors;
}

function validateTriggers(definition: WorkflowDefinition): GraphValidationIssue[] {
  const errors: GraphValidationIssue[] = [];
  const triggerNodes = definition.nodes.filter((node) => isTriggerType(node.typeId));

  if (definition.nodes.length > 0 && triggerNodes.length === 0) {
    errors.push({
      code: "GRAPH_NO_TRIGGER",
      message: "Workflow must contain at least one trigger node to be executable.",
    });
  }

  const incomingByNode = new Map<string, number>();
  for (const edge of definition.edges) {
    incomingByNode.set(edge.toNodeId, (incomingByNode.get(edge.toNodeId) ?? 0) + 1);
  }

  for (const trigger of triggerNodes) {
    if ((incomingByNode.get(trigger.id) ?? 0) > 0) {
      errors.push({
        code: "GRAPH_TRIGGER_HAS_INPUT",
        message: `Trigger node "${trigger.id}" must not have incoming connections.`,
        nodeId: trigger.id,
      });
    }
  }

  return errors;
}

function detectCycle(definition: WorkflowDefinition): GraphValidationIssue[] {
  const nodeIds = definition.nodes.map((node) => node.id);
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of definition.edges) {
    if (!adjacency.has(edge.fromNodeId) || !inDegree.has(edge.toNodeId)) {
      continue;
    }
    adjacency.get(edge.fromNodeId)?.push(edge.toNodeId);
    inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  let visitedCount = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    visitedCount += 1;

    for (const neighbor of adjacency.get(current) ?? []) {
      const nextDegree = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, nextDegree);
      if (nextDegree === 0) queue.push(neighbor);
    }
  }

  if (visitedCount !== nodeIds.length) {
    return [
      {
        code: "GRAPH_CYCLE",
        message: "Workflow graph contains a cycle. Execution graphs must be directed acyclic.",
      },
    ];
  }

  return [];
}

function findOrphanNodes(definition: WorkflowDefinition): GraphValidationIssue[] {
  const errors: GraphValidationIssue[] = [];
  const triggerNodes = definition.nodes.filter((node) => isTriggerType(node.typeId));

  if (triggerNodes.length === 0 || definition.nodes.length === 0) {
    return errors;
  }

  const reachable = new Set<string>();
  const adjacency = new Map<string, string[]>();

  for (const node of definition.nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of definition.edges) {
    adjacency.get(edge.fromNodeId)?.push(edge.toNodeId);
  }

  const stack = triggerNodes.map((node) => node.id);
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || reachable.has(current)) continue;
    reachable.add(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!reachable.has(neighbor)) stack.push(neighbor);
    }
  }

  for (const node of definition.nodes) {
    if (!isTriggerType(node.typeId) && !reachable.has(node.id)) {
      errors.push({
        code: "GRAPH_ORPHAN_NODE",
        message: `Node "${node.id}" is not reachable from any trigger node.`,
        nodeId: node.id,
      });
    }
  }

  return errors;
}

export function validateWorkflowGraph(
  definition: WorkflowDefinition
): GraphValidationResult {
  const errors: GraphValidationIssue[] = [];
  const warnings: GraphValidationIssue[] = [];

  if (definition.nodes.length === 0) {
    errors.push({
      code: "GRAPH_EMPTY",
      message: "Workflow graph must contain at least one node.",
    });
    return { valid: false, errors, warnings };
  }

  errors.push(...validateNodeIds(definition));
  errors.push(...validateEdges(definition));
  errors.push(...validateTriggers(definition));

  const structuralErrors = new Set([
    "GRAPH_UNKNOWN_NODE",
    "GRAPH_UNKNOWN_NODE_TYPE",
    "GRAPH_DUPLICATE_NODE_ID",
  ]);

  const hasStructuralErrors = errors.some((issue) =>
    structuralErrors.has(issue.code)
  );

  if (!hasStructuralErrors) {
    errors.push(...detectCycle(definition));
    warnings.push(...findOrphanNodes(definition));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
