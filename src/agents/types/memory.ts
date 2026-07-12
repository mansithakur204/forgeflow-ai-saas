export type MemoryType = "working" | "long-term" | "conversation" | "episodic" | "semantic";

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  key: string;
  value: string;
  importance: number; // Importance scoring: 0.0 to 1.0
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null; // Null if it doesn't expire
  metadata?: Record<string, unknown>;
}

export interface MemorySearchQuery {
  type?: MemoryType;
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
