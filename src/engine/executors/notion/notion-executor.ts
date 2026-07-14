// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Production Notion Executor
// Refactored to consume the shared Integration SDK abstractions.
// Handles Notion REST API page operations, block additions, and database queries.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseNodeExecutor } from "@/engine/executors/base/base-node-executor";
import { successResult, failureResult } from "@/engine/executors/base/executor-result";
import type {
  ExecutorExecutionInput,
  ExecutorExecutionResult,
  ExecutorValidationInput,
  ExecutorValidationResult,
  NodeExecutorMetadata,
} from "@/engine/types/executor";
import {
  IntegrationAuthenticationManager,
  IntegrationConnectionManager,
  IntegrationRateLimiter,
  IntegrationTelemetryAdapter,
  IntegrationTimeoutManager,
  IntegrationErrorMapper,
} from "@/engine/executors/base/integration-sdk";

// ── Notion Domain Types ───────────────────────────────────────────────────────

export type NotionOperationType =
  | "create_page"
  | "update_page"
  | "append_blocks"
  | "read_page"
  | "create_database_entry"
  | "update_database_entry"
  | "query_database"
  | "archive_page";

export type NotionAuthType = "integration" | "oauth";

// Notion Rich Text formatting options
export interface NotionAnnotations {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: string;
}

export interface NotionRichTextText {
  content: string;
  link?: { url: string } | null;
}

export interface NotionRichText {
  type: "text" | "mention" | "equation";
  text?: NotionRichTextText;
  annotations?: NotionAnnotations;
  plain_text?: string;
  href?: string;
  mention?: any; // For user, page, date mentions
}

// Notion Block interfaces
export interface NotionParagraphBlock {
  rich_text: NotionRichText[];
  color?: string;
}

export interface NotionHeadingBlock {
  rich_text: NotionRichText[];
  color?: string;
  is_toggleable?: boolean;
}

export interface NotionCodeBlock {
  rich_text: NotionRichText[];
  language: string;
  caption?: NotionRichText[];
}

export interface NotionTableRowBlock {
  cells: NotionRichText[][];
}

export interface NotionTableBlock {
  table_width: number;
  has_column_header: boolean;
  has_row_header: boolean;
  children?: { type: "table_row"; table_row: NotionTableRowBlock }[];
}

export interface NotionImageBlock {
  type: "external" | "file";
  external?: { url: string };
  file?: { url: string; expiry_time: string };
  caption?: NotionRichText[];
}

export interface NotionBlock {
  object?: "block";
  id?: string;
  type:
    | "paragraph"
    | "heading_1"
    | "heading_2"
    | "heading_3"
    | "bulleted_list_item"
    | "numbered_list_item"
    | "code"
    | "table"
    | "image"
    | "mention";
  paragraph?: NotionParagraphBlock;
  heading_1?: NotionHeadingBlock;
  heading_2?: NotionHeadingBlock;
  heading_3?: NotionHeadingBlock;
  bulleted_list_item?: NotionParagraphBlock;
  numbered_list_item?: NotionParagraphBlock;
  code?: NotionCodeBlock;
  table?: NotionTableBlock;
  image?: NotionImageBlock;
  mention?: any;
}

// ── Notion Executor ───────────────────────────────────────────────────────────

export class NotionExecutor extends BaseNodeExecutor {
  getMetadata(): NodeExecutorMetadata {
    return {
      nodeTypeId: "io_notion",
      category: "integration",
      version: "2.0.0",
      displayName: "Notion Integrator",
      description: "Manage pages, databases, blocks, and rich text documents in Notion workspaces.",
      inputPorts: [{ id: "in", label: "Input" }],
      outputPorts: [
        { id: "out", label: "Result" },
        { id: "err", label: "Error" },
      ],
      supportsCancellation: true,
      supportsRetry: true,
    };
  }

  validate(input: ExecutorValidationInput): ExecutorValidationResult {
    const config = input.node.config;
    const authType = (config.authType || "integration") as NotionAuthType;
    const token = String(config.token || "");
    const workspaceId = config.workspaceId ? String(config.workspaceId) : undefined;
    const operation = (String(config.operation || "read_page")).toLowerCase() as NotionOperationType;
    const pageId = config.pageId ? String(config.pageId) : undefined;
    const databaseId = config.databaseId ? String(config.databaseId) : undefined;
    const blocks = Array.isArray(config.blocks) ? config.blocks : [];

    const errors: { code: string; message: string; field: string }[] = [];

    // 1. Authentication & Workspace Validations (Task 13.6A)
    if (!token) {
      errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: "Notion Token is required", field: "token" });
    } else if (authType === "integration") {
      if (!IntegrationAuthenticationManager.validateTokenPrefix(token, "secret_")) {
        errors.push({
          code: "EXECUTOR_CONFIG_INVALID",
          message: "Internal Integration Token must begin with 'secret_'",
          field: "token",
        });
      }
    }

    if (!workspaceId) {
      errors.push({
        code: "EXECUTOR_CONFIG_INVALID",
        message: "Workspace Identifier is required for configuration validation",
        field: "workspaceId",
      });
    }

    // 2. Notion ID validations using Authentication Manager
    if (pageId && !IntegrationAuthenticationManager.validateUUID(pageId)) {
      errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: "Page ID must be a valid 32 or 36-character UUIDv4 ID", field: "pageId" });
    }

    if (databaseId && !IntegrationAuthenticationManager.validateUUID(databaseId)) {
      errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: "Database ID must be a valid 32 or 36-character UUIDv4 ID", field: "databaseId" });
    }

    // 3. Operation Validations
    const validOperations: NotionOperationType[] = [
      "create_page",
      "update_page",
      "append_blocks",
      "read_page",
      "create_database_entry",
      "update_database_entry",
      "query_database",
      "archive_page",
    ];
    if (!validOperations.includes(operation)) {
      errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: `Unsupported operation: ${operation}`, field: "operation" });
    }

    // Page/Database requirements per operation
    if (
      (operation === "update_page" ||
        operation === "append_blocks" ||
        operation === "read_page" ||
        operation === "archive_page" ||
        operation === "update_database_entry") &&
      !pageId
    ) {
      errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: `Page ID is required for operation '${operation}'`, field: "pageId" });
    }

    if ((operation === "create_database_entry" || operation === "query_database") && !databaseId) {
      errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: `Database ID is required for operation '${operation}'`, field: "databaseId" });
    }

    // 4. Content Validations
    if (operation === "append_blocks" && blocks.length === 0) {
      errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: "At least one block is required for appending blocks", field: "blocks" });
    }

    const supportedBlockTypes = [
      "paragraph",
      "heading_1",
      "heading_2",
      "heading_3",
      "bulleted_list_item",
      "numbered_list_item",
      "code",
      "table",
      "image",
      "mention",
    ];

    for (let idx = 0; idx < blocks.length; idx++) {
      const block = blocks[idx] as NotionBlock;
      if (!block || typeof block !== "object" || !block.type) {
        errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: `Block at index ${idx} is invalid`, field: "blocks" });
        continue;
      }
      if (!supportedBlockTypes.includes(block.type)) {
        errors.push({
          code: "EXECUTOR_CONFIG_INVALID",
          message: `Unsupported Notion block type at index ${idx}: '${block.type}'`,
          field: "blocks",
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  protected async run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const config = input.node.config;
    const authType = (config.authType || "integration") as NotionAuthType;
    const token = String(config.token || "");
    const workspaceId = String(config.workspaceId || "");
    const operation = (String(config.operation || "read_page")).toLowerCase() as NotionOperationType;
    const pageId = config.pageId ? String(config.pageId) : undefined;
    const databaseId = config.databaseId ? String(config.databaseId) : undefined;
    const blocks = (config.blocks as NotionBlock[]) || [];
    const properties = (config.properties as Record<string, unknown>) || {};
    const filter = (config.filter as Record<string, unknown>) || {};
    const timeoutMs = Number(config.timeoutMs ?? 5000);

    // Future compatibility structures
    const commentText = config.commentText ? String(config.commentText) : undefined;
    const templateId = config.templateId ? String(config.templateId) : undefined;
    const syncedBlockId = config.syncedBlockId ? String(config.syncedBlockId) : undefined;
    const aiBlockType = config.aiBlockType ? String(config.aiBlockType) : undefined;
    const wikiVerified = config.wikiVerified !== undefined ? !!config.wikiVerified : undefined;

    const logger = input.context.services.logger;

    // Initialize Telemetry Adapter
    const intTelemetry = new IntegrationTelemetryAdapter(logger, input.node.id);

    // Validate images and tables formats
    for (const block of blocks) {
      if (block.type === "image" && block.image) {
        const url = block.image.external?.url || block.image.file?.url || "";
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          logger.error(
            `Invalid image block URL format detected`,
            { event: "NOTION_REQUEST_FAILED", reason: "INVALID_IMAGE_URL" },
            input.node.id
          );
          intTelemetry.emit("INTEGRATION_FAILED", { providerId: "notion", reason: "INVALID_IMAGE_URL" });
          return failureResult({
            code: "NOTION_CONTENT_ERROR",
            message: `Image block external URL must be a valid http/https link: "${url}"`,
            retryable: false,
          });
        }
      }
    }

    // Set rate limit bucket based on route parameters
    const bucketKey = databaseId ? `${workspaceId}:${databaseId}` : `${workspaceId}:${pageId || "global"}`;

    // Resolve Connection State
    const connection = IntegrationConnectionManager.getOrCreateConnection("notion", workspaceId);

    try {
      // ── Telemetry: Emit NOTION_CONNECTED & INTEGRATION_CONNECTED ──
      logger.info(
        `Connecting to Notion API session for workspace: ${workspaceId}`,
        { 
          event: "NOTION_CONNECTED", 
          workspaceId,
          authType,
          tokenPreview: `${token.substring(0, 10)}...`,
        },
        input.node.id
      );
      intTelemetry.emit("INTEGRATION_CONNECTED", { providerId: "notion", workspaceId });

      // Simulate handshake connection delay
      await new Promise((resolve) => setTimeout(resolve, 50));

      // ── Telemetry: Emit NOTION_REQUEST_STARTED ──
      logger.info(
        `Starting Notion API request: ${operation}`,
        { 
          event: "NOTION_REQUEST_STARTED", 
          operation, 
          workspaceId,
          pageId,
          databaseId,
          blocksCount: blocks.length,
          commentText,
          templateId,
          syncedBlockId,
          aiBlockType,
          wikiVerified,
        },
        input.node.id
      );

      // Pre-emptive rate limit wait using IntegrationRateLimiter
      await IntegrationRateLimiter.checkAndDelay(bucketKey, logger, input.node.id);

      // Perform simulated network operation
      const apiPromise = this.executeNotionApiCall(
        bucketKey,
        operation,
        pageId,
        databaseId,
        blocks,
        properties,
        filter,
        commentText,
        templateId,
        syncedBlockId,
        aiBlockType,
        wikiVerified
      );

      // Timeout safety using IntegrationTimeoutManager
      const result = await IntegrationTimeoutManager.runWithTimeout(
        apiPromise,
        timeoutMs,
        "Notion API request timed out"
      );

      // ── Telemetry: Emit NOTION_REQUEST_COMPLETED ──
      logger.info(
        `Notion request completed successfully`,
        { 
          event: "NOTION_REQUEST_COMPLETED", 
          operation, 
          workspaceId,
          resultId: result.resultId,
        },
        input.node.id
      );

      // Record success in health manager
      IntegrationConnectionManager.recordSuccess("notion", workspaceId, intTelemetry);

      return successResult(
        {
          out: {
            success: true,
            id: result.resultId,
            operation,
            workspaceId,
            pageId,
            databaseId,
            bucketId: result.bucketId,
            healthStatus: connection.status,
            payload: {
              blocksCount: blocks.length,
              properties: Object.keys(properties),
            },
          },
        },
        {
          operation,
          workspaceId,
          resultId: result.resultId,
          blocksPreviewCount: blocks.length,
        }
      );

    } catch (err: any) {
      // ── Telemetry: Emit NOTION_REQUEST_FAILED ──
      logger.error(
        `Notion request failed: ${err.message}`,
        { event: "NOTION_REQUEST_FAILED", error: err.message, code: err.code || "NOTION_REQUEST_FAILED" },
        input.node.id
      );

      const isRateLimited = err?.status === 429 || err?.message?.toLowerCase().includes("rate limit");

      // Record failure in health monitor
      IntegrationConnectionManager.recordFailure("notion", workspaceId, isRateLimited, intTelemetry);

      // Map error details using IntegrationErrorMapper
      const mappedError = IntegrationErrorMapper.mapToExecutorError(err, "NOTION_REQUEST_FAILED");

      return failureResult(mappedError, {
        operation,
        workspaceId,
        retryAfter: err?.retryAfter,
      });
    } finally {
      // ── Telemetry: Emit NOTION_DISCONNECTED ──
      logger.info(
        `Disconnecting from Notion API session`,
        { event: "NOTION_DISCONNECTED" },
        input.node.id
      );
    }
  }

  /**
   * Mock execution of Notion REST API call.
   */
  private async executeNotionApiCall(
    bucketKey: string,
    operation: NotionOperationType,
    pageId?: string,
    databaseId?: string,
    blocks?: NotionBlock[],
    properties?: Record<string, unknown>,
    filter?: Record<string, unknown>,
    commentText?: string,
    templateId?: string,
    syncedBlockId?: string,
    aiBlockType?: string,
    wikiVerified?: boolean
  ): Promise<{ resultId: string; bucketId: string }> {
    // Simulate typical API network roundtrip latency
    await new Promise((resolve) => setTimeout(resolve, 80));

    const bucketId = `bkt-notion-${bucketKey.replace(/[^a-zA-Z0-9]/g, "-")}`;

    // Simulate 429 rate limit errors (5% chance)
    if (Math.random() < 0.05) {
      const retryAfter = 3;
      IntegrationRateLimiter.register429(bucketKey, retryAfter);

      const error: any = new Error("Rate limit exceeded (Notion Average RPS: 3).");
      error.status = 429;
      error.retryAfter = retryAfter;
      error.code = "NOTION_RATE_LIMITED";
      error.details = {
        message: "You are making too many requests to Notion API.",
        retry_after: retryAfter,
        global: false,
        bucket: bucketId,
      };
      throw error;
    }

    // Success update
    IntegrationRateLimiter.updateBucket(bucketKey, 2, Date.now() + 3000);

    const mockId = `notion-res-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    return {
      resultId: mockId,
      bucketId,
    };
  }
}
