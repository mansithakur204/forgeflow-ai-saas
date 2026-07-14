// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Research Agent Domain Typings
// Defines configurations, contexts, results, and status parameters.
// ─────────────────────────────────────────────────────────────────────────────

export type ResearchStatus =
  | "idle"
  | "searching_knowledge"
  | "searching_memory"
  | "building_context"
  | "completed"
  | "failed";

export interface ResearchConfiguration {
  maxKnowledgeResults?: number;
  maxMemoryResults?: number;
  minScoreThreshold?: number;
  enableRAG?: boolean;
}

export interface ResearchContext {
  query: string;
  variables: Record<string, unknown>;
  status: ResearchStatus;
  foundKnowledgeSources: string[];
  foundMemoryEntries: string[];
}

export interface ResearchKnowledgeReference {
  sourceId: string;
  title: string;
  score: number;
  citation: string;
}

export interface ResearchMemoryReference {
  memoryId: string;
  content: string;
  score: number;
  timestamp: string;
}

export interface ResearchRankedSource {
  name: string;
  score: number;
  type: "knowledge" | "memory";
}

export interface ResearchResult {
  query: string;
  context: string; // consolidated context text
  knowledgeReferences: ResearchKnowledgeReference[];
  memoryReferences: ResearchMemoryReference[];
  rankedSources: ResearchRankedSource[];
  confidenceScore: number;
  success: boolean;
  error?: string;
}
