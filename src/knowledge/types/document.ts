export type DocumentStatus =
  | "uploaded"
  | "queued"
  | "parsing"
  | "parsed"
  | "chunking"
  | "chunked"
  | "embedding"
  | "indexed"
  | "ready"
  | "failed";

export const VALID_DOCUMENT_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  uploaded: ["queued", "failed"],
  queued: ["parsing", "failed"],
  parsing: ["parsed", "failed"],
  parsed: ["chunking", "failed"],
  chunking: ["chunked", "failed"],
  chunked: ["embedding", "failed"],
  embedding: ["indexed", "failed"],
  indexed: ["ready", "failed"],
  ready: ["failed"],
  failed: ["queued"],
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

export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  pageCount?: number;
  wordCount?: number;
  author?: string;
  createdAt: string;
  updatedAt: string;
  customMetadata?: Record<string, unknown>;
}

export interface KnowledgeDocument {
  id: string;
  sourceId: string;
  title: string;
  status: DocumentStatus;
  storagePath: string; // reference location in storage layer
  metadata: DocumentMetadata;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Chunk {
  id: string;
  documentId: string;
  content: string;
  index: number; // sequential order relative to document
  tokenCount: number;
  metadata: Record<string, unknown>; // section headings, pages, etc.
  createdAt: string;
}
