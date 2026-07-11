import { BaseDocumentParser } from "./base-parser";
import type { ParsedDocument, SupportedParserFormat } from "./parser.interface";

export class TXTParser extends BaseDocumentParser {
  readonly parserName = "TXTParser";
  readonly supportedFormats: SupportedParserFormat[] = ["txt"];
  readonly supportedMimeTypes = ["text/plain"];

  async parse(content: Buffer, format: string): Promise<ParsedDocument> {
    const startTime = Date.now();
    this.validate(content, format);

    const text = content.toString("utf-8");
    const duration = Date.now() - startTime;

    const result = this.createParserResult("document.txt", "text/plain", text, duration);
    return {
      content: result.text,
      metadata: result.metadata,
      diagnostics: result.diagnostics,
    };
  }
}
