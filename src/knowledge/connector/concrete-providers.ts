import { BaseSourceProvider } from "./base-source-provider";
import type { SourceProviderMetadata, SourceItem } from "./source-provider.interface";

// Helper to simulate items list for testing
function simulateSourceItems(
  type: string,
  config: Record<string, unknown>,
  lastSyncTime?: string
): SourceItem[] {
  const items: SourceItem[] = [
    {
      externalId: "item-1",
      title: `${type} Introduction Document.txt`,
      content: Buffer.from(`Introductory documentation content for provider ${type}`),
      mimeType: "text/plain",
      metadata: { author: "system", syncType: "full" },
      updatedAt: "2026-07-01T12:00:00Z",
    },
    {
      externalId: "item-2",
      title: `${type} Advanced Guide.txt`,
      content: Buffer.from(`Advanced developer guidelines context details for provider ${type}`),
      mimeType: "text/plain",
      metadata: { author: "editor", syncType: "full" },
      updatedAt: "2026-07-10T15:30:00Z",
    },
  ];

  if (lastSyncTime) {
    const lastTime = new Date(lastSyncTime).getTime();
    return items.filter((item) => new Date(item.updatedAt).getTime() > lastTime);
  }

  return items;
}

export class LocalFileProvider extends BaseSourceProvider {
  protected readonly metadata: SourceProviderMetadata = {
    id: "local-file-provider",
    name: "Local File Storage Connector",
    supportedTypes: ["local"],
  };

  async fetchItems(
    config: Record<string, unknown>,
    lastSyncTime?: string
  ): Promise<SourceItem[]> {
    return simulateSourceItems("Local", config, lastSyncTime);
  }
}

export class GitHubProvider extends BaseSourceProvider {
  protected readonly metadata: SourceProviderMetadata = {
    id: "github-provider",
    name: "GitHub Repository Connector",
    supportedTypes: ["github"],
  };

  async fetchItems(
    config: Record<string, unknown>,
    lastSyncTime?: string
  ): Promise<SourceItem[]> {
    return simulateSourceItems("GitHub", config, lastSyncTime);
  }
}

export class GoogleDriveProvider extends BaseSourceProvider {
  protected readonly metadata: SourceProviderMetadata = {
    id: "google-drive-provider",
    name: "Google Drive Storage Connector",
    supportedTypes: ["google_drive"],
  };

  async fetchItems(
    config: Record<string, unknown>,
    lastSyncTime?: string
  ): Promise<SourceItem[]> {
    return simulateSourceItems("GoogleDrive", config, lastSyncTime);
  }
}

export class NotionProvider extends BaseSourceProvider {
  protected readonly metadata: SourceProviderMetadata = {
    id: "notion-provider",
    name: "Notion Workspace Connector",
    supportedTypes: ["notion"],
  };

  async fetchItems(
    config: Record<string, unknown>,
    lastSyncTime?: string
  ): Promise<SourceItem[]> {
    return simulateSourceItems("Notion", config, lastSyncTime);
  }
}

export class ConfluenceProvider extends BaseSourceProvider {
  protected readonly metadata: SourceProviderMetadata = {
    id: "confluence-provider",
    name: "Confluence Space Connector",
    supportedTypes: ["confluence"],
  };

  async fetchItems(
    config: Record<string, unknown>,
    lastSyncTime?: string
  ): Promise<SourceItem[]> {
    return simulateSourceItems("Confluence", config, lastSyncTime);
  }
}

export class SharePointProvider extends BaseSourceProvider {
  protected readonly metadata: SourceProviderMetadata = {
    id: "sharepoint-provider",
    name: "SharePoint Site Connector",
    supportedTypes: ["sharepoint"],
  };

  async fetchItems(
    config: Record<string, unknown>,
    lastSyncTime?: string
  ): Promise<SourceItem[]> {
    return simulateSourceItems("SharePoint", config, lastSyncTime);
  }
}

export class OneDriveProvider extends BaseSourceProvider {
  protected readonly metadata: SourceProviderMetadata = {
    id: "onedrive-provider",
    name: "OneDrive Storage Connector",
    supportedTypes: ["onedrive"],
  };

  async fetchItems(
    config: Record<string, unknown>,
    lastSyncTime?: string
  ): Promise<SourceItem[]> {
    return simulateSourceItems("OneDrive", config, lastSyncTime);
  }
}

export class DropboxProvider extends BaseSourceProvider {
  protected readonly metadata: SourceProviderMetadata = {
    id: "dropbox-provider",
    name: "Dropbox Storage Connector",
    supportedTypes: ["dropbox"],
  };

  async fetchItems(
    config: Record<string, unknown>,
    lastSyncTime?: string
  ): Promise<SourceItem[]> {
    return simulateSourceItems("Dropbox", config, lastSyncTime);
  }
}
