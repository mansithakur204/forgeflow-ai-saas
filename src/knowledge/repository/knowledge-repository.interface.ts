// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Knowledge Repository Interfaces (Dependency Injection)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  KnowledgeDocument,
  KnowledgeSource,
  Chunk,
  DocumentStatus,
  KnowledgeCollection,
} from "../types/document";

export type KnowledgeSourceTypeFilter = KnowledgeSource["type"];

// ── Document Repository ──────────────────────────────────────────────────────

export interface IKnowledgeDocumentRepository {
  create(document: Omit<KnowledgeDocument, "createdAt" | "updatedAt">): Promise<KnowledgeDocument>;
  getById(id: string): Promise<KnowledgeDocument | null>;
  getBySourceId(sourceId: string): Promise<KnowledgeDocument[]>;
  updateStatus(id: string, status: DocumentStatus, errorMessage?: string | null): Promise<KnowledgeDocument>;
  updateMetadata(id: string, metadata: Partial<KnowledgeDocument["metadata"]>): Promise<KnowledgeDocument>;
  delete(id: string): Promise<void>;
  list(filter?: { status?: DocumentStatus; collectionId?: string; limit?: number; offset?: number }): Promise<KnowledgeDocument[]>;
  
  // Task 11.1B Extensions
  update(id: string, updates: Partial<Omit<KnowledgeDocument, "id" | "createdAt" | "updatedAt">>): Promise<KnowledgeDocument>;
  search(query: string, filter?: { collectionId?: string; status?: DocumentStatus }): Promise<KnowledgeDocument[]>;
  createMany(documents: Omit<KnowledgeDocument, "createdAt" | "updatedAt">[]): Promise<KnowledgeDocument[]>;
  updateMany(updates: { id: string; changes: Partial<Omit<KnowledgeDocument, "id" | "createdAt" | "updatedAt">> }[]): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
}

// ── Source Repository ────────────────────────────────────────────────────────

export interface IKnowledgeSourceRepository {
  create(source: Omit<KnowledgeSource, "createdAt" | "updatedAt">): Promise<KnowledgeSource>;
  getById(id: string): Promise<KnowledgeSource | null>;
  list(filter?: { type?: KnowledgeSourceTypeFilter; limit?: number; offset?: number }): Promise<KnowledgeSource[]>;
  update(id: string, updates: Partial<Omit<KnowledgeSource, "id" | "createdAt" | "updatedAt">>): Promise<KnowledgeSource>;
  delete(id: string): Promise<void>;
  
  // Task 11.1B Extensions
  search(query: string): Promise<KnowledgeSource[]>;
  createMany(sources: Omit<KnowledgeSource, "createdAt" | "updatedAt">[]): Promise<KnowledgeSource[]>;
  updateMany(updates: { id: string; changes: Partial<Omit<KnowledgeSource, "id" | "createdAt" | "updatedAt">> }[]): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
}

// ── Chunk Repository ─────────────────────────────────────────────────────────

export interface IChunkRepository {
  create(chunk: Omit<Chunk, "id" | "createdAt">): Promise<Chunk>;
  update(id: string, updates: Partial<Omit<Chunk, "id" | "createdAt">>): Promise<Chunk>;
  delete(id: string): Promise<void>;
  
  createMany(chunks: Omit<Chunk, "id" | "createdAt">[]): Promise<Chunk[]>;
  getByDocumentId(documentId: string): Promise<Chunk[]>;
  deleteByDocumentId(documentId: string): Promise<void>;
  search(query: string, options?: { limit?: number; threshold?: number }): Promise<Chunk[]>;
  
  // Task 11.1B Extensions
  updateMany(updates: { id: string; changes: Partial<Omit<Chunk, "id" | "createdAt">> }[]): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
}

// ── Collection Repository ────────────────────────────────────────────────────

export interface IKnowledgeCollectionRepository {
  create(collection: Omit<KnowledgeCollection, "createdAt" | "updatedAt">): Promise<KnowledgeCollection>;
  getById(id: string): Promise<KnowledgeCollection | null>;
  update(id: string, updates: Partial<Omit<KnowledgeCollection, "id" | "createdAt" | "updatedAt">>): Promise<KnowledgeCollection>;
  delete(id: string): Promise<void>;
  list(filter?: { limit?: number; offset?: number }): Promise<KnowledgeCollection[]>;
  
  // Task 11.1B Extensions
  createMany(collections: Omit<KnowledgeCollection, "createdAt" | "updatedAt">[]): Promise<KnowledgeCollection[]>;
  deleteMany(ids: string[]): Promise<void>;
}

// ── Embedding Repository & Metadata ─────────────────────────────────────────

export interface EmbeddingMetadata {
  model: string;
  dimensions: number;
  generatedAt: string;
  provider: string;
  latencyMs: number;
  tokenUsage?: number;
  contentHash: string;
  version: number;
}

export interface PersistentEmbedding {
  chunkId: string;
  vector: number[];
  metadata: EmbeddingMetadata;
  createdAt: string;
}

export interface IEmbeddingRepository {
  save(chunkId: string, vector: number[], metadata: EmbeddingMetadata): Promise<PersistentEmbedding>;
  saveBatch(entries: { chunkId: string; vector: number[]; metadata: EmbeddingMetadata }[]): Promise<void>;
  get(chunkId: string): Promise<PersistentEmbedding | null>;
  delete(chunkId: string): Promise<void>;
  deleteByDocumentId(documentId: string): Promise<void>;
  clear(): Promise<void>;
}
