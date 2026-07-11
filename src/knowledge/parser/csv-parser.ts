import { BaseDocumentParser } from "./base-parser";
import type { ParsedDocument, SupportedParserFormat } from "./parser.interface";

export class CSVParser extends BaseDocumentParser {
  readonly parserName = "CSVParser";
  readonly supportedFormats: SupportedParserFormat[] = ["csv"];
  readonly supportedMimeTypes = ["text/csv"];

  async parse(content: Buffer, format: string): Promise<ParsedDocument> {
    const startTime = Date.now();
    this.validate(content, format);

    const text = content.toString("utf-8");
    const duration = Date.now() - startTime;

    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    const rowCount = lines.length;
    const colCount = lines[0] ? lines[0].split(",").length : 0;

    const warnings: string[] = [];
    if (rowCount === 0) {
      warnings.push("CSV payload is empty or contains only line splits");
    }

    const result = this.createParserResult(
      "document.csv",
      "text/csv",
      text,
      duration,
      undefined,
      warnings
    );

    return {
      content: result.text,
      metadata: {
        ...result.metadata,
        customMetadata: {
          rowCount,
          colCount,
        },
      },
      diagnostics: result.diagnostics,
    };
  }
}
