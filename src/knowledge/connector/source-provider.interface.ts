import type { SourceItem } from "../types/connector";

export interface SourceProviderMetadata {
  id: string;
  name: string;
  supportedTypes: string[];
}

export interface IKnowledgeSourceProvider {
  /**
   * Returns connector metadata descriptors.
   */
  getMetadata(): SourceProviderMetadata;

  /**
   * Fetches document items from external repositories. Supports incremental synchronization filtering using lastSyncTime.
   */
  fetchItems(config: Record<string, unknown>, lastSyncTime?: string): Promise<SourceItem[]>;
}
