import { BaseDocumentParser } from "./base-parser";
import type { ParsedDocument, SupportedParserFormat } from "./parser.interface";

export class PDFParser extends BaseDocumentParser {
  readonly parserName = "PDFParser";
  readonly supportedFormats: SupportedParserFormat[] = ["pdf"];
  readonly supportedMimeTypes = ["application/pdf"];

  async parse(content: Buffer, format: string): Promise<ParsedDocument> {
    const startTime = Date.now();
    this.validate(content, format);

    // Placeholder representation: decodes text content and simulates page checks
    const text = content.toString("utf-8");
    const duration = Date.now() - startTime;

    // Simulate page marker detection
    const pageCountMatches = text.match(/\/Type\s*\/Page\b/g);
    const pageCount = pageCountMatches ? pageCountMatches.length : 1;

    const result = this.createParserResult(
      "document.pdf",
      "application/pdf",
      `[PDF Extracted Text (Length: ${content.length} bytes)]\n` + text,
      duration,
      pageCount
    );

    return {
      content: result.text,
      metadata: result.metadata,
      diagnostics: result.diagnostics,
    };
  }
}
