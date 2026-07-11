import { BaseDocumentParser } from "./base-parser";
import type { ParsedDocument, SupportedParserFormat } from "./parser.interface";

export class MarkdownParser extends BaseDocumentParser {
  readonly parserName = "MarkdownParser";
  readonly supportedFormats: SupportedParserFormat[] = ["markdown"];
  readonly supportedMimeTypes = ["text/markdown", "text/x-markdown"];

  async parse(content: Buffer, format: string): Promise<ParsedDocument> {
    const startTime = Date.now();
    this.validate(content, format);

    const text = content.toString("utf-8");
    const duration = Date.now() - startTime;

    // Basic regex count of headers (# header)
    const headerLines = text.split(/\r?\n/).filter((l) => l.startsWith("#"));

    const result = this.createParserResult("document.md", "text/markdown", text, duration);

    return {
      content: result.text,
      metadata: {
        ...result.metadata,
        customMetadata: {
          headersCount: headerLines.length,
        },
      },
      diagnostics: result.diagnostics,
    };
  }
}
