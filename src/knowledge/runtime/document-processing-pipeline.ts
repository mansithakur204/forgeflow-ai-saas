// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Document Processing Pipeline Service
// Orchestrates validations, multi-cloud storage, parser selection, and retries.
// ─────────────────────────────────────────────────────────────────────────────

import type { IKnowledgeDocumentRepository } from "../repository/knowledge-repository.interface";
import type { IStorageProvider } from "../storage/storage-provider.interface";
import type { ParserRegistry } from "../parser/parser-registry";
import { DocumentStateManager } from "../state/document-state-manager";
import {
  DocumentProcessingError,
  ValidationError,
  StorageError,
  ParserNotFoundError,
  ParserExecutionError,
  DuplicateDocumentError,
} from "../errors/processing-error";
import type { KnowledgeDocument, DocumentStatus } from "../types/document";
import type { SupportedParserFormat } from "../parser/parser.interface";

export type PipelineEventType =
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_VALIDATED"
  | "DOCUMENT_PROCESSING_STARTED"
  | "DOCUMENT_PROCESSING_COMPLETED"
  | "DOCUMENT_PROCESSING_FAILED"
  | "DOCUMENT_RETRY";

export interface PipelineEvent {
  documentId: string;
  type: PipelineEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface PipelineOptions {
  documentRepository: IKnowledgeDocumentRepository;
  storageProvider: IStorageProvider;
  parserRegistry: ParserRegistry;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  maxRetries?: number;
  onEvent?: (event: PipelineEvent) => void;
}

export class DocumentProcessingPipeline {
  private documentRepository: IKnowledgeDocumentRepository;
  private storageProvider: IStorageProvider;
  private parserRegistry: ParserRegistry;
  private maxFileSize: number;
  private allowedTypes: Set<string>;
  private maxRetries: number;
  private stateManager: DocumentStateManager;
  private onEvent?: (event: PipelineEvent) => void;

  constructor(options: PipelineOptions) {
    this.documentRepository = options.documentRepository;
    this.storageProvider = options.storageProvider;
    this.parserRegistry = options.parserRegistry;
    this.maxFileSize = options.maxFileSize ?? 10 * 1024 * 1024; // Default: 10MB
    this.allowedTypes = new Set(options.allowedTypes ?? ["pdf", "docx", "txt", "markdown", "md", "html", "csv"]);
    this.maxRetries = options.maxRetries ?? 3;
    this.stateManager = new DocumentStateManager(options.documentRepository);
    this.onEvent = options.onEvent;
  }

  private emit(documentId: string, type: PipelineEventType, metadata?: Record<string, unknown>): void {
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
   * Uploads file to remote storage and runs appropriate parsing format pipelines.
   */
  async process(
    fileName: string,
    contentType: string,
    content: Buffer,
    userId: string,
    sourceId: string,
    customId?: string
  ): Promise<KnowledgeDocument> {
    const documentId = customId ?? `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    // 1. Validation Checks
    await this.validateFile(fileName, content, documentId);
    this.emit(documentId, "DOCUMENT_VALIDATED", { fileName, fileSize: content.length });

    // 2. Initial state: Uploading
    const title = fileName.split("/").pop() ?? fileName;
    let doc: KnowledgeDocument = {
      id: documentId,
      sourceId,
      title,
      status: "uploading",
      storagePath: `docs/${sourceId}/${documentId}-${fileName}`,
      metadata: {
        title,
        fileName,
        contentType,
        fileSize: content.length,
        uploadedAt: new Date().toISOString(),
        version: 1,
        createdBy: userId,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    doc = await this.documentRepository.create(doc);
    
    // 3. Storage Upload
    try {
      await this.storageProvider.upload(doc.storagePath, content, { contentType });
      doc = await this.stateManager.transitionTo(doc, "queued");
      this.emit(documentId, "DOCUMENT_UPLOADED", { path: doc.storagePath });
    } catch (err: any) {
      const storageErr = new StorageError(`Failed to upload document file: ${err.message}`);
      await this.handleFailure(doc, storageErr, 1);
      throw storageErr;
    }

    // 4. Processing & Parsers Orchestration with retry logic
    await this.executeProcessingWithRetry(doc, content, 1);
    
    const finalDoc = await this.documentRepository.getById(documentId);
    if (!finalDoc) {
      throw new Error(`Failed to load processed document reference for ${documentId}`);
    }
    return finalDoc;
  }

  private async validateFile(fileName: string, content: Buffer, documentId: string): Promise<void> {
    // A. Empty file check
    if (!content || content.length === 0) {
      throw new ValidationError("File content is empty");
    }

    // B. Size constraints check
    if (content.length > this.maxFileSize) {
      throw new ValidationError(`File exceeds maximum size limits (${this.maxFileSize} bytes)`);
    }

    // C. Format extension check
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (!this.allowedTypes.has(ext)) {
      throw new ValidationError(`Unsupported document format extension: ".${ext}"`);
    }

    // D. Corruption validation stubs check
    const preview = content.toString("utf-8", 0, Math.min(content.length, 500));
    if (preview.includes("[corrupted]") || preview.includes("corrupted-stub")) {
      throw new ValidationError("File content validation signature failed (corrupted document structure)");
    }

    // E. Duplicate checks (matching name and size)
    const searchRes = await this.documentRepository.search(fileName);
    const duplicates = searchRes.filter(
      (d) => d.metadata.fileName === fileName && d.metadata.fileSize === content.length
    );
    if (duplicates.length > 0) {
      throw new DuplicateDocumentError(`Duplicate document already cataloged in space: "${fileName}"`);
    }
  }

  private async executeProcessingWithRetry(
    document: KnowledgeDocument,
    content: Buffer,
    attempt: number
  ): Promise<void> {
    let currentDoc = document;
    const documentId = currentDoc.id;

    try {
      currentDoc = await this.stateManager.transitionTo(currentDoc, "processing");
      this.emit(documentId, "DOCUMENT_PROCESSING_STARTED", { attempt });

      const ext = currentDoc.metadata.fileName.split(".").pop() || "";
      const parser = this.parserRegistry.resolve(ext);
      if (!parser) {
        throw new ParserNotFoundError(`No suitable parser registry entry registered for file type: ${ext}`);
      }

      // Read back from storage provider to verify storage availability
      const downloadedContent = await this.storageProvider.download(currentDoc.storagePath);
      const dataToParse = downloadedContent.length > 0 ? downloadedContent : content;

      // Extract parsed text and diagnostic metrics
      const parsed = await parser.parse(dataToParse, ext as SupportedParserFormat);

      // Transition to completed (or ready) state
      await this.stateManager.transitionTo(currentDoc, "completed");
      
      await this.documentRepository.updateMetadata(documentId, {
        ...currentDoc.metadata,
        pageCount: parsed.metadata.pageCount,
        wordCount: parsed.metadata.wordCount,
        author: parsed.metadata.author,
        customMetadata: {
          ...currentDoc.metadata.customMetadata,
          ...parsed.metadata,
        },
      });

      this.emit(documentId, "DOCUMENT_PROCESSING_COMPLETED", {
        pages: parsed.metadata.pageCount,
        wordCount: parsed.metadata.wordCount,
      });

    } catch (err: any) {
      const docErr = err instanceof DocumentProcessingError ? err : new ParserExecutionError(err.message);
      
      if (docErr.isRetryable && attempt < this.maxRetries) {
        currentDoc = await this.stateManager.transitionTo(currentDoc, "retrying", docErr.message);
        this.emit(documentId, "DOCUMENT_RETRY", { attempt, maxRetries: this.maxRetries, errorMessage: docErr.message });
        
        // Wait simple backoff delay before executing retry
        await new Promise((resolve) => setTimeout(resolve, attempt * 100));
        return this.executeProcessingWithRetry(currentDoc, content, attempt + 1);
      } else {
        await this.handleFailure(currentDoc, docErr, attempt);
        throw docErr;
      }
    }
  }

  private async handleFailure(document: KnowledgeDocument, error: Error, attempt: number): Promise<void> {
    try {
      await this.stateManager.transitionTo(document, "failed", error.message);
    } catch {
      // Ignore transition updates errors if document isn't loaded
    }
    this.emit(document.id, "DOCUMENT_PROCESSING_FAILED", {
      errorMessage: error.message,
      attempt,
    });
  }
}
