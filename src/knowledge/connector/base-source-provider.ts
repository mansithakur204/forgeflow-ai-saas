import type {
  IKnowledgeSourceProvider,
  SourceProviderMetadata,
  SourceItem,
} from "./source-provider.interface";

export abstract class BaseSourceProvider implements IKnowledgeSourceProvider {
  protected abstract readonly metadata: SourceProviderMetadata;

  getMetadata(): SourceProviderMetadata {
    return this.metadata;
  }

  abstract fetchItems(config: Record<string, unknown>, lastSyncTime?: string): Promise<SourceItem[]>;
}
