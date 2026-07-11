export class DocumentProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentProcessingError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ParserNotFoundError extends DocumentProcessingError {
  constructor(message: string) {
    super(message);
    this.name = "ParserNotFoundError";
  }
}

export class ParserExecutionError extends DocumentProcessingError {
  constructor(message: string) {
    super(message);
    this.name = "ParserExecutionError";
  }
}

export class ChunkerNotFoundError extends DocumentProcessingError {
  constructor(message: string) {
    super(message);
    this.name = "ChunkerNotFoundError";
  }
}

export class ChunkerExecutionError extends DocumentProcessingError {
  constructor(message: string) {
    super(message);
    this.name = "ChunkerExecutionError";
  }
}

export class InvalidStatusTransitionError extends DocumentProcessingError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStatusTransitionError";
  }
}
