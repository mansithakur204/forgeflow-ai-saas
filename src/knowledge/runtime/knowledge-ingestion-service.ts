import type { KnowledgeDocument, Chunk } from "../types/document";
import type { IStorageProvider } from "../storage/storage-provider.interface";
import type { ParserRegistry } from "../parser/parser-registry";
import type { ChunkerRegistry } from "../chunker/chunker-registry";
import type { IEmbeddingProvider } from "../embedding/embedding-provider.interface";
import type { IVectorStore } from "../vector-store/vector-store.interface";
import type {
  IKnowledgeDocumentRepository,
  IChunkRepository,
} from "../repository/knowledge-repository.interface";
import { DocumentStateManager } from "../state/document-state-manager";
import { DocumentVersioning } from "../state/document-versioning";
import { ProcessingQueue } from "../queue/processing-queue";
import type { ChunkingOptions, SupportedParserFormat } from "../chunker/chunker.interface";
import type { IngestionJob, IngestionStats } from "../types/ingestion";
import {
  ParserNotFoundError,
  ParserExecutionError,
  ChunkerNotFoundError,
  ChunkerExecutionError,
} from "../errors/processing-error";

export interface IngestionServiceOptions {
  documentRepository: IKnowledgeDocumentRepository;
  chunkRepository: IChunkRepository;
  storageProvider: IStorageProvider;
  parserRegistry: ParserRegistry;
  chunkerRegistry: ChunkerRegistry;
  embeddingProvider: IEmbeddingProvider;
  vectorStore: IVectorStore;
  maxConcurrency?: number;
}

export class KnowledgeIngestionService {
  private docRepository: IKnowledgeDocumentRepository;
  private chunkRepository: IChunkRepository;
  private storageProvider: IStorageProvider;
  private parserRegistry: ParserRegistry;
  private chunkerRegistry: ChunkerRegistry;
  private embeddingProvider: IEmbeddingProvider;
  private vectorStore: IVectorStore;

  private stateManager: DocumentStateManager;
  private versioning: DocumentVersioning;
  private queue: ProcessingQueue;

  constructor(options: IngestionServiceOptions) {
    this.docRepository = options.documentRepository;
    this.chunkRepository = options.chunkRepository;
    this.storageProvider = options.storageProvider;
    this.parserRegistry = options.parserRegistry;
    this.chunkerRegistry = options.chunkerRegistry;
    this.embeddingProvider = options.embeddingProvider;
    this.vectorStore = options.vectorStore;

    this.stateManager = new DocumentStateManager(options.documentRepository);
    this.versioning = new DocumentVersioning();
    this.queue = new ProcessingQueue(
      (job, signal) => this.runIngestionJob(job, signal),
      options.maxConcurrency ?? 2
    );
  }

  /**
   * Schedules a new document ingestion task run.
   */
  ingest(document: KnowledgeDocument, maxRetries = 3): IngestionJob {
    return this.queue.addJob(document.id, maxRetries);
  }

  /**
   * Aborts execution of a document ingestion task run.
   */
  cancel(jobId: string): void {
    this.queue.cancelJob(jobId);
  }

  /**
   * Re-indexes an existing document, incrementing the version in custom metadata.
   */
  async reindex(document: KnowledgeDocument, maxRetries = 3): Promise<IngestionJob> {
    const updatedDoc = this.versioning.nextVersion(document);
    await this.docRepository.updateMetadata(updatedDoc.id, updatedDoc.metadata);
    return this.ingest(updatedDoc, maxRetries);
  }

  /**
   * Deletes a document completely from repositories, vector stores, and files storage.
   */
  async deleteDocument(documentId: string): Promise<void> {
    const doc = await this.docRepository.getById(documentId);
    if (!doc) return;

    // Remove DB Chunk records
    await this.chunkRepository.deleteByDocumentId(documentId);

    // Remove Vector Store index records
    const searchResults = await this.vectorStore.search({ limit: 10000 });
    for (const res of searchResults) {
      if (res.record.documentId === documentId) {
        await this.vectorStore.delete(res.record.id);
      }
    }

    // Remove Storage file payload
    try {
      const exists = await this.storageProvider.exists(doc.storagePath);
      if (exists) {
        await this.storageProvider.delete(doc.storagePath);
      }
    } catch {
      // Ignored: storage file might already be removed
    }

    // Remove Document metadata record
    await this.docRepository.delete(documentId);
  }

  /**
   * Returns current service queue statistics.
   */
  getStatistics(): IngestionStats {
    return this.queue.getStatistics();
  }

  private async runIngestionJob(job: IngestionJob, signal: AbortSignal): Promise<void> {
    const startTime = Date.now();
    let doc = await this.docRepository.getById(job.documentId);
    if (!doc) {
      throw new Error(`Document with ID "${job.documentId}" not found`);
    }

    if (signal.aborted) throw new Error("Job aborted");

    try {
      doc = await this.stateManager.transitionTo(doc, "queued");

      // 1. Resolve parser
      const fileExt = doc.metadata.fileName.split(".").pop() || "";
      const parser = this.parserRegistry.resolve(fileExt);
      if (!parser) {
        throw new ParserNotFoundError(`No registered parser found for file format: ${fileExt}`);
      }

      // 2. Download and parse
      doc = await this.stateManager.transitionTo(doc, "parsing");
      if (signal.aborted) throw new Error("Job aborted");

      const fileBuffer = await this.storageProvider.download(doc.storagePath);
      if (signal.aborted) throw new Error("Job aborted");

      let parsedText: string;
      let parsedMetadata: Record<string, unknown> = {};
      try {
        const parsed = await parser.parse(fileBuffer, fileExt as SupportedParserFormat);
        parsedText = parsed.content;
        parsedMetadata = parsed.metadata as Record<string, unknown>;
      } catch (err: any) {
        throw new ParserExecutionError(`Failed document parsing step: ${err.message}`);
      }

      doc = await this.stateManager.transitionTo(doc, "parsed");
      doc = await this.docRepository.updateMetadata(doc.id, {
        ...doc.metadata,
        customMetadata: {
          ...doc.metadata.customMetadata,
          ...parsedMetadata,
        },
      });

      if (signal.aborted) throw new Error("Job aborted");

      // 3. Split to chunks
      const chunkingOptions: ChunkingOptions = {
        strategy: "recursive",
        chunkSize: 500,
        chunkOverlap: 50,
      };

      const chunker = this.chunkerRegistry.resolve(chunkingOptions.strategy);
      if (!chunker) {
        throw new ChunkerNotFoundError(
          `No registered chunker strategy found: ${chunkingOptions.strategy}`
        );
      }

      doc = await this.stateManager.transitionTo(doc, "chunking");
      if (signal.aborted) throw new Error("Job aborted");

      let chunksInput: Omit<Chunk, "id" | "createdAt">[];
      try {
        chunksInput = await chunker.split(parsedText, doc.id, chunkingOptions);
      } catch (err: any) {
        throw new ChunkerExecutionError(`Failed document chunking step: ${err.message}`);
      }

      doc = await this.stateManager.transitionTo(doc, "chunked");
      const savedChunks = await this.chunkRepository.createMany(chunksInput);

      if (signal.aborted) throw new Error("Job aborted");

      // 4. Generate batch embeddings
      doc = await this.stateManager.transitionTo(doc, "embedding");
      const texts = savedChunks.map((c) => c.content);
      const vectors = await this.embeddingProvider.embedBatch(texts);

      if (signal.aborted) throw new Error("Job aborted");

      // 5. Index vectors to store
      doc = await this.stateManager.transitionTo(doc, "indexed");
      const docVersion = this.versioning.getVersion(doc);

      // Clean up previous version vectors if re-indexing
      if (docVersion > 1) {
        const existingVectors = await this.vectorStore.search({ limit: 10000 });
        for (const res of existingVectors) {
          if (res.record.documentId === doc.id) {
            await this.vectorStore.delete(res.record.id);
          }
        }
      }

      // Load new vectors
      for (let i = 0; i < savedChunks.length; i++) {
        if (signal.aborted) throw new Error("Job aborted");

        await this.vectorStore.insert({
          id: `vec-${savedChunks[i].id}`,
          documentId: doc.id,
          vector: vectors[i],
          content: savedChunks[i].content,
          metadata: {
            chunkIndex: savedChunks[i].index,
            documentVersion: docVersion,
          },
        });
      }

      await this.stateManager.transitionTo(doc, "ready");

      const durationMs = Date.now() - startTime;
      this.queue.recordMetrics(savedChunks.length, savedChunks.length, durationMs);
    } catch (err: any) {
      await this.stateManager.transitionTo(doc, "failed", err.message);
      throw err;
    }
  }
}
