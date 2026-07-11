import { BaseDocumentParser } from "./base-parser";
import type { ParsedDocument, SupportedParserFormat } from "./parser.interface";

export class DOCXParser extends BaseDocumentParser {
  readonly parserName = "DOCXParser";
  readonly supportedFormats: SupportedParserFormat[] = ["docx"];
  readonly supportedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  async parse(content: Buffer, format: string): Promise<ParsedDocument> {
    const startTime = Date.now();
    this.validate(content, format);

    // Placeholder representation: decodes text content
    const text = content.toString("utf-8");
    const duration = Date.now() - startTime;

    const result = this.createParserResult(
      "document.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      `[DOCX Extracted Text (Length: ${content.length} bytes)]\n` + text,
      duration
    );

    return {
      content: result.text,
      metadata: result.metadata,
      diagnostics: result.diagnostics,
    };
  }
}
