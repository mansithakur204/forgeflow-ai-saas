// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Vector Store Interface & Types
// ─────────────────────────────────────────────────────────────────────────────

export interface VectorRecord {
  id: string;
  documentId: string;
  vector: number[];
  content: string;
  metadata: Record<string, unknown>;
  namespace?: string;
  collection?: string;
}

export interface VectorStoreStats {
  totalRecords: number;
  namespacesCount: number;
  collectionsCount: number;
  dimension: number;
}

export type SimilarityMetric = "cosine" | "dot-product" | "euclidean";

export interface VectorStoreCapabilities {
  supportedMetrics: SimilarityMetric[];
  supportsBatching: boolean;
  supportsNamespaces: boolean;
  supportsFiltering: boolean;
}

export interface VectorSearchOptions {
  vector?: number[];
  text?: string;
  namespace?: string;
  collection?: string;
  limit?: number;
  offset?: number;
  minScore?: number;
  metric?: SimilarityMetric;
  metadataFilter?: Record<string, unknown>;
}

export interface VectorSearchResult {
  record: VectorRecord;
  score: number; // Normalized score in [0, 1]
  distance?: number;
}

export interface IVectorStore {
  /**
   * Returns capabilities of this vector store provider.
   */
  getCapabilities(): VectorStoreCapabilities;

  /**
   * Inserts a record. Validates vector dimension.
   */
  insert(record: VectorRecord): Promise<void>;

  /**
   * Updates an existing record.
   */
  update(record: VectorRecord): Promise<void>;

  /**
   * Removes a record by ID.
   */
  delete(id: string): Promise<void>;

  /**
   * Searches the store for records matching query filters and scores them.
   */
  search(options: VectorSearchOptions): Promise<VectorSearchResult[]>;

  /**
   * Context-bound search limited to a specific namespace scope.
   */
  searchByNamespace(namespace: string, options: VectorSearchOptions): Promise<VectorSearchResult[]>;

  /**
   * Context-bound search limited to a specific collection scope.
   */
  searchByCollection(collection: string, options: VectorSearchOptions): Promise<VectorSearchResult[]>;

  /**
   * Checks if record with given ID is present.
   */
  exists(id: string): Promise<boolean>;

  /**
   * Deletes all records.
   */
  clear(): Promise<void>;

  /**
   * Returns current statistics (counts, dimensions).
   */
  statistics(): Promise<VectorStoreStats>;
}
