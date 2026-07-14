// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Local File System Storage Provider
// ─────────────────────────────────────────────────────────────────────────────

import type { IStorageProvider, StorageUploadOptions } from "./storage-provider.interface";

export class LocalStorageProvider implements IStorageProvider {
  private storage = new Map<string, Buffer>();

  async upload(path: string, content: Buffer | Uint8Array, options?: StorageUploadOptions): Promise<string> {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    this.storage.set(path, buffer);
    return `local://${path}`;
  }

  async download(path: string): Promise<Buffer> {
    const buffer = this.storage.get(path);
    if (!buffer) {
      throw new Error(`File not found in local storage: ${path}`);
    }
    return buffer;
  }

  async exists(path: string): Promise<boolean> {
    return this.storage.has(path);
  }

  async delete(path: string): Promise<void> {
    this.storage.delete(path);
  }

  async getSignedUrl(path: string, expiresInSeconds: number): Promise<string> {
    return `local://${path}?expires=${Date.now() + expiresInSeconds * 1000}`;
  }
}
