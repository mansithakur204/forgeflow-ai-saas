import type { DocumentMetadata } from "../types/document";

export interface ParserDiagnostics {
  parserName: string;
  parsedAt: string;
  parseDurationMs: number;
  warnings: string[];
  isTruncated?: boolean;
}

export interface ParserResult {
  documentId?: string;
  documentName: string;
  mimeType: string;
  encoding: string;
  language?: string;
  text: string;
  pageCount?: number;
  wordCount: number;
  characterCount: number;
  metadata: Partial<DocumentMetadata>;
  diagnostics: ParserDiagnostics;
}
