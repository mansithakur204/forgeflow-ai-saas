// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Knowledge Engine Pipeline Processing Errors
// ─────────────────────────────────────────────────────────────────────────────

export class DocumentProcessingError extends Error {
  readonly isRetryable: boolean = false;

  constructor(message: string, isRetryable = false) {
    super(message);
    this.name = "DocumentProcessingError";
    this.isRetryable = isRetryable;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DocumentProcessingError {
  constructor(message: string) {
    super(message, false);
    this.name = "ValidationError";
  }
}

export class StorageError extends DocumentProcessingError {
  constructor(message: string) {
    super(message, true);
    this.name = "StorageError";
  }
}

export class ParserNotFoundError extends DocumentProcessingError {
  constructor(message: string) {
    super(message, false);
    this.name = "ParserNotFoundError";
  }
}

export class ParserExecutionError extends DocumentProcessingError {
  constructor(message: string) {
    super(message, false);
    this.name = "ParserExecutionError";
  }
}

export class ChunkerNotFoundError extends DocumentProcessingError {
  constructor(message: string) {
    super(message, false);
    this.name = "ChunkerNotFoundError";
  }
}

export class ChunkerExecutionError extends DocumentProcessingError {
  constructor(message: string) {
    super(message, false);
    this.name = "ChunkerExecutionError";
  }
}

export class InvalidStatusTransitionError extends DocumentProcessingError {
  constructor(message: string) {
    super(message, false);
    this.name = "InvalidStatusTransitionError";
  }
}

export class ProcessingTimeoutError extends DocumentProcessingError {
  constructor(message: string) {
    super(message, true);
    this.name = "ProcessingTimeoutError";
  }
}

export class DuplicateDocumentError extends DocumentProcessingError {
  constructor(message: string) {
    super(message, false);
    this.name = "DuplicateDocumentError";
  }
}
