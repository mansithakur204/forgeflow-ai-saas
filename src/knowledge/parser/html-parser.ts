// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — HTML Document Parser
// ─────────────────────────────────────────────────────────────────────────────

import { BaseDocumentParser } from "./base-parser";
import type { ParsedDocument, SupportedParserFormat } from "./parser.interface";

export class HTMLParser extends BaseDocumentParser {
  readonly parserName = "HTMLParser";
  readonly supportedFormats: SupportedParserFormat[] = ["html"];
  readonly supportedMimeTypes = ["text/html"];

  async parse(content: Buffer, format: string): Promise<ParsedDocument> {
    const startTime = Date.now();
    this.validate(content, format);

    const text = content.toString("utf-8");
    const duration = Date.now() - startTime;

    // Strip out HTML tags for structural text extraction representation
    const strippedText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const result = this.createParserResult(
      "document.html",
      "text/html",
      `[HTML Extracted Text (Length: ${content.length} bytes)]\n` + strippedText,
      duration,
      1
    );

    return {
      content: result.text,
      metadata: result.metadata,
      diagnostics: result.diagnostics,
    };
  }
}
