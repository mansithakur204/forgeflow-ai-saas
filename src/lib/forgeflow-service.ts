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
} from "@/agents";
import { InMemoryVectorStore } from "@/knowledge/vector-store/in-memory-vector-store";

import { MOCK_WORKFLOWS } from "./workflow-data";

// Concrete repositories for Knowledge
import type { IKnowledgeDocumentRepository, IKnowledgeSourceRepository, IChunkRepository } from "@/knowledge/repository/knowledge-repository.interface";
import type { KnowledgeDocument, KnowledgeSource, Chunk, DocumentStatus } from "@/knowledge/types/document";

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
  async list(): Promise<KnowledgeDocument[]> {
    return Array.from(this.docs.values());
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
  async list(): Promise<KnowledgeSource[]> {
    return Array.from(this.sources.values());
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
}

class InMemoryChunkRepository implements IChunkRepository {
  private chunks: Chunk[] = [];
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
  getAll(): Chunk[] {
    return this.chunks;
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

  public docRepository: InMemoryKnowledgeDocumentRepository;
  public sourceRepository: InMemoryKnowledgeSourceRepository;
  public chunkRepository: InMemoryChunkRepository;
  public vectorStore: InMemoryVectorStore;
  public retrievalCount = 0;

  public workflows = [...MOCK_WORKFLOWS];

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
    // 1536-dimensional vector store matches standard embedding models (e.g., text-embedding-3-small, Gemini embedding)
    this.vectorStore = new InMemoryVectorStore(1536);

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
