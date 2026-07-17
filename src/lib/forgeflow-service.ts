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
  AgentAnalyticsService,
  MultiAgentOrchestrator,
  AgentQueueManager,
} from "@/agents";
import { AgentRuntimeCoordinator } from "@/agents/runtime/agent-runtime-coordinator";
import { InMemoryVectorStore } from "@/knowledge/vector-store/in-memory-vector-store";
import { executionHistory } from "./execution-history";
// Use the class instance type via ReturnType
type ExecutionHistoryStore = typeof executionHistory;

import type {
  ISettingsRepository,
  IOrganizationRepository,
  IBillingRepository,
  ISecretsRepository,
  IIntegrationRepository,
  ITemplateRepository,
  IMarketplaceRepository,
  IApiTokenRepository,
  IWorkflowRepository,
  IExecutionHistoryRepository,
} from "./repositories/interfaces";
import { createRepositorySet, wrapWorkflowsArray } from "./repositories/factory";
import { isDatabaseConfigured } from "./db/connection";

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
  public executionHistory!: ExecutionHistoryStore;

  /** Live workflows list (user-created; starts empty) */
  public workflows: import("./workflow-data").Workflow[] = [];

  public analyticsService: AgentAnalyticsService;
  public queueManager: AgentQueueManager;
  public orchestrator: MultiAgentOrchestrator;
  public integrationsRepository!: IIntegrationRepository;
  public templatesRepository!: ITemplateRepository;
  public marketplaceRepository!: IMarketplaceRepository;
  public settingsRepository!: ISettingsRepository;
  public organizationRepository!: IOrganizationRepository;
  public billingRepository!: IBillingRepository;
  public secretsRepository!: ISecretsRepository;
  public apiTokenRepository!: IApiTokenRepository;
  public workflowRepository!: IWorkflowRepository;
  public executionHistoryRepository!: IExecutionHistoryRepository;

  constructor() {
    this.analyticsService = new AgentAnalyticsService();
    this.queueManager = new AgentQueueManager({}, console);
    this.agentRegistry = AgentFactory.createDefaultRegistry();

    const runtimeCoordinator = new AgentRuntimeCoordinator(this.agentRegistry);
    this.orchestrator = new MultiAgentOrchestrator(
      this.agentRegistry,
      runtimeCoordinator,
      { parallelExecutionEnabled: false },
      this.queueManager,
      undefined,
      this.analyticsService
    );
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

    const repos = createRepositorySet(this.workflows);
    this.integrationsRepository = repos.integrationsRepository;
    this.templatesRepository = repos.templatesRepository;
    this.marketplaceRepository = repos.marketplaceRepository;
    this.settingsRepository = repos.settingsRepository;
    this.organizationRepository = repos.organizationRepository;
    this.billingRepository = repos.billingRepository;
    this.secretsRepository = repos.secretsRepository;
    this.apiTokenRepository = repos.apiTokenRepository;
    this.workflowRepository = repos.workflowRepository;
    this.executionHistoryRepository = repos.executionHistoryRepository;

    if (isDatabaseConfigured()) {
      const { PostgresExecutionHistoryStore } = require("./repositories/postgres/ExecutionHistoryRepository");
      const store = new PostgresExecutionHistoryStore(this.executionHistoryRepository);
      this.executionHistory = store;

      // Run migrations and seed/load data asynchronously
      (async () => {
        const { runMigrations } = require("./db/migrate");
        await runMigrations();

        // Seed database integrations if empty
        const integrations = await this.integrationsRepository.findAll();
        if (integrations.length === 0) {
          this.seedIntegrations();
        }

        // Seed templates
        const templates = await this.templatesRepository.findAll();
        if (templates.length === 0) {
          this.seedTemplates();
        }

        // Seed marketplace
        const marketplace = await this.marketplaceRepository.findAll();
        if (marketplace.length === 0) {
          this.seedMarketplace();
        }

        // Load existing workflows into this.workflows
        const dbWorkflows = await this.workflowRepository.findAll();
        this.workflows.push(...dbWorkflows);

        // Load execution history
        await store.loadFromDb();
      })().catch((err) => console.error("[ForgeFlow] DB initialization/migrations failed:", err));
    } else {
      this.executionHistory = executionHistory;
      this.seedIntegrations();
      this.seedTemplates();
      this.seedMarketplace();
      this.settingsRepository.addLog({
        id: "log-1",
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        user: "System Seeding",
        action: "Workspace Initialized",
        details: "Default enterprise workspace parameters loaded.",
      });
      this.organizationRepository.addLog({
        id: "log-1",
        timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        user: "System Seeding",
        action: "Organization Seeding",
        details: "Default enterprise membership roster seeded.",
      });
    }

    // Wrap workflows array in a Proxy so that any mutations (like push, splice, item setting) are transparently persisted
    this.workflows = wrapWorkflowsArray(this.workflows, this.workflowRepository);
  }

  private seedIntegrations() {
    const { encrypt } = require("./encryption");

    // Seed OpenAI
    this.integrationsRepository.save({
      providerId: "openai",
      status: "connected",
      health: "healthy",
      lastSync: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      encryptedSecrets: { apiKey: encrypt("sk-proj-seeded-openai-key-for-forgeflow-engine-runs") },
      updatedAt: new Date().toISOString(),
    });

    // Seed Slack
    this.integrationsRepository.save({
      providerId: "slack",
      status: "connected",
      health: "healthy",
      lastSync: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      encryptedSecrets: { botToken: encrypt("xoxb-seeded-slack-bot-token-auth") },
      updatedAt: new Date().toISOString(),
    });

    // Seed Notion
    this.integrationsRepository.save({
      providerId: "notion",
      status: "connected",
      health: "healthy",
      lastSync: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      encryptedSecrets: { apiToken: encrypt("secret_seeded-notion-auth-api-token") },
      updatedAt: new Date().toISOString(),
    });

    // Seed SendGrid (with a failure tracking mock using SDK state)
    this.integrationsRepository.save({
      providerId: "sendgrid",
      status: "connected",
      health: "failed",
      lastSync: null,
      encryptedSecrets: { apiKey: encrypt("SG.seeded-sendgrid-auth-key-error") },
      updatedAt: new Date().toISOString(),
    });

    // Seed health states on SDK's IntegrationConnectionManager
    const { IntegrationConnectionManager } = require("@/engine/executors/base/integration-sdk");
    
    const openAiConn = IntegrationConnectionManager.getOrCreateConnection("openai");
    openAiConn.status = "healthy";
    openAiConn.successCounter = 124;
    openAiConn.lastSuccessfulOperationAt = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const slackConn = IntegrationConnectionManager.getOrCreateConnection("slack");
    slackConn.status = "healthy";
    slackConn.successCounter = 485;
    slackConn.lastSuccessfulOperationAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const notionConn = IntegrationConnectionManager.getOrCreateConnection("notion");
    notionConn.status = "healthy";
    notionConn.successCounter = 48;
    notionConn.lastSuccessfulOperationAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const sendgridConn = IntegrationConnectionManager.getOrCreateConnection("sendgrid");
    sendgridConn.status = "failed";
    sendgridConn.failureCounter = 4;
  }

  private seedTemplates() {
    this.templatesRepository.save({
      id: "tpl-qualification",
      name: "Lead Qualification AI",
      description: "Ingests inbound leads, classifies intent via LLM, and routes to Slack.",
      category: "AI",
      difficulty: "Intermediate",
      tags: ["CRM", "AI", "Sales"],
      estimatedRuntime: "8.5s",
      requiredIntegrations: ["openai", "slack"],
      previewImage: "/images/templates/qualification.png",
      version: "1.2.0",
      author: "ForgeFlow Core",
      downloads: 1482,
      rating: 4.9,
      nodes: [
        { id: "node-1", typeId: "trigger_webhook", label: "Inbound Lead", position: { x: 80, y: 200 }, config: {} },
        { id: "node-2", typeId: "logic_transform", label: "Normalize Data", position: { x: 320, y: 200 }, config: {} },
        { id: "node-3", typeId: "ai_classifier", label: "Intent Classifier", position: { x: 560, y: 200 }, config: {} },
        { id: "node-4", typeId: "io_slack", label: "Notify Sales", position: { x: 800, y: 200 }, config: {} }
      ],
      connections: [
        { id: "conn-1", fromNodeId: "node-1", fromPortId: "out", toNodeId: "node-2", toPortId: "in" },
        { id: "conn-2", fromNodeId: "node-2", fromPortId: "out", toNodeId: "node-3", toPortId: "in" },
        { id: "conn-3", fromNodeId: "node-3", fromPortId: "out", toNodeId: "node-4", toPortId: "in" }
      ]
    });

    this.templatesRepository.save({
      id: "tpl-invoices",
      name: "Invoice Processing Suite",
      description: "OCR extraction, database sync, and confirmation email for incoming vendor invoices.",
      category: "Automation",
      difficulty: "Advanced",
      tags: ["Finance", "OCR", "ERP"],
      estimatedRuntime: "14.2s",
      requiredIntegrations: ["google_sheets", "smtp"],
      previewImage: "/images/templates/invoices.png",
      version: "2.0.1",
      author: "Finance Team",
      downloads: 340,
      rating: 4.7,
      nodes: [
        { id: "node-1", typeId: "trigger_schedule", label: "Hourly Invoice Fetcher", position: { x: 80, y: 200 }, config: {} },
        { id: "node-2", typeId: "io_database", label: "Fetch ERP records", position: { x: 320, y: 200 }, config: {} },
        { id: "node-3", typeId: "io_email", label: "Send Invoice PDF", position: { x: 560, y: 200 }, config: {} }
      ],
      connections: [
        { id: "conn-1", fromNodeId: "node-1", fromPortId: "out", toNodeId: "node-2", toPortId: "in" },
        { id: "conn-2", fromNodeId: "node-2", fromPortId: "out", toNodeId: "node-3", toPortId: "in" }
      ]
    });

    this.templatesRepository.save({
      id: "tpl-support",
      name: "Customer Support Triage",
      description: "Classifies incoming customer support tickets and routes to the right Slack channel.",
      category: "Support",
      difficulty: "Beginner",
      tags: ["Support", "AI"],
      estimatedRuntime: "3.1s",
      requiredIntegrations: ["slack"],
      previewImage: "/images/templates/support.png",
      version: "1.0.0",
      author: "Support Operations",
      downloads: 2910,
      rating: 4.8,
      nodes: [
        { id: "node-1", typeId: "trigger_manual", label: "Manual Ticket Trigger", position: { x: 80, y: 200 }, config: {} },
        { id: "node-2", typeId: "io_slack", label: "Slack Triage Bot", position: { x: 320, y: 200 }, config: {} }
      ],
      connections: [
        { id: "conn-1", fromNodeId: "node-1", fromPortId: "out", toNodeId: "node-2", toPortId: "in" }
      ]
    });

    this.templatesRepository.save({
      id: "tpl-devops",
      name: "GitHub PR Reviewer",
      description: "Triggered on webhook, code reviews PR edits, and posts recommendations back to GitHub.",
      category: "DevOps",
      difficulty: "Intermediate",
      tags: ["Dev", "AI", "GitHub"],
      estimatedRuntime: "6.8s",
      requiredIntegrations: ["openai"],
      previewImage: "/images/templates/devops.png",
      version: "1.1.0",
      author: "SRE Team",
      downloads: 156,
      rating: 4.5,
      nodes: [
        { id: "node-1", typeId: "trigger_webhook", label: "GitHub Webhook Trigger", position: { x: 80, y: 200 }, config: {} },
        { id: "node-2", typeId: "ai_llm", label: "GPT-4o Code Auditor", position: { x: 320, y: 200 }, config: {} }
      ],
      connections: [
        { id: "conn-1", fromNodeId: "node-1", fromPortId: "out", toNodeId: "node-2", toPortId: "in" }
      ]
    });
  }

  private seedMarketplace() {
    this.marketplaceRepository.save({
      id: "tpl-qualification",
      name: "Lead Qualification AI",
      description: "Ingests inbound leads, classifies intent via LLM, and routes to Slack.",
      category: "AI",
      author: "ForgeFlow Core",
      downloads: 5410,
      rating: 4.8,
      license: "MIT",
      lastUpdated: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      previewImage: "/images/templates/qualification.png",
      versions: [
        { version: "1.0.0", updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), changeLog: "Initial draft release." },
        { version: "1.2.0", updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), changeLog: "Added Slack notification routing channels config." },
        { version: "1.3.0", updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), changeLog: "Optimized LLM parsing efficiency triggers." }
      ],
      reviews: [
        { id: "rev-1", author: "DevOps Engineer", rating: 5, comment: "Works perfectly with OpenAI key configurations. Extremely direct.", createdAt: new Date().toISOString() }
      ],
      nodes: [
        { id: "node-1", typeId: "trigger_webhook", label: "Inbound Lead", position: { x: 80, y: 200 }, config: {} },
        { id: "node-2", typeId: "logic_transform", label: "Normalize Data", position: { x: 320, y: 200 }, config: {} },
        { id: "node-3", typeId: "ai_classifier", label: "Intent Classifier v2", position: { x: 560, y: 200 }, config: {} },
        { id: "node-4", typeId: "io_slack", label: "Notify Sales Slack", position: { x: 800, y: 200 }, config: {} }
      ],
      connections: [
        { id: "conn-1", fromNodeId: "node-1", fromPortId: "out", toNodeId: "node-2", toPortId: "in" },
        { id: "conn-2", fromNodeId: "node-2", fromPortId: "out", toNodeId: "node-3", toPortId: "in" },
        { id: "conn-3", fromNodeId: "node-3", fromPortId: "out", toNodeId: "node-4", toPortId: "in" }
      ]
    });

    this.marketplaceRepository.save({
      id: "tpl-onboarding",
      name: "Customer Onboarding Bot",
      description: "Automated greeting emails, Notion checklist creation, and project folder setups.",
      category: "Automation",
      author: "Growth Operations",
      downloads: 1205,
      rating: 4.6,
      license: "Apache 2.0",
      lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      previewImage: "/images/templates/onboarding.png",
      versions: [
        { version: "1.0.0", updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), changeLog: "Initial build." },
        { version: "2.1.0", updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), changeLog: "Added Notion checklist databases support." }
      ],
      reviews: [],
      nodes: [
        { id: "node-1", typeId: "trigger_webhook", label: "Signed Contract Trigger", position: { x: 80, y: 200 }, config: {} },
        { id: "node-2", typeId: "io_notion", label: "Build Checklist Board", position: { x: 320, y: 200 }, config: {} },
        { id: "node-3", typeId: "io_email", label: "Welcome email confirmation", position: { x: 560, y: 200 }, config: {} }
      ],
      connections: [
        { id: "conn-1", fromNodeId: "node-1", fromPortId: "out", toNodeId: "node-2", toPortId: "in" },
        { id: "conn-2", fromNodeId: "node-2", fromPortId: "out", toNodeId: "node-3", toPortId: "in" }
      ]
    });

    this.marketplaceRepository.save({
      id: "tpl-salesforce",
      name: "Salesforce Pipeline Sync",
      description: "Bidirectional sync of pipeline deals between custom databases and Salesforce records.",
      category: "CRM",
      author: "Sales Operations",
      downloads: 875,
      rating: 4.7,
      license: "Commercial",
      lastUpdated: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      previewImage: "/images/templates/salesforce.png",
      versions: [
        { version: "1.0.0", updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), changeLog: "Enterprise sync pipeline setup." }
      ],
      reviews: [],
      nodes: [
        { id: "node-1", typeId: "trigger_schedule", label: "Sync Scheduler Interval", position: { x: 80, y: 200 }, config: {} },
        { id: "node-2", typeId: "io_database", label: "Fetch Pipeline Diff", position: { x: 320, y: 200 }, config: {} }
      ],
      connections: [
        { id: "conn-1", fromNodeId: "node-1", fromPortId: "out", toNodeId: "node-2", toPortId: "in" }
      ]
    });

    this.marketplaceRepository.save({
      id: "tpl-devops",
      name: "GitHub PR Reviewer",
      description: "Triggered on webhook, code reviews PR edits, and posts recommendations back to GitHub.",
      category: "DevOps",
      author: "SRE Team",
      downloads: 1320,
      rating: 4.5,
      license: "MIT",
      lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      previewImage: "/images/templates/devops.png",
      versions: [
        { version: "1.1.0", updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), changeLog: "Initial GitHub SRE tool pipeline." }
      ],
      reviews: [],
      nodes: [
        { id: "node-1", typeId: "trigger_webhook", label: "GitHub Webhook Trigger", position: { x: 80, y: 200 }, config: {} },
        { id: "node-2", typeId: "ai_llm", label: "GPT-4o Code Auditor", position: { x: 320, y: 200 }, config: {} }
      ],
      connections: [
        { id: "conn-1", fromNodeId: "node-1", fromPortId: "out", toNodeId: "node-2", toPortId: "in" }
      ]
    });

    this.marketplaceRepository.save({
      id: "tpl-productivity",
      name: "Productivity Scheduler",
      description: "Daily task summaries compilation pushed directly to messaging channels.",
      category: "Productivity",
      author: "Internal SRE",
      downloads: 2480,
      rating: 4.9,
      license: "MIT",
      lastUpdated: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      previewImage: "/images/templates/productivity.png",
      versions: [
        { version: "1.0.0", updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), changeLog: "Compile day stats." }
      ],
      reviews: [],
      nodes: [
        { id: "node-1", typeId: "trigger_schedule", label: "End of Day summary scheduler", position: { x: 80, y: 200 }, config: {} }
      ],
      connections: []
    });
  }
}

export interface WorkspaceSettings {
  version: number;
  general: {
    workspaceName: string;
    description: string;
    timezone: string;
  };
  workspace: {
    id: string;
    owner: string;
    billingTier: string;
  };
  aiProviders: {
    defaultProvider: string;
    temperature: number;
    openaiKey: string;
    geminiKey: string;
    anthropicKey: string;
  };
  environmentVariables: Record<string, string>;
  security: {
    sessionTimeoutMinutes: number;
    ipRestrictions: string;
    mfaRequired: boolean;
  };
  notifications: {
    onPipelineFailure: boolean;
    onAgentHandoff: boolean;
    onApprovalRequest: boolean;
  };
  appearance: {
    theme: "light" | "dark" | "system";
    accentColor: string;
  };
  roles: {
    roleName: string;
    description: string;
    permissions: string[];
  }[];
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export class InMemorySettingsRepository {
  private currentSettings!: WorkspaceSettings;
  private auditLogs: AuditLogRecord[] = [];

  constructor() {
    this.resetToDefaults();
  }

  resetToDefaults() {
    this.currentSettings = {
      version: 1,
      general: {
        workspaceName: "ForgeFlow AI Workspace",
        description: "Standard tenant workspace for Agentic workflows.",
        timezone: "UTC",
      },
      workspace: {
        id: "ws-tenant-default-001",
        owner: "Jane Doe (jane.doe@example.com)",
        billingTier: "Enterprise",
      },
      aiProviders: {
        defaultProvider: "openai",
        temperature: 0.7,
        openaiKey: "",
        geminiKey: "",
        anthropicKey: "",
      },
      environmentVariables: {},
      security: {
        sessionTimeoutMinutes: 60,
        ipRestrictions: "0.0.0.0/0",
        mfaRequired: false,
      },
      notifications: {
        onPipelineFailure: true,
        onAgentHandoff: false,
        onApprovalRequest: true,
      },
      appearance: {
        theme: "dark",
        accentColor: "#3b82f6",
      },
      roles: [
        { roleName: "Admin", description: "Full workspace read/write and security rights.", permissions: ["all"] },
        { roleName: "Editor", description: "Create, edit and trigger workflows. No billing or security updates.", permissions: ["read", "write", "trigger"] },
        { roleName: "Viewer", description: "View metrics and canvases only.", permissions: ["read"] }
      ]
    };
  }

  async get(): Promise<WorkspaceSettings> {
    return this.currentSettings;
  }

  async save(settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    this.currentSettings = settings;
    return this.currentSettings;
  }

  async addLog(log: AuditLogRecord): Promise<void> {
    this.auditLogs.unshift(log);
  }

  async getLogs(): Promise<AuditLogRecord[]> {
    return this.auditLogs;
  }
}

export interface WorkspacePermissions {
  workflows: "read" | "write" | "none";
  ai: "read" | "write" | "none";
  integrations: "read" | "write" | "none";
  marketplace: "read" | "write" | "none";
  templates: "read" | "write" | "none";
  settings: "read" | "write" | "none";
}

export interface OrganizationRole {
  roleName: "Owner" | "Admin" | "Developer" | "Viewer";
  permissions: WorkspacePermissions;
}

export interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "Owner" | "Admin" | "Developer" | "Viewer";
  status: "active" | "suspended";
  joinedAt: string;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  role: "Owner" | "Admin" | "Developer" | "Viewer";
  token: string;
  expiresAt: string;
  invitedAt: string;
  status?: string;
  invitedBy?: string;
}

export interface Organization {
  id: string;
  name: string;
  billingTier: string;
  ownerEmail: string;
}

export interface OrganizationAuditRecord {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export class InMemoryOrganizationRepository {
  private currentOrg!: Organization;
  private members = new Map<string, TeamMember>();
  private invitations = new Map<string, OrganizationInvitation>();
  private roles = new Map<string, OrganizationRole>();
  private auditLogs: OrganizationAuditRecord[] = [];

  constructor() {
    this.resetToDefaults();
  }

  resetToDefaults() {
    this.currentOrg = {
      id: "org-tenant-001",
      name: "ForgeFlow Enterprise Org",
      billingTier: "Enterprise Plan",
      ownerEmail: "jane.doe@example.com",
    };

    this.members.clear();
    this.invitations.clear();
    this.roles.clear();
    this.auditLogs = [];

    this.roles.set("Owner", {
      roleName: "Owner",
      permissions: { workflows: "write", ai: "write", integrations: "write", marketplace: "write", templates: "write", settings: "write" }
    });
    this.roles.set("Admin", {
      roleName: "Admin",
      permissions: { workflows: "write", ai: "write", integrations: "write", marketplace: "write", templates: "write", settings: "write" }
    });
    this.roles.set("Developer", {
      roleName: "Developer",
      permissions: { workflows: "write", ai: "write", integrations: "write", marketplace: "read", templates: "write", settings: "none" }
    });
    this.roles.set("Viewer", {
      roleName: "Viewer",
      permissions: { workflows: "read", ai: "read", integrations: "none", marketplace: "read", templates: "read", settings: "none" }
    });

    this.members.set("mem-1", {
      id: "mem-1",
      email: "jane.doe@example.com",
      firstName: "Jane",
      lastName: "Doe",
      role: "Owner",
      status: "active",
      joinedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    });

    this.members.set("mem-2", {
      id: "mem-2",
      email: "bob.smith@example.com",
      firstName: "Bob",
      lastName: "Smith",
      role: "Developer",
      status: "active",
      joinedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    });

    this.members.set("mem-3", {
      id: "mem-3",
      email: "alice.johnson@example.com",
      firstName: "Alice",
      lastName: "Johnson",
      role: "Viewer",
      status: "active",
      joinedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    });
  }

  async getOrganization(): Promise<Organization> {
    return this.currentOrg;
  }

  async saveOrganization(org: Organization): Promise<Organization> {
    this.currentOrg = org;
    return this.currentOrg;
  }

  async findMemberById(id: string): Promise<TeamMember | undefined> {
    return this.members.get(id);
  }

  async findMemberByEmail(email: string): Promise<TeamMember | undefined> {
    return Array.from(this.members.values()).find((m) => m.email === email);
  }

  async saveMember(member: TeamMember): Promise<TeamMember> {
    this.members.set(member.id, member);
    return member;
  }

  async removeMember(id: string): Promise<boolean> {
    return this.members.delete(id);
  }

  async getMembers(): Promise<TeamMember[]> {
    return Array.from(this.members.values());
  }

  async saveInvitation(invite: OrganizationInvitation): Promise<OrganizationInvitation> {
    this.invitations.set(invite.id, invite);
    return invite;
  }

  async findInvitationById(id: string): Promise<OrganizationInvitation | undefined> {
    return this.invitations.get(id);
  }

  async removeInvitation(id: string): Promise<boolean> {
    return this.invitations.delete(id);
  }

  async getInvitations(): Promise<OrganizationInvitation[]> {
    return Array.from(this.invitations.values());
  }

  async getRole(roleName: string): Promise<OrganizationRole | undefined> {
    return this.roles.get(roleName);
  }

  async saveRole(role: OrganizationRole): Promise<OrganizationRole> {
    this.roles.set(role.roleName, role);
    return role;
  }

  async getRoles(): Promise<OrganizationRole[]> {
    return Array.from(this.roles.values());
  }

  async addLog(log: OrganizationAuditRecord): Promise<void> {
    this.auditLogs.unshift(log);
  }

  async getLogs(): Promise<OrganizationAuditRecord[]> {
    return this.auditLogs;
  }
}

export interface BillingPlan {
  id: string;
  name: string;
  priceMonthly: number;
  features: string[];
  limits: {
    tokens: number;
    workflows: number;
    storageMb: number;
    aiCredits: number;
  };
}

export interface SubscriptionRecord {
  planId: string;
  status: "active" | "trialing" | "canceled" | "past_due";
  trialEndsAt: string | null;
  renewalDate: string;
  billingCycle: "monthly" | "yearly";
}

export interface UsageRecord {
  tokensUsed: number;
  workflowsRun: number;
  storageMbUsed: number;
  aiCreditsUsed: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: "paid" | "open" | "uncollectible";
  createdAt: string;
  pdfUrl: string;
}

export class InMemoryBillingRepository {
  private plans = new Map<string, BillingPlan>();
  private subscription!: SubscriptionRecord;
  private usage!: UsageRecord;
  private invoices: InvoiceRecord[] = [];

  constructor() {
    this.resetToDefaults();
  }

  resetToDefaults() {
    this.plans.clear();
    this.plans.set("free", {
      id: "free",
      name: "Free",
      priceMonthly: 0,
      features: ["3 Workflows", "10,000 Tokens/mo", "50MB Storage", "100 AI Credits"],
      limits: { tokens: 10000, workflows: 3, storageMb: 50, aiCredits: 100 }
    });

    this.plans.set("pro", {
      id: "pro",
      name: "Pro",
      priceMonthly: 29,
      features: ["Unlimited Workflows", "500,000 Tokens/mo", "5GB Storage", "5,000 AI Credits", "Priority Support"],
      limits: { tokens: 500000, workflows: 1000000, storageMb: 5000, aiCredits: 5000 }
    });

    this.plans.set("team", {
      id: "team",
      name: "Team",
      priceMonthly: 79,
      features: ["Pro Features", "2,000,000 Tokens/mo", "20GB Storage", "20,000 AI Credits", "Collaborative Workspaces", "Shared Integrations"],
      limits: { tokens: 2000000, workflows: 1000000, storageMb: 20000, aiCredits: 20000 }
    });

    this.plans.set("enterprise", {
      id: "enterprise",
      name: "Enterprise",
      priceMonthly: 299,
      features: ["Team Features", "Unlimited Tokens", "100GB Storage", "100,000 AI Credits", "Custom SLA", "Dedicated SRE Support", "Audit Logs Export"],
      limits: { tokens: 100000000, workflows: 100000000, storageMb: 100000, aiCredits: 100000 }
    });

    this.subscription = {
      planId: "pro",
      status: "trialing",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
      renewalDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
      billingCycle: "monthly",
    };

    this.usage = {
      tokensUsed: 148200,
      workflowsRun: 242,
      storageMbUsed: 1200,
      aiCreditsUsed: 1450,
    };

    this.invoices = [
      { id: "inv-1", invoiceNumber: "INV-2026-001", amount: 0, status: "paid", createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), pdfUrl: "/invoices/inv-001.pdf" }
    ];
  }

  async getPlans(): Promise<BillingPlan[]> {
    return Array.from(this.plans.values());
  }

  async getSubscription(): Promise<SubscriptionRecord> {
    return this.subscription;
  }

  async saveSubscription(sub: SubscriptionRecord): Promise<SubscriptionRecord> {
    this.subscription = sub;
    return this.subscription;
  }

  async getUsage(): Promise<UsageRecord> {
    return this.usage;
  }

  async saveUsage(usage: UsageRecord): Promise<UsageRecord> {
    this.usage = usage;
    return this.usage;
  }

  async getInvoices(): Promise<InvoiceRecord[]> {
    return this.invoices;
  }

  async addInvoice(inv: InvoiceRecord): Promise<void> {
    this.invoices.unshift(inv);
  }
}

export type SecretType =
  | "OpenAI" | "Gemini" | "Anthropic" | "Azure OpenAI" | "Groq" | "Ollama"
  | "Slack" | "Discord" | "Notion" | "GitHub" | "SMTP"
  | "PostgreSQL" | "MySQL" | "MongoDB" | "Database" | "Custom";

export interface SecretRecord {
  id: string;
  name: string;
  type: SecretType;
  value: string; // encrypted
  folder: string;
  tags: string[];
  version: number;
  archived: boolean;
  expiresAt: string | null;
  lastRotatedAt: string;
  createdAt: string;
  usageCount: number;
}

export interface SecretVersionRecord {
  id: string;
  secretId: string;
  version: number;
  value: string; // encrypted
  createdAt: string;
  createdBy: string;
}

export interface SecretAuditRecord {
  id: string;
  secretId: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
}

export class InMemorySecretsRepository {
  private secrets = new Map<string, SecretRecord>();
  private versions: SecretVersionRecord[] = [];
  private auditLogs: SecretAuditRecord[] = [];

  constructor() {
    this.resetToDefaults();
  }

  resetToDefaults() {
    this.secrets.clear();
    this.versions = [];
    this.auditLogs = [];

    const { encrypt } = require("./encryption");
    const now = Date.now();

    const s1: SecretRecord = { id: "sec-1", name: "OPENAI_API_KEY", type: "OpenAI", value: encrypt("sk-proj-defaultseedopenaiapi1234567890abcdef"), folder: "AI Configs", tags: ["production", "models"], version: 1, archived: false, expiresAt: null, lastRotatedAt: new Date(now - 30 * 24 * 3600 * 1000).toISOString(), createdAt: new Date(now - 30 * 24 * 3600 * 1000).toISOString(), usageCount: 142 };
    const s2: SecretRecord = { id: "sec-2", name: "GEMINI_API_KEY", type: "Gemini", value: encrypt("AIzaSy-defaultseedgeminiapi1234567890xyz"), folder: "AI Configs", tags: ["production", "vision"], version: 1, archived: false, expiresAt: new Date(now + 180 * 24 * 3600 * 1000).toISOString(), lastRotatedAt: new Date(now - 10 * 24 * 3600 * 1000).toISOString(), createdAt: new Date(now - 45 * 24 * 3600 * 1000).toISOString(), usageCount: 88 };
    const s3: SecretRecord = { id: "sec-3", name: "SLACK_WEBHOOK_URL", type: "Slack", value: encrypt("https://hooks.slack.com/services/T000/B000/XXXXXXXXXXX"), folder: "Integrations", tags: ["alerts", "notifications"], version: 2, archived: false, expiresAt: null, lastRotatedAt: new Date(now - 5 * 24 * 3600 * 1000).toISOString(), createdAt: new Date(now - 60 * 24 * 3600 * 1000).toISOString(), usageCount: 34 };
    const s4: SecretRecord = { id: "sec-4", name: "POSTGRES_URL", type: "PostgreSQL", value: encrypt("postgresql://admin:password@db.example.com:5432/forgeflow"), folder: "Databases", tags: ["production", "primary"], version: 1, archived: false, expiresAt: null, lastRotatedAt: new Date(now - 90 * 24 * 3600 * 1000).toISOString(), createdAt: new Date(now - 90 * 24 * 3600 * 1000).toISOString(), usageCount: 310 };
    const s5: SecretRecord = { id: "sec-5", name: "GITHUB_TOKEN", type: "GitHub", value: encrypt("ghp_defaultseedgithubtoken1234567890abcd"), folder: "DevOps", tags: ["ci", "deploy"], version: 1, archived: true, expiresAt: new Date(now - 2 * 24 * 3600 * 1000).toISOString(), lastRotatedAt: new Date(now - 120 * 24 * 3600 * 1000).toISOString(), createdAt: new Date(now - 120 * 24 * 3600 * 1000).toISOString(), usageCount: 7 };

    [s1, s2, s3, s4, s5].forEach((s) => this.secrets.set(s.id, s));

    this.versions = [
      { id: "ver-1", secretId: "sec-1", version: 1, value: s1.value, createdAt: s1.createdAt, createdBy: "System Seed" },
      { id: "ver-2", secretId: "sec-2", version: 1, value: s2.value, createdAt: s2.createdAt, createdBy: "System Seed" },
      { id: "ver-3", secretId: "sec-3", version: 1, value: encrypt("https://hooks.slack.com/services/T000/B000/OLD_XXX"), createdAt: s3.createdAt, createdBy: "Jane Doe" },
      { id: "ver-4", secretId: "sec-3", version: 2, value: s3.value, createdAt: s3.lastRotatedAt, createdBy: "Jane Doe" },
      { id: "ver-5", secretId: "sec-4", version: 1, value: s4.value, createdAt: s4.createdAt, createdBy: "System Seed" },
      { id: "ver-6", secretId: "sec-5", version: 1, value: s5.value, createdAt: s5.createdAt, createdBy: "Bob Smith" },
    ];

    this.auditLogs = [
      { id: "aud-1", secretId: "sec-1", action: "Secret Created", user: "System Seed", timestamp: s1.createdAt, details: "OPENAI_API_KEY seeded into vault." },
      { id: "aud-2", secretId: "sec-2", action: "Secret Created", user: "System Seed", timestamp: s2.createdAt, details: "GEMINI_API_KEY seeded into vault." },
      { id: "aud-3", secretId: "sec-3", action: "Secret Created", user: "Jane Doe", timestamp: s3.createdAt, details: "Slack webhook URL configured." },
      { id: "aud-4", secretId: "sec-3", action: "Secret Rotated", user: "Jane Doe", timestamp: s3.lastRotatedAt, details: "Webhook URL rotated — v1 to v2." },
      { id: "aud-5", secretId: "sec-4", action: "Secret Created", user: "System Seed", timestamp: s4.createdAt, details: "PostgreSQL connection string stored." },
      { id: "aud-6", secretId: "sec-5", action: "Secret Archived", user: "Bob Smith", timestamp: new Date(now - 2 * 24 * 3600 * 1000).toISOString(), details: "GitHub token archived — expired." },
    ];
  }

  async getSecrets(): Promise<SecretRecord[]> { return Array.from(this.secrets.values()); }
  async getAll(): Promise<SecretRecord[]> { return this.getSecrets(); }

  async findSecretById(id: string): Promise<SecretRecord | undefined> { return this.secrets.get(id); }
  async findById(id: string): Promise<SecretRecord | undefined> { return this.findSecretById(id); }

  async saveSecret(secret: SecretRecord): Promise<SecretRecord> { this.secrets.set(secret.id, secret); return secret; }
  async save(secret: SecretRecord): Promise<SecretRecord> { return this.saveSecret(secret); }

  async deleteSecret(id: string): Promise<boolean> { return this.secrets.delete(id); }
  async delete(id: string): Promise<boolean> { return this.deleteSecret(id); }

  async getVersions(secretId: string): Promise<SecretVersionRecord[]> {
    return this.versions.filter((v) => v.secretId === secretId).sort((a, b) => b.version - a.version);
  }

  async addVersion(version: SecretVersionRecord): Promise<void> {
    this.versions.push(version);
  }

  async getLogs(secretId?: string): Promise<SecretAuditRecord[]> {
    const logs = secretId
      ? this.auditLogs.filter((l) => l.secretId === secretId)
      : [...this.auditLogs];
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async addLog(log: SecretAuditRecord): Promise<void> {
    this.auditLogs.unshift(log);
  }
}

export interface VersionRecord {
  version: string;
  updatedAt: string;
  changeLog: string;
}

export interface ReviewRecord {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface MarketplaceEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  downloads: number;
  rating: number;
  license: string;
  lastUpdated: string;
  previewImage: string;
  versions: VersionRecord[];
  reviews: ReviewRecord[];
  nodes: any[];
  connections: any[];
  isFavorite?: boolean;
}

export class InMemoryMarketplaceRepository {
  private entries = new Map<string, MarketplaceEntry>();

  async save(entry: MarketplaceEntry): Promise<MarketplaceEntry> {
    this.entries.set(entry.id, entry);
    return entry;
  }

  async findById(id: string): Promise<MarketplaceEntry | undefined> {
    return this.entries.get(id);
  }

  async findAll(): Promise<MarketplaceEntry[]> {
    return Array.from(this.entries.values());
  }

  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  tags: string[];
  estimatedRuntime: string;
  requiredIntegrations: string[];
  previewImage: string;
  version: string;
  author: string;
  downloads: number;
  rating: number;
  nodes: any[];
  connections: any[];
  isFavorite?: boolean;
}

export class InMemoryTemplateRepository {
  private templates = new Map<string, WorkflowTemplate>();

  async save(template: WorkflowTemplate): Promise<WorkflowTemplate> {
    this.templates.set(template.id, template);
    return template;
  }

  async findById(id: string): Promise<WorkflowTemplate | undefined> {
    return this.templates.get(id);
  }

  async findAll(): Promise<WorkflowTemplate[]> {
    return Array.from(this.templates.values());
  }

  async delete(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }
}

export interface IntegrationCredentialsRecord {
  providerId: string;
  status: "connected" | "disconnected";
  health: "healthy" | "degraded" | "failed";
  lastSync: string | null;
  encryptedSecrets: Record<string, string>;
  updatedAt: string;
}

export class InMemoryIntegrationRepository {
  private records = new Map<string, IntegrationCredentialsRecord>();

  async save(record: IntegrationCredentialsRecord): Promise<IntegrationCredentialsRecord> {
    this.records.set(record.providerId, record);
    return record;
  }

  async findByProvider(providerId: string): Promise<IntegrationCredentialsRecord | undefined> {
    return this.records.get(providerId);
  }

  async findById(providerId: string): Promise<IntegrationCredentialsRecord | undefined> {
    return this.findByProvider(providerId);
  }

  async findAll(): Promise<IntegrationCredentialsRecord[]> {
    return Array.from(this.records.values());
  }

  async delete(providerId: string): Promise<boolean> {
    return this.records.delete(providerId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API Token Repository
// ─────────────────────────────────────────────────────────────────────────────

export type ApiTokenScope =
  | "workflows:read" | "workflows:write"
  | "executions:read"
  | "secrets:read"
  | "integrations:read"
  | "templates:read"
  | "marketplace:read"
  | "billing:read"
  | "organizations:read"
  | "*";

export interface PublicApiTokenRecord {
  id: string;
  name: string;
  token: string; // sha256-prefixed opaque token
  scopes: ApiTokenScope[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revoked: boolean;
  usageCount: number;
  requestsToday: number;
  rateLimitPerMinute: number;
}

export interface ApiRequestLogRecord {
  id: string;
  tokenId: string;
  tokenName: string;
  method: string;
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  timestamp: string;
  ip: string;
}

export class InMemoryPublicApiTokenRepository {
  private tokens = new Map<string, PublicApiTokenRecord>();
  private logs: ApiRequestLogRecord[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    const now = Date.now();

    const t1: PublicApiTokenRecord = {
      id: "tok-1",
      name: "Production SDK",
      token: "ff_live_pk_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      scopes: ["*"],
      createdAt: new Date(now - 30 * 24 * 3600 * 1000).toISOString(),
      expiresAt: new Date(now + 335 * 24 * 3600 * 1000).toISOString(),
      lastUsedAt: new Date(now - 5 * 60 * 1000).toISOString(),
      revoked: false,
      usageCount: 4821,
      requestsToday: 142,
      rateLimitPerMinute: 120,
    };

    const t2: PublicApiTokenRecord = {
      id: "tok-2",
      name: "Analytics Read-Only",
      token: "ff_live_pk_b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5",
      scopes: ["workflows:read", "executions:read", "billing:read"],
      createdAt: new Date(now - 15 * 24 * 3600 * 1000).toISOString(),
      expiresAt: null,
      lastUsedAt: new Date(now - 2 * 3600 * 1000).toISOString(),
      revoked: false,
      usageCount: 987,
      requestsToday: 34,
      rateLimitPerMinute: 60,
    };

    const t3: PublicApiTokenRecord = {
      id: "tok-3",
      name: "CI/CD Deploy Token",
      token: "ff_live_pk_c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
      scopes: ["workflows:write", "executions:read"],
      createdAt: new Date(now - 60 * 24 * 3600 * 1000).toISOString(),
      expiresAt: new Date(now - 1 * 24 * 3600 * 1000).toISOString(), // expired
      lastUsedAt: new Date(now - 2 * 24 * 3600 * 1000).toISOString(),
      revoked: true,
      usageCount: 211,
      requestsToday: 0,
      rateLimitPerMinute: 30,
    };

    [t1, t2, t3].forEach((t) => this.tokens.set(t.id, t));

    // Seed request log
    const endpoints = ["/api/v1/workflows", "/api/v1/executions", "/api/v1/billing", "/api/v1/secrets", "/api/v1/integrations"];
    const statuses = [200, 200, 200, 200, 200, 201, 400, 401, 429];
    for (let i = 0; i < 40; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
      const isT1 = i % 3 !== 0;
      const tok = isT1 ? t1 : t2;
      this.logs.unshift({
        id: `log-${i + 1}`,
        tokenId: tok.id,
        tokenName: tok.name,
        method: ep.includes("billing") ? "GET" : ["GET", "GET", "GET", "POST"][i % 4],
        endpoint: ep,
        statusCode: status,
        latencyMs: 20 + Math.floor(Math.random() * 180),
        timestamp: new Date(now - (40 - i) * 8 * 60 * 1000).toISOString(),
        ip: "203.0.113." + ((i % 5) + 1),
      });
    }
  }

  async getAll(): Promise<PublicApiTokenRecord[]> { return Array.from(this.tokens.values()); }
  async findById(id: string): Promise<PublicApiTokenRecord | undefined> { return this.tokens.get(id); }
  async findByToken(token: string): Promise<PublicApiTokenRecord | undefined> {
    return Array.from(this.tokens.values()).find((t) => t.token === token);
  }
  async save(tok: PublicApiTokenRecord): Promise<PublicApiTokenRecord> { this.tokens.set(tok.id, tok); return tok; }
  async delete(id: string): Promise<boolean> { return this.tokens.delete(id); }
  async getLogs(tokenId?: string): Promise<ApiRequestLogRecord[]> {
    const logs = tokenId ? this.logs.filter((l) => l.tokenId === tokenId) : [...this.logs];
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  async addLog(log: ApiRequestLogRecord): Promise<void> { this.logs.unshift(log); }
}

const globalForForgeFlow = globalThis as unknown as {
  forgeFlowService: ForgeFlowService | undefined;
};

export const forgeFlowService =
  globalForForgeFlow.forgeFlowService ?? new ForgeFlowService();

if (process.env.NODE_ENV !== "production") {
  globalForForgeFlow.forgeFlowService = forgeFlowService;
}
