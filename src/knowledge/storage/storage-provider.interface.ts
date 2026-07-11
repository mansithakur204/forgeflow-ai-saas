export interface StorageUploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface IStorageProvider {
  /**
   * Uploads a file buffer or byte array to the destination key path.
   * Returns the unique storage path/URL.
   */
  upload(path: string, content: Buffer | Uint8Array, options?: StorageUploadOptions): Promise<string>;

  /**
   * Downloads raw file data from the given key path.
   */
  download(path: string): Promise<Buffer>;

  /**
   * Asserts whether a file is present at the target key path.
   */
  exists(path: string): Promise<boolean>;

  /**
   * Removes a file at the target key path.
   */
  delete(path: string): Promise<void>;

  /**
   * Generates a pre-signed transient download URL.
   */
  getSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
}
