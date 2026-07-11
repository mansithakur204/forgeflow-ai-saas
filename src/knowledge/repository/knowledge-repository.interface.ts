import type { KnowledgeDocument, KnowledgeSource, Chunk, DocumentStatus } from "../types/document";

export interface IKnowledgeDocumentRepository {
  create(document: Omit<KnowledgeDocument, "createdAt" | "updatedAt">): Promise<KnowledgeDocument>;
  getById(id: string): Promise<KnowledgeDocument | null>;
  getBySourceId(sourceId: string): Promise<KnowledgeDocument[]>;
  updateStatus(id: string, status: DocumentStatus, errorMessage?: string | null): Promise<KnowledgeDocument>;
  updateMetadata(id: string, metadata: Partial<KnowledgeDocument["metadata"]>): Promise<KnowledgeDocument>;
  delete(id: string): Promise<void>;
  list(filter?: { status?: DocumentStatus; limit?: number; offset?: number }): Promise<KnowledgeDocument[]>;
}

export interface IKnowledgeSourceRepository {
  create(source: Omit<KnowledgeSource, "createdAt" | "updatedAt">): Promise<KnowledgeSource>;
  getById(id: string): Promise<KnowledgeSource | null>;
  list(filter?: { type?: KnowledgeSourceTypeFilter; limit?: number; offset?: number }): Promise<KnowledgeSource[]>;
  update(id: string, updates: Partial<Omit<KnowledgeSource, "id" | "createdAt" | "updatedAt">>): Promise<KnowledgeSource>;
  delete(id: string): Promise<void>;
}

export type KnowledgeSourceTypeFilter = KnowledgeSource["type"];

export interface IChunkRepository {
  createMany(chunks: Omit<Chunk, "id" | "createdAt">[]): Promise<Chunk[]>;
  getByDocumentId(documentId: string): Promise<Chunk[]>;
  deleteByDocumentId(documentId: string): Promise<void>;
  search(query: string, options?: { limit?: number; threshold?: number }): Promise<Chunk[]>;
}
