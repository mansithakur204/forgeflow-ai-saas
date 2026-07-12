import type { KnowledgeDocument, Chunk } from "../types/document";
import type { IStorageProvider } from "../storage/storage-provider.interface";
import type { ParserRegistry } from "../parser/parser-registry";
import type { ChunkerRegistry } from "../chunker/chunker-registry";
import { DocumentStateManager } from "../state/document-state-manager";
import type { IChunkRepository, IKnowledgeDocumentRepository } from "../repository/knowledge-repository.interface";
import type { ChunkingOptions } from "../chunker/chunker.interface";
import type { SupportedParserFormat } from "../parser/parser.interface";
import {
  ParserNotFoundError,
  ParserExecutionError,
  ChunkerNotFoundError,
  ChunkerExecutionError,
} from "../errors/processing-error";
import type { ProcessingEvent, ProcessingEventType } from "../types/processing";

export interface CoordinatorOptions {
  documentRepository: IKnowledgeDocumentRepository;
  chunkRepository: IChunkRepository;
  storageProvider: IStorageProvider;
  parserRegistry: ParserRegistry;
  chunkerRegistry: ChunkerRegistry;
  onEvent?: (event: ProcessingEvent) => void;
}

export class ProcessingCoordinator {
  private docRepository: IKnowledgeDocumentRepository;
  private chunkRepository: IChunkRepository;
  private storageProvider: IStorageProvider;
  private parserRegistry: ParserRegistry;
  private chunkerRegistry: ChunkerRegistry;
  private stateManager: DocumentStateManager;
  private onEvent?: (event: ProcessingEvent) => void;

  constructor(options: CoordinatorOptions) {
    this.docRepository = options.documentRepository;
    this.chunkRepository = options.chunkRepository;
    this.storageProvider = options.storageProvider;
    this.parserRegistry = options.parserRegistry;
    this.chunkerRegistry = options.chunkerRegistry;
    this.stateManager = new DocumentStateManager(options.documentRepository);
    this.onEvent = options.onEvent;
  }

  private emit(documentId: string, type: ProcessingEventType, metadata?: Record<string, unknown>) {
    if (this.onEvent) {
      this.onEvent({
        documentId,
        type,
        timestamp: new Date().toISOString(),
        metadata,
      });
    }
  }

  /**
   * Triggers the full parsing and chunking pipeline sequence for a target document snapshot.
   */
  async processDocument(
    document: KnowledgeDocument,
    chunkingOptions: ChunkingOptions
  ): Promise<void> {
    const startTime = Date.now();
    let currentDoc = document;
    this.emit(document.id, "started");

    try {
      // 1. Move to queued status
      currentDoc = await this.stateManager.transitionTo(currentDoc, "queued");
      this.emit(document.id, "queued");

      // 2. Resolve parser from file extension format
      const fileExt = currentDoc.metadata.fileName.split(".").pop() || "";
      const parser = this.parserRegistry.resolve(fileExt);
      if (!parser) {
        throw new ParserNotFoundError(`No registered parser found for format: ${fileExt}`);
      }

      // 3. Move to parsing status
      currentDoc = await this.stateManager.transitionTo(currentDoc, "parsing");
      this.emit(document.id, "parsing_started");

      // 4. Download file contents
      const fileBuffer = await this.storageProvider.download(currentDoc.storagePath);

      // 5. Run parser
      let parsedText: string;
      let parsedMetadata: Record<string, unknown> = {};
      try {
        const parsed = await parser.parse(fileBuffer, fileExt as SupportedParserFormat);
        parsedText = parsed.content;
        parsedMetadata = parsed.metadata as Record<string, unknown>;
      } catch (err: any) {
        throw new ParserExecutionError(`Failed during document parsing step: ${err.message}`);
      }

      // 6. Transition status and merge metadata changes
      currentDoc = await this.stateManager.transitionTo(currentDoc, "parsed");
      currentDoc = await this.docRepository.updateMetadata(currentDoc.id, {
        ...currentDoc.metadata,
        customMetadata: {
          ...currentDoc.metadata.customMetadata,
          ...parsedMetadata,
        },
      });
      this.emit(document.id, "parsing_completed");

      // 7. Resolve chunker strategy splits
      const chunker = this.chunkerRegistry.resolve(chunkingOptions.strategy);
      if (!chunker) {
        throw new ChunkerNotFoundError(
          `No registered chunker strategy found: ${chunkingOptions.strategy}`
        );
      }

      // 8. Move to chunking status
      currentDoc = await this.stateManager.transitionTo(currentDoc, "chunking");
      this.emit(document.id, "chunking_started");

      // 9. Generate splits
      let chunksInput: Omit<Chunk, "id" | "createdAt">[];
      try {
        chunksInput = await chunker.split(parsedText, currentDoc.id, chunkingOptions);
      } catch (err: any) {
        throw new ChunkerExecutionError(`Failed during document chunking step: ${err.message}`);
      }

      // 10. Move to chunked status
      currentDoc = await this.stateManager.transitionTo(currentDoc, "chunked");
      this.emit(document.id, "chunking_completed");

      // 11. Bulk insert segments
      await this.chunkRepository.createMany(chunksInput);

      // 12. Move to ready (ready for future embeddings / indexed searches)
      currentDoc = await this.stateManager.transitionTo(currentDoc, "ready");
      this.emit(document.id, "completed", {
        durationMs: Date.now() - startTime,
        chunksCount: chunksInput.length,
      });
    } catch (err: any) {
      // Transition to failed status and record error metrics
      await this.stateManager.transitionTo(currentDoc, "failed", err.message);
      this.emit(document.id, "failed", { errorMessage: err.message });
      throw err;
    }
  }
}
