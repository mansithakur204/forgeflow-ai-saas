import type { KnowledgeDocument } from "../types/document";

export class DocumentVersioning {
  /**
   * Generates a new metadata layout copy incrementing the document custom version field.
   */
  nextVersion(document: KnowledgeDocument): KnowledgeDocument {
    const custom = document.metadata.customMetadata || {};
    const currentVersion = typeof custom.version === "number" ? custom.version : 0;
    const nextVersion = currentVersion + 1;

    return {
      ...document,
      metadata: {
        ...document.metadata,
        customMetadata: {
          ...custom,
          version: nextVersion,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves the current index version value. Defaults to 1 if not defined.
   */
  getVersion(document: KnowledgeDocument): number {
    const custom = document.metadata.customMetadata || {};
    return typeof custom.version === "number" ? custom.version : 1;
  }
}
