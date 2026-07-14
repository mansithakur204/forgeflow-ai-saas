// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Storage Provider Factory
// Instantiates pluggable storage engine architectures dynamically.
// ─────────────────────────────────────────────────────────────────────────────

import type { IStorageProvider } from "./storage-provider.interface";
import { LocalStorageProvider } from "./local-storage";
import { AzureBlobStorageProvider } from "./azure-storage";
import { AWSS3StorageProvider } from "./s3-storage";

export type StorageProviderType = "local" | "s3" | "azure";

export class StorageProviderFactory {
  static create(type: StorageProviderType): IStorageProvider {
    switch (type) {
      case "azure":
        return new AzureBlobStorageProvider();
      case "s3":
        return new AWSS3StorageProvider();
      case "local":
      default:
        return new LocalStorageProvider();
    }
  }
}
