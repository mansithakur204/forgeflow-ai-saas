import type { KnowledgeSource } from "../types/document";
import type { SyncJob } from "../types/connector";
import type { SourceProviderRegistry } from "./source-provider-registry";
import type { KnowledgeIngestionService } from "../runtime/knowledge-ingestion-service";
import type { IKnowledgeDocumentRepository } from "../repository/knowledge-repository.interface";
import type { IStorageProvider } from "../storage/storage-provider.interface";

export class SyncManager {
  private providerRegistry: SourceProviderRegistry;
  private ingestionService: KnowledgeIngestionService;
  private documentRepository: IKnowledgeDocumentRepository;
  private storageProvider: IStorageProvider;

  constructor(
    providerRegistry: SourceProviderRegistry,
    ingestionService: KnowledgeIngestionService,
    documentRepository: IKnowledgeDocumentRepository,
    storageProvider: IStorageProvider
  ) {
    this.providerRegistry = providerRegistry;
    this.ingestionService = ingestionService;
    this.documentRepository = documentRepository;
    this.storageProvider = storageProvider;
  }

  /**
   * Syncs items from external repositories to local database indexes.
   * Compares external timestamps to support incremental synchronization.
   */
  async sync(source: KnowledgeSource, lastSyncTime?: string): Promise<SyncJob> {
    const provider = this.providerRegistry.resolve(source.type);
    if (!provider) {
      throw new Error(`No registered source provider found for type: "${source.type}"`);
    }

    const job: SyncJob = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sourceId: source.id,
      status: "running",
      lastSyncTime,
      docsAdded: 0,
      docsUpdated: 0,
      docsDeleted: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Fetch modified items list from source provider
      const items = await provider.fetchItems(source.config, lastSyncTime);

      for (const item of items) {
        const storagePath = `sources/${source.id}/${item.externalId}`;

        // 2. Upload content payload to storage provider
        await this.storageProvider.upload(storagePath, item.content, {
          contentType: item.mimeType,
        });

        // 3. Resolve if document already exists
        const existingDocs = await this.documentRepository.getBySourceId(source.id);
        const existingDoc = existingDocs.find(
          (d) => d.metadata.customMetadata?.externalId === item.externalId
        );

        if (existingDoc) {
          // Check modification timestamps
          const previousUpdate = existingDoc.metadata.customMetadata?.externalUpdatedAt;
          if (previousUpdate === item.updatedAt) {
            continue; // Skip indexing if files modified timestamps match
          }

          // Trigger incremental re-indexing version update
          await this.ingestionService.reindex({
            ...existingDoc,
            storagePath,
            metadata: {
              ...existingDoc.metadata,
              fileName: item.title,
              fileSize: item.content.length,
              mimeType: item.mimeType,
              updatedAt: new Date().toISOString(),
              customMetadata: {
                ...existingDoc.metadata.customMetadata,
                externalUpdatedAt: item.updatedAt,
              },
            },
          });
          job.docsUpdated++;
        } else {
          // Trigger new document ingestion
          const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const newDoc = await this.documentRepository.create({
            id: docId,
            sourceId: source.id,
            title: item.title,
            status: "uploaded",
            storagePath,
            metadata: {
              fileName: item.title,
              fileSize: item.content.length,
              mimeType: item.mimeType,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              customMetadata: {
                externalId: item.externalId,
                externalUpdatedAt: item.updatedAt,
                version: 1,
              },
            },
          });
          await this.ingestionService.ingest(newDoc);
          job.docsAdded++;
        }
      }

      job.status = "completed";
      job.completedAt = new Date().toISOString();
    } catch (err: any) {
      job.status = "failed";
      job.errorMessage = err.message;
      job.completedAt = new Date().toISOString();
    }

    return job;
  }
}
