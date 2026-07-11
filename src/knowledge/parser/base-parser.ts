import type { IDocumentParser, ParsedDocument, SupportedParserFormat } from "./parser.interface";
import type { ParserResult } from "./parser-result";
import { ParserExecutionError } from "../errors/processing-error";

export abstract class BaseDocumentParser implements IDocumentParser {
  abstract readonly parserName: string;
  abstract readonly supportedFormats: SupportedParserFormat[];
  abstract readonly supportedMimeTypes: string[];

  /**
   * Checks if this parser supports the given format/mime-type.
   */
  supports(format: string): boolean {
    const normalized = format.toLowerCase().trim();
    return (
      this.supportedFormats.includes(normalized as SupportedParserFormat) ||
      this.supportedMimeTypes.includes(normalized)
    );
  }

  /**
   * Throws a descriptive validation error if the document buffer or format matches are incorrect.
   */
  protected validate(content: Buffer, format: string): void {
    if (!content || content.length === 0) {
      throw new ParserExecutionError(`[${this.parserName}] Cannot parse empty or undefined file buffer`);
    }
    if (!this.supports(format)) {
      throw new ParserExecutionError(
        `[${this.parserName}] Unsupported file format or mime-type: "${format}"`
      );
    }
  }

  abstract parse(content: Buffer, format: string): Promise<ParsedDocument>;

  /**
   * Helper to construct a standard unified ParserResult layout from parsed segments.
   */
  protected createParserResult(
    fileName: string,
    mimeType: string,
    text: string,
    durationMs: number,
    pageCount?: number,
    warnings: string[] = []
  ): ParserResult {
    const cleanText = text.trim();
    const wordCount = cleanText === "" ? 0 : cleanText.split(/\s+/).length;
    const characterCount = text.length;

    return {
      documentName: fileName,
      mimeType,
      encoding: "utf-8",
      text,
      pageCount,
      wordCount,
      characterCount,
      metadata: {
        fileName,
        fileSize: characterCount,
        mimeType,
        pageCount,
        wordCount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      diagnostics: {
        parserName: this.parserName,
        parsedAt: new Date().toISOString(),
        parseDurationMs: durationMs,
        warnings,
      },
    };
  }
}
