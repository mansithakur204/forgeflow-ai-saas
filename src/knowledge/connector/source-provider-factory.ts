import {
  LocalFileProvider,
  GitHubProvider,
  GoogleDriveProvider,
  NotionProvider,
  ConfluenceProvider,
  SharePointProvider,
  OneDriveProvider,
  DropboxProvider,
} from "./concrete-providers";
import { SourceProviderRegistry } from "./source-provider-registry";
import type { IKnowledgeSourceProvider } from "./source-provider.interface";

export class SourceProviderFactory {
  /**
   * Resolves and returns a new provider instance matching the type key.
   */
  static create(type: string): IKnowledgeSourceProvider {
    const normalized = type.toLowerCase().trim();
    switch (normalized) {
      case "local":
        return new LocalFileProvider();
      case "github":
        return new GitHubProvider();
      case "google_drive":
      case "googledrive":
        return new GoogleDriveProvider();
      case "notion":
        return new NotionProvider();
      case "confluence":
        return new ConfluenceProvider();
      case "sharepoint":
        return new SharePointProvider();
      case "onedrive":
        return new OneDriveProvider();
      case "dropbox":
        return new DropboxProvider();
      default:
        throw new Error(`Unsupported source provider type requested: "${type}"`);
    }
  }

  /**
   * Generates a pre-registered Default Source Provider Registry.
   */
  static createDefaultRegistry(): SourceProviderRegistry {
    const registry = new SourceProviderRegistry();
    registry.register("local", new LocalFileProvider());
    registry.register("github", new GitHubProvider());
    registry.register("google_drive", new GoogleDriveProvider());
    registry.register("notion", new NotionProvider());
    registry.register("confluence", new ConfluenceProvider());
    registry.register("sharepoint", new SharePointProvider());
    registry.register("onedrive", new OneDriveProvider());
    registry.register("dropbox", new DropboxProvider());
    return registry;
  }
}
