// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Knowledge Engine Domain Models
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentStatus =
  // Original statuses (backward compatibility)
  | "uploaded"
  | "queued"
  | "parsing"
  | "parsed"
  | "chunking"
  | "chunked"
  | "embedding"
  | "indexed"
  // Task 11.1D lifecycle statuses
  | "uploading"
  | "processing"
  | "ready"
  | "failed"
  | "archived"
  | "deleted"
  | "completed"
  | "retrying"
  // Title Case options
  | "Queued"
  | "Uploading"
  | "Processing"
  | "Ready"
  | "Failed"
  | "Archived"
  | "Deleted"
  | "Completed"
  | "Retrying";

export const VALID_DOCUMENT_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  // Lowercase backward transitions
  uploaded: ["queued", "failed", "processing", "ready", "completed"],
  queued: ["parsing", "failed", "processing", "completed"],
  parsing: ["parsed", "failed", "processing", "completed"],
  parsed: ["chunking", "failed", "processing", "completed"],
  chunking: ["chunked", "failed", "processing", "completed"],
  chunked: ["embedding", "failed", "processing", "completed"],
  embedding: ["indexed", "failed", "processing", "completed"],
  indexed: ["ready", "failed", "processing", "completed"],

  // Target lifecycle state transitions
  uploading: ["queued", "processing", "failed", "ready", "completed"],
  processing: ["completed", "ready", "failed", "retrying"],
  ready: ["archived", "deleted", "failed"],
  completed: ["archived", "deleted", "failed"],
  failed: ["uploading", "processing", "ready", "queued", "retrying"],
  retrying: ["processing", "completed", "ready", "failed"],
  archived: ["ready", "completed", "deleted"],
  deleted: ["ready", "completed"],

  // Title Case equivalents
  Queued: ["Processing", "Failed", "Completed"],
  Uploading: ["Queued", "Processing", "Failed", "Ready", "Completed"],
  Processing: ["Completed", "Ready", "Failed", "Retrying"],
  Ready: ["Archived", "Deleted", "Failed"],
  Completed: ["Archived", "Deleted", "Failed"],
  Failed: ["Uploading", "Processing", "Ready", "Queued", "Retrying"],
  Retrying: ["Processing", "Completed", "Ready", "Failed"],
  Archived: ["Ready", "Completed", "Deleted"],
  Deleted: ["Ready", "Completed"],
};

/**
 * Asserts whether a document is allowed to move from one status to another.
 */
export function isValidDocumentTransition(from: DocumentStatus, to: DocumentStatus): boolean {
  return VALID_DOCUMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export type KnowledgeSourceType = "upload" | "web" | "database" | "s3" | "gcs" | "azure_blob";

export interface KnowledgeSource {
  id: string;
  name: string;
  type: KnowledgeSourceType;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Task 11.1F Parser Formats
export type DocumentType = "pdf" | "docx" | "markdown" | "txt" | "html" | "csv";

// Task 11.1A Collections Model
export interface KnowledgeCollection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Task 11.1E Document Metadata Schema
export interface KnowledgeMetadata {
  title?: string;
  fileName: string;
  contentType?: string;
  fileSize: number;
  language?: string;
  createdBy?: string;
  uploadedAt?: string;
  version?: number;
  tags?: string[];
  collectionId?: string;
  
  // Legacy fields preserved for backward compatibility
  mimeType?: string;
  createdAt?: string;
  updatedAt?: string;
  pageCount?: number;
  wordCount?: number;
  author?: string;
  customMetadata?: Record<string, unknown>;
}

export type DocumentMetadata = KnowledgeMetadata;

export interface KnowledgeDocument {
  id: string;
  sourceId: string;
  title: string;
  status: DocumentStatus;
  storagePath: string; // reference location in storage layer
  metadata: KnowledgeMetadata;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  collectionId?: string;
  version?: number;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  content: string;
  index: number; // sequential order relative to document
  tokenCount: number;
  metadata: Record<string, unknown>; // section headings, pages, etc.
  createdAt: string;
}

export type Chunk = KnowledgeChunk;
