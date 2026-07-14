import {
  AgentRegistry,
  ToolRegistry,
  ToolExecutionCoordinator,
  AgentMessageBus,
  MemoryFactory,
  AgentMemorySystem,
  AgentWorkflowCoordinator,
  AutonomousCoordinator,
  AgentFactory,
  BaseTool,
  InMemoryMemoryRepository,
  WorkingMemoryEngine,
  ConversationMemoryEngine,
  LongTermMemoryEngine,
  SemanticMemoryEngine,
  UnifiedMemoryRetrievalEngine,
} from "@/agents";
import { InMemoryVectorStore } from "@/knowledge/vector-store/in-memory-vector-store";
import { executionHistory } from "./execution-history";
// Use the class instance type via ReturnType
type ExecutionHistoryStore = typeof executionHistory;

// Concrete repositories for Knowledge
import type { IKnowledgeDocumentRepository, IKnowledgeSourceRepository, IChunkRepository, IKnowledgeCollectionRepository, KnowledgeSourceTypeFilter, IEmbeddingRepository, EmbeddingMetadata, PersistentEmbedding } from "@/knowledge/repository/knowledge-repository.interface";
import type { KnowledgeDocument, KnowledgeSource, Chunk, DocumentStatus, KnowledgeCollection } from "@/knowledge/types/document";

import { EmbeddingFactory } from "@/knowledge/embedding/embedding-factory";
import { MockLLMProvider } from "@/knowledge/llm/mock-llm-provider";
import { RetrievalPipeline } from "@/knowledge/retrieval/retrieval-pipeline";

// InMemory repositories for Knowledge Engine integration
class InMemoryKnowledgeDocumentRepository implements IKnowledgeDocumentRepository {
  private docs = new Map<string, KnowledgeDocument>();

  async create(document: Omit<KnowledgeDocument, "createdAt" | "updatedAt">): Promise<KnowledgeDocument> {
    const doc: KnowledgeDocument = {
      ...document,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.docs.set(doc.id, doc);
    return doc;
  }
  async getById(id: string): Promise<KnowledgeDocument | null> {
    return this.docs.get(id) ?? null;
  }
  async getBySourceId(sourceId: string): Promise<KnowledgeDocument[]> {
    return Array.from(this.docs.values()).filter((d) => d.sourceId === sourceId);
  }
  async updateStatus(id: string, status: DocumentStatus, errorMessage?: string | null): Promise<KnowledgeDocument> {
    const doc = this.docs.get(id);
    if (!doc) throw new Error("Doc not found");
    doc.status = status;
    if (errorMessage !== undefined) doc.errorMessage = errorMessage;
    doc.updatedAt = new Date().toISOString();
    return doc;
  }
  async updateMetadata(id: string, metadata: Partial<KnowledgeDocument["metadata"]>): Promise<KnowledgeDocument> {
    const doc = this.docs.get(id);
    if (!doc) throw new Error("Doc not found");
    doc.metadata = { ...doc.metadata, ...metadata } as any;
    doc.updatedAt = new Date().toISOString();
    return doc;
  }
  async delete(id: string): Promise<void> {
    this.docs.delete(id);
  }
  async list(filter?: { status?: DocumentStatus; collectionId?: string; limit?: number; offset?: number }): Promise<KnowledgeDocument[]> {
    let result = Array.from(this.docs.values());
    if (filter?.status) {
      result = result.filter((d) => d.status === filter.status);
    }
    if (filter?.collectionId) {
      result = result.filter((d) => d.collectionId === filter.collectionId);
    }
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? result.length;
    return result.slice(offset, offset + limit);
  }

  // Extensions
  async update(id: string, updates: Partial<Omit<KnowledgeDocument, "id" | "createdAt" | "updatedAt">>): Promise<KnowledgeDocument> {
    const doc = this.docs.get(id);
    if (!doc) throw new Error("Doc not found");
    Object.assign(doc, updates);
    doc.updatedAt = new Date().toISOString();
    return doc;
  }
  async search(query: string, filter?: { collectionId?: string; status?: DocumentStatus }): Promise<KnowledgeDocument[]> {
    let result = Array.from(this.docs.values());
    if (filter?.status) {
      result = result.filter((d) => d.status === filter.status);
    }
    if (filter?.collectionId) {
      result = result.filter((d) => d.collectionId === filter.collectionId);
    }
    const q = query.toLowerCase();
    return result.filter((d) => d.title.toLowerCase().includes(q) || d.metadata.fileName.toLowerCase().includes(q));
  }
  async createMany(documents: Omit<KnowledgeDocument, "createdAt" | "updatedAt">[]): Promise<KnowledgeDocument[]> {
    const created: KnowledgeDocument[] = [];
    for (const doc of documents) {
      created.push(await this.create(doc));
    }
    return created;
  }
  async updateMany(updates: { id: string; changes: Partial<Omit<KnowledgeDocument, "id" | "createdAt" | "updatedAt">> }[]): Promise<void> {
    for (const update of updates) {
      await this.update(update.id, update.changes);
    }
  }
  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }
}

class InMemoryKnowledgeSourceRepository implements IKnowledgeSourceRepository {
  private sources = new Map<string, KnowledgeSource>();
  async create(source: Omit<KnowledgeSource, "createdAt" | "updatedAt">): Promise<KnowledgeSource> {
    const src: KnowledgeSource = {
      ...source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.sources.set(src.id, src);
    return src;
  }
  async getById(id: string): Promise<KnowledgeSource | null> {
    return this.sources.get(id) ?? null;
  }
  async list(filter?: { type?: KnowledgeSourceTypeFilter; limit?: number; offset?: number }): Promise<KnowledgeSource[]> {
    let result = Array.from(this.sources.values());
    if (filter?.type) {
      result = result.filter((s) => s.type === filter.type);
    }
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? result.length;
    return result.slice(offset, offset + limit);
  }
  async update(id: string, updates: Partial<Omit<KnowledgeSource, "id" | "createdAt" | "updatedAt">>): Promise<KnowledgeSource> {
    const src = this.sources.get(id);
    if (!src) throw new Error("Source not found");
    Object.assign(src, updates);
    src.updatedAt = new Date().toISOString();
    return src;
  }
  async delete(id: string): Promise<void> {
    this.sources.delete(id);
  }

  // Extensions
  async search(query: string): Promise<KnowledgeSource[]> {
    const q = query.toLowerCase();
    return Array.from(this.sources.values()).filter((s) => s.name.toLowerCase().includes(q));
  }
  async createMany(sources: Omit<KnowledgeSource, "createdAt" | "updatedAt">[]): Promise<KnowledgeSource[]> {
    const created: KnowledgeSource[] = [];
    for (const s of sources) {
      created.push(await this.create(s));
    }
    return created;
  }
  async updateMany(updates: { id: string; changes: Partial<Omit<KnowledgeSource, "id" | "createdAt" | "updatedAt">> }[]): Promise<void> {
    for (const update of updates) {
      await this.update(update.id, update.changes);
    }
  }
  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }
}

class InMemoryChunkRepository implements IChunkRepository {
  private chunks: Chunk[] = [];

  async create(chunk: Omit<Chunk, "id" | "createdAt">): Promise<Chunk> {
    const created: Chunk = {
      ...chunk,
      id: `chunk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    this.chunks.push(created);
    return created;
  }
  async update(id: string, updates: Partial<Omit<Chunk, "id" | "createdAt">>): Promise<Chunk> {
    const idx = this.chunks.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Chunk not found");
    const updated = { ...this.chunks[idx], ...updates } as Chunk;
    this.chunks[idx] = updated;
    return updated;
  }
  async delete(id: string): Promise<void> {
    this.chunks = this.chunks.filter((c) => c.id !== id);
  }

  async createMany(chunksList: Omit<Chunk, "id" | "createdAt">[]): Promise<Chunk[]> {
    const result: Chunk[] = chunksList.map((c, idx) => ({
      ...c,
      id: `chunk-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    }));
    this.chunks.push(...result);
    return result;
  }
  async getByDocumentId(documentId: string): Promise<Chunk[]> {
    return this.chunks.filter((c) => c.documentId === documentId);
  }
  async deleteByDocumentId(documentId: string): Promise<void> {
    this.chunks = this.chunks.filter((c) => c.documentId !== documentId);
  }
  async search(query: string): Promise<Chunk[]> {
    return this.chunks.filter((c) => c.content.toLowerCase().includes(query.toLowerCase()));
  }
  async updateMany(updates: { id: string; changes: Partial<Omit<Chunk, "id" | "createdAt">> }[]): Promise<void> {
    for (const update of updates) {
      await this.update(update.id, update.changes);
    }
  }
  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }
  getAll(): Chunk[] {
    return this.chunks;
  }
}

class InMemoryKnowledgeCollectionRepository implements IKnowledgeCollectionRepository {
  private collections = new Map<string, KnowledgeCollection>();

  async create(collection: Omit<KnowledgeCollection, "createdAt" | "updatedAt">): Promise<KnowledgeCollection> {
    const col: KnowledgeCollection = {
      ...collection,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.collections.set(col.id, col);
    return col;
  }
  async getById(id: string): Promise<KnowledgeCollection | null> {
    return this.collections.get(id) ?? null;
  }
  async update(id: string, updates: Partial<Omit<KnowledgeCollection, "id" | "createdAt" | "updatedAt">>): Promise<KnowledgeCollection> {
    const col = this.collections.get(id);
    if (!col) throw new Error("Collection not found");
    Object.assign(col, updates);
    col.updatedAt = new Date().toISOString();
    return col;
  }
  async delete(id: string): Promise<void> {
    this.collections.delete(id);
  }
  async list(filter?: { limit?: number; offset?: number }): Promise<KnowledgeCollection[]> {
    const result = Array.from(this.collections.values());
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? result.length;
    return result.slice(offset, offset + limit);
  }
  async createMany(collections: Omit<KnowledgeCollection, "createdAt" | "updatedAt">[]): Promise<KnowledgeCollection[]> {
    const created: KnowledgeCollection[] = [];
    for (const col of collections) {
      created.push(await this.create(col));
    }
    return created;
  }
  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }
}

class InMemoryEmbeddingRepository implements IEmbeddingRepository {
  private embeddings = new Map<string, PersistentEmbedding>();

  async save(chunkId: string, vector: number[], metadata: EmbeddingMetadata): Promise<PersistentEmbedding> {
    const entry: PersistentEmbedding = {
      chunkId,
      vector,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.embeddings.set(chunkId, entry);
    return entry;
  }

  async saveBatch(entries: { chunkId: string; vector: number[]; metadata: EmbeddingMetadata }[]): Promise<void> {
    for (const e of entries) {
      await this.save(e.chunkId, e.vector, e.metadata);
    }
  }

  async get(chunkId: string): Promise<PersistentEmbedding | null> {
    return this.embeddings.get(chunkId) ?? null;
  }

  async delete(chunkId: string): Promise<void> {
    this.embeddings.delete(chunkId);
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    // Delete in-memory records matching document
  }

  async clear(): Promise<void> {
    this.embeddings.clear();
  }
}

export class ForgeFlowService {
  public agentRegistry: AgentRegistry;
  public toolRegistry: ToolRegistry;
  public toolCoordinator: ToolExecutionCoordinator;
  public messageBus: AgentMessageBus;
  public memorySystem: AgentMemorySystem;
  public workflowCoordinator: AgentWorkflowCoordinator;
  public autonomousCoordinator: AutonomousCoordinator;

  public workingMemoryEngine: WorkingMemoryEngine;
  public conversationMemoryEngine: ConversationMemoryEngine;
  public longTermMemoryEngine: LongTermMemoryEngine;
  public semanticMemoryEngine: SemanticMemoryEngine;
  public memoryRetrievalEngine: UnifiedMemoryRetrievalEngine;

  public docRepository: InMemoryKnowledgeDocumentRepository;
  public sourceRepository: InMemoryKnowledgeSourceRepository;
  public chunkRepository: InMemoryChunkRepository;
  public collectionRepository: InMemoryKnowledgeCollectionRepository;
  public embeddingRepository: InMemoryEmbeddingRepository;
  public vectorStore: InMemoryVectorStore;
  public retrievalPipeline: RetrievalPipeline;
  public retrievalCount = 0;

  /** Live execution history — workflow runs, agent runs, and activity log */
  public executionHistory: ExecutionHistoryStore = executionHistory;

  /** Live workflows list (user-created; starts empty) */
  public workflows: import("./workflow-data").Workflow[] = [];

  constructor() {
    this.agentRegistry = AgentFactory.createDefaultRegistry();
    this.toolRegistry = new ToolRegistry();

    // Register default mock tools for the ecosystem
    this.toolRegistry.register(
      new (class FileTool extends BaseTool {
        constructor() {
          super({
            metadata: { id: "file-tool", name: "File Tool", description: "Read and write local workspace files.", version: "1.0.0" },
            capability: { requiresNetwork: false, requiresFileSystem: true, requiresDatabase: false, requiresAuthentication: false },
            permission: { scopes: ["fs:read", "fs:write"], requiresApproval: false },
          });
        }
        async execute() {
          return "Mock file content read successfully.";
        }
      })()
    );
    this.toolRegistry.register(
      new (class HttpTool extends BaseTool {
        constructor() {
          super({
            metadata: { id: "http-tool", name: "HTTP Tool", description: "Make HTTP requests to web endpoints.", version: "1.0.0" },
            capability: { requiresNetwork: true, requiresFileSystem: false, requiresDatabase: false, requiresAuthentication: false },
            permission: { scopes: ["network:read"], requiresApproval: false },
          });
        }
        async execute() {
          return "HTTP 200 OK Response.";
        }
      })()
    );

    this.messageBus = new AgentMessageBus();
    this.toolCoordinator = new ToolExecutionCoordinator(this.toolRegistry, this.messageBus);

    const memoryProvider = MemoryFactory.create("in-memory", "forgeflow-main-provider");
    this.memorySystem = new AgentMemorySystem(memoryProvider);

    this.workingMemoryEngine = new WorkingMemoryEngine();
    this.conversationMemoryEngine = new ConversationMemoryEngine();
    const memoryRepo = new InMemoryMemoryRepository();
    this.longTermMemoryEngine = new LongTermMemoryEngine({ repository: memoryRepo });
    this.semanticMemoryEngine = new SemanticMemoryEngine({ repository: memoryRepo });
    this.memoryRetrievalEngine = new UnifiedMemoryRetrievalEngine({
      workingMemory: this.workingMemoryEngine,
      conversationMemory: this.conversationMemoryEngine,
      longTermMemory: this.longTermMemoryEngine,
      semanticMemory: this.semanticMemoryEngine,
    });

    // Seed some memory elements inside the main class instance
    this.seedMemory();

    this.workflowCoordinator = new AgentWorkflowCoordinator(
      new (class MockWorkflowRuntime {
        getRuntime() {
          return {
            createSession: (sid: string) => ({
              id: sid,
              status: "idle",
              context: { variables: {} },
              messages: [],
              diagnostics: {},
            }),
            runStep: async () => "Step complete",
          };
        }
      })() as any,
      this.messageBus
    );

    this.autonomousCoordinator = new AutonomousCoordinator(
      this.agentRegistry,
      this.toolCoordinator,
      this.memorySystem,
      this.workflowCoordinator,
      this.messageBus,
    );

    this.docRepository = new InMemoryKnowledgeDocumentRepository();
    this.sourceRepository = new InMemoryKnowledgeSourceRepository();
    this.chunkRepository = new InMemoryChunkRepository();
    this.collectionRepository = new InMemoryKnowledgeCollectionRepository();
    this.embeddingRepository = new InMemoryEmbeddingRepository();
    this.vectorStore = new InMemoryVectorStore(1536);
    this.retrievalPipeline = new RetrievalPipeline(
      EmbeddingFactory.create("mock"),
      this.vectorStore,
      new MockLLMProvider()
    );

    this.seedKnowledge();
  }

  private async seedMemory() {
    await this.memorySystem.longTerm.semantic.learnFact("project_info", "ForgeFlow AI Core version 1.0.0");
    await this.memorySystem.longTerm.episodic.recordEpisode(
      "ep-1",
      "Processed 12,480 records successfully",
      "SUCCESS",
      true
    );
  }

  private async seedKnowledge() {
    await this.docRepository.create({
      id: "doc-1",
      sourceId: "src-1",
      title: "OAuth API Authentication Guide.md",
      status: "ready",
      storagePath: "/storage/docs/oauth.md",
      metadata: {
        fileName: "OAuth API Authentication Guide.md",
        fileSize: 1024,
        mimeType: "text/markdown",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    await this.docRepository.create({
      id: "doc-2",
      sourceId: "src-2",
      title: "Workspace Deployment Manual.pdf",
      status: "ready",
      storagePath: "/storage/docs/deploy.pdf",
      metadata: {
        fileName: "Workspace Deployment Manual.pdf",
        fileSize: 2048,
        mimeType: "application/pdf",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    await this.chunkRepository.createMany([
      { documentId: "doc-1", index: 0, content: "OAuth configuration guide", tokenCount: 4, metadata: {} },
      { documentId: "doc-1", index: 1, content: "Client secret mapping info", tokenCount: 5, metadata: {} },
      { documentId: "doc-2", index: 0, content: "Kubernetes step guide", tokenCount: 3, metadata: {} },
    ]);

    // Placeholder vectors for seeded knowledge documents (1536-dim, uniform).
    // In production these would be real embeddings from an embedding model.
    const makeVec = (seed: number) => Array.from({ length: 1536 }, (_, i) => seed + i * 0.00001);

    await this.vectorStore.insert({
      id: "chunk-doc-1-0",
      documentId: "doc-1",
      vector: makeVec(0.1),
      content: "OAuth configuration guide",
      metadata: { content: "OAuth info" },
    });
    await this.vectorStore.insert({
      id: "chunk-doc-1-1",
      documentId: "doc-1",
      vector: makeVec(0.15),
      content: "Client secret mapping info",
      metadata: { content: "Secret mapping" },
    });
    await this.vectorStore.insert({
      id: "chunk-doc-2-0",
      documentId: "doc-2",
      vector: makeVec(0.9),
      content: "Kubernetes step guide",
      metadata: { content: "Kubernetes step" },
    });

    // Retrieval count starts at 0 and increments on actual queries.
    this.retrievalCount = 0;
  }
}

const globalForForgeFlow = globalThis as unknown as {
  forgeFlowService: ForgeFlowService | undefined;
};

export const forgeFlowService =
  globalForForgeFlow.forgeFlowService ?? new ForgeFlowService();

if (process.env.NODE_ENV !== "production") {
  globalForForgeFlow.forgeFlowService = forgeFlowService;
}
