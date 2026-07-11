import { PDFParser } from "./pdf-parser";
import { DOCXParser } from "./docx-parser";
import { TXTParser } from "./txt-parser";
import { MarkdownParser } from "./markdown-parser";
import { CSVParser } from "./csv-parser";
import { ParserRegistry } from "./parser-registry";
import type { IDocumentParser } from "./parser.interface";

export class ParserFactory {
  /**
   * Resolves a parser instance dynamically from file extension keys or formats.
   */
  static create(format: string): IDocumentParser {
    const normalized = format.toLowerCase().trim();
    switch (normalized) {
      case "pdf":
      case "application/pdf":
        return new PDFParser();
      case "docx":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return new DOCXParser();
      case "txt":
      case "text/plain":
        return new TXTParser();
      case "md":
      case "markdown":
      case "text/markdown":
      case "text/x-markdown":
        return new MarkdownParser();
      case "csv":
      case "text/csv":
        return new CSVParser();
      default:
        throw new Error(`Unsupported parser format requested: "${format}"`);
    }
  }

  /**
   * Creates a new ParserRegistry pre-populated with standard document format parsers.
   */
  static createDefaultRegistry(): ParserRegistry {
    const registry = new ParserRegistry();
    registry.register("pdf", new PDFParser());
    registry.register("docx", new DOCXParser());
    registry.register("txt", new TXTParser());
    registry.register("markdown", new MarkdownParser());
    registry.register("csv", new CSVParser());
    return registry;
  }
}
