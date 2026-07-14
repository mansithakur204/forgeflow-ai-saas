// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Memory System Domain Entities
// ─────────────────────────────────────────────────────────────────────────────

export type MemoryType = "working" | "long-term" | "conversation" | "episodic" | "semantic";
export type MemoryImportance = "low" | "medium" | "high";
export type MemoryScope = "global" | "workflow" | "agent" | "conversation" | "tool";

export interface MemoryMetadata {
  source?: string;
  workflowId?: string;
  agentId?: string;
  conversationId?: string;
  importance?: MemoryImportance;
  createdAt?: string;
  updatedAt?: string;
  accessCount?: number;
  lastAccessAt?: string;
  ttl?: number; // TTL duration in seconds
  tags?: string[];
  version?: number;
  [key: string]: unknown;
}

export interface MemoryEntry {
  id: string;
  scope?: MemoryScope;
  key: string;
  value: string;
  metadata?: MemoryMetadata;
  
  // Backward compatibility fields
  type: MemoryType;
  importance: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface MemoryCollection {
  name: string;
  entries: MemoryEntry[];
}

export interface IWorkingMemory {
  scope: "conversation" | "workflow";
  entries: MemoryEntry[];
}

export interface IConversationMemory {
  conversationId: string;
  entries: MemoryEntry[];
}

export interface ILongTermMemory {
  entries: MemoryEntry[];
}

export interface ISemanticMemory {
  facts: MemoryEntry[];
}

export interface IWorkflowMemory {
  workflowId: string;
  entries: MemoryEntry[];
}

export interface MemorySearchQuery {
  type?: MemoryType;
  scope?: MemoryScope;
  key?: string;
  keywords?: string[];
  minImportance?: number;
  tags?: string[];
  limit?: number;
  includeExpired?: boolean;
}

export interface MemoryStatistics {
  totalEntries: number;
  entriesByType: Record<MemoryType, number>;
  bytesUsed: number;
  hitsCount: number;
  missesCount: number;
}

export interface MemoryDiagnostics {
  providerId: string;
  uptimeSeconds: number;
  lastCompressedAt?: string;
  isHealthy: boolean;
}

// ── Memory Agent Domain Typings (Task 14.5A) ──────────────────────────────────

export type MemoryOperationType =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "restore"
  | "merge"
  | "split"
  | "expire"
  | "search";

export interface MemoryOperation {
  type: MemoryOperationType;
  scope: MemoryScope;
  key?: string;
  value?: string;
  memoryId?: string;
  targetMemoryIds?: string[];
  metadata?: MemoryMetadata;
}

export type MemoryOperationStatus = "idle" | "running" | "completed" | "failed";

export interface MemoryConfiguration {
  enableAutoArchive?: boolean;
  maxEntriesLimit?: number;
  decayThreshold?: number;
  conflictResolutionStrategy?: "overwrite" | "merge" | "ignore";
}

export interface MemoryContext {
  sessionId: string;
  variables: Record<string, unknown>;
  operationStatus: MemoryOperationStatus;
  affectedMemoryIds: string[];
}

export interface MemoryOperationResult {
  operation: MemoryOperationType;
  success: boolean;
  affectedMemoryIds: string[];
  importance?: number;
  confidence?: number;
  relationships?: string[];
  error?: string;
  durationMs: number;
}
