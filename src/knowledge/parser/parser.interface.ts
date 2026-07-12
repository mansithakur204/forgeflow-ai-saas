import type { DocumentMetadata } from "../types/document";
import type { ParserDiagnostics } from "./parser-result";

export interface ParsedDocument {
  content: string;
  metadata: Partial<DocumentMetadata>;
  diagnostics?: ParserDiagnostics;
}

export type SupportedParserFormat = "pdf" | "docx" | "txt" | "markdown" | "csv";

export interface IDocumentParser {
  /**
   * Asserts whether a mime-type or file extension format is supported by this parser.
   */
  supports(format: SupportedParserFormat | string): boolean;

  /**
   * Extracts raw binary text content and metadata from the given format buffer.
   */
  parse(content: Buffer, format: SupportedParserFormat | string): Promise<ParsedDocument>;
}
