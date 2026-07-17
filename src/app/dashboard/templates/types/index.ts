// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Templates Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TemplateFilters {
  search: string;
  category: string;
  difficulty: string; // Beginner, Intermediate, Advanced
  sortBy: "downloads" | "rating" | "name";
  sortOrder: "asc" | "desc";
}

export interface TemplateNode {
  id: string;
  typeId: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface TemplateConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  tags: string[];
  estimatedRuntime: string;
  requiredIntegrations: string[];
  previewImage: string;
  version: string;
  author: string;
  downloads: number;
  rating: number;
  nodes: TemplateNode[];
  connections: TemplateConnection[];
  isFavorite?: boolean;
}

export interface TemplateResponse {
  success: boolean;
  templates: WorkflowTemplate[];
  error?: string;
}
