export interface SourceItem {
  externalId: string;
  title: string;
  content: Buffer;
  mimeType: string;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface SyncJob {
  id: string;
  sourceId: string;
  status: "running" | "completed" | "failed";
  lastSyncTime?: string;
  docsAdded: number;
  docsUpdated: number;
  docsDeleted: number;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string;
}
