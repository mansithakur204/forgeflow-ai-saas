import type { IDocumentParser } from "./parser.interface";

export class ParserRegistry {
  private parsers = new Map<string, IDocumentParser>();

  /**
   * Registers a document parser instance for the specified file extension or format.
   */
  register(format: string, parser: IDocumentParser): void {
    this.parsers.set(format.toLowerCase(), parser);
  }

  /**
   * Resolves a parser instance matching the specified file extension format.
   */
  resolve(format: string): IDocumentParser | null {
    return this.parsers.get(format.toLowerCase()) ?? null;
  }

  /**
   * Removes a registered parser configuration.
   */
  unregister(format: string): void {
    this.parsers.delete(format.toLowerCase());
  }

  /**
   * Clears all registered parsers.
   */
  clear(): void {
    this.parsers.clear();
  }
}
