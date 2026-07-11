import { DocumentStatus, isValidDocumentTransition, type KnowledgeDocument } from "../types/document";
import type { IKnowledgeDocumentRepository } from "../repository/knowledge-repository.interface";
import { InvalidStatusTransitionError } from "../errors/processing-error";

export class DocumentStateManager {
  private documentRepository: IKnowledgeDocumentRepository;

  constructor(documentRepository: IKnowledgeDocumentRepository) {
    this.documentRepository = documentRepository;
  }

  /**
   * Safe status transition wrapper, validating transition paths and persisting new states.
   */
  async transitionTo(
    document: KnowledgeDocument,
    newStatus: DocumentStatus,
    errorMessage?: string | null
  ): Promise<KnowledgeDocument> {
    if (!isValidDocumentTransition(document.status, newStatus)) {
      throw new InvalidStatusTransitionError(
        `Invalid lifecycle status transition from "${document.status}" to "${newStatus}" for document ID ${document.id}`
      );
    }
    return this.documentRepository.updateStatus(document.id, newStatus, errorMessage);
  }
}
