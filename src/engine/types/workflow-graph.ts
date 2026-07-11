// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Graph Types
// Execution-domain workflow definition, independent of canvas UI state.
// ─────────────────────────────────────────────────────────────────────────────

import type { NodeTypeId } from "@/lib/workflow-data";

export interface WorkflowNode {
  id: string;
  typeId: NodeTypeId;
  label: string;
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface ParseWorkflowGraphInput {
  workflowId: string;
  name: string;
  nodes: Array<{
    id: string;
    typeId: NodeTypeId;
    label: string;
    config: Record<string, unknown>;
  }>;
  connections: Array<{
    id: string;
    fromNodeId: string;
    fromPortId: string;
    toNodeId: string;
    toPortId: string;
  }>;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}
