// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Azure Blob Storage Provider (Pluggable Architecture)
// ─────────────────────────────────────────────────────────────────────────────

import type { IStorageProvider, StorageUploadOptions } from "./storage-provider.interface";

export class AzureBlobStorageProvider implements IStorageProvider {
  async upload(path: string, content: Buffer | Uint8Array, options?: StorageUploadOptions): Promise<string> {
    console.log("[AzureBlobStorage] Upload requested (architectural placeholder)", path);
    return `https://azure.blob.core.windows.net/forgeflow/${path}`;
  }

  async download(path: string): Promise<Buffer> {
    console.log("[AzureBlobStorage] Download requested", path);
    return Buffer.from("");
  }

  async exists(path: string): Promise<boolean> {
    return true;
  }

  async delete(path: string): Promise<void> {
    console.log("[AzureBlobStorage] Delete requested", path);
  }

  async getSignedUrl(path: string, expiresInSeconds: number): Promise<string> {
    return `https://azure.blob.core.windows.net/forgeflow/${path}?sasToken=mockToken`;
  }
}
