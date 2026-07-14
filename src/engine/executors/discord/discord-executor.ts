// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Production Discord Executor
// Refactored to consume the shared Integration SDK abstractions.
// Handles Discord REST API message dispatch, replies, edits, and deletions.
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

// ── Discord Domain Types ──────────────────────────────────────────────────────

export type DiscordOperationType = "send" | "reply" | "edit" | "delete";
export type DiscordAuthType = "bot" | "oauth";

export interface DiscordEmbedFooter {
  text: string;
  icon_url?: string;
}

export interface DiscordEmbedImage {
  url: string;
}

export interface DiscordEmbedThumbnail {
  url: string;
}

export interface DiscordEmbedAuthor {
  name: string;
  url?: string;
  icon_url?: string;
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: DiscordEmbedFooter;
  image?: DiscordEmbedImage;
  thumbnail?: DiscordEmbedThumbnail;
  author?: DiscordEmbedAuthor;
  fields?: DiscordEmbedField[];
}

export interface DiscordAttachment {
  id?: string;
  filename: string;
  url?: string;
  sizeBytes?: number;
  contentType?: string;
}

export interface DiscordAllowedMentions {
  parse?: ("users" | "roles" | "everyone")[];
  roles?: string[];
  users?: string[];
  replied_user?: boolean;
}

export interface DiscordComponent {
  type: number;
  style?: number;
  label?: string;
  emoji?: { id?: string; name?: string; animated?: boolean };
  custom_id?: string;
  url?: string;
  disabled?: boolean;
  components?: DiscordComponent[];
}

// ── Discord Executor ──────────────────────────────────────────────────────────

export class DiscordExecutor extends BaseNodeExecutor {
  getMetadata(): NodeExecutorMetadata {
    return {
      nodeTypeId: "io_discord",
      category: "integration",
      version: "2.0.0",
      displayName: "Discord Messenger",
      description: "Send, reply to, edit, or delete messages in Discord guilds and channels.",
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
    const authType = (config.authType || "bot") as DiscordAuthType;
    const token = String(config.token || "");
    const guildId = config.guildId ? String(config.guildId) : undefined;
    const channelId = config.channelId ? String(config.channelId) : undefined;
    const operation = (String(config.operation || "send")).toLowerCase() as DiscordOperationType;
    const messageId = config.messageId ? String(config.messageId) : undefined;
    const content = config.content ? String(config.content) : undefined;
    const embeds = Array.isArray(config.embeds) ? config.embeds : [];
    const webhookUrl = config.webhookUrl ? String(config.webhookUrl) : undefined;

    const errors: { code: string; message: string; field: string }[] = [];

    // 1. Authentication Validations
    if (!token && !webhookUrl) {
      errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: "Token or Webhook URL is required", field: "token" });
    }

    if (token && authType === "bot") {
      // Discord bot tokens look like: client_id.timestamp.signature
      const discordBotTokenRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
      if (!discordBotTokenRegex.test(token)) {
        errors.push({
          code: "EXECUTOR_CONFIG_INVALID",
          message: "Discord Bot Token must follow the format 'part1.part2.part3'",
          field: "token",
        });
      }
      if (token.startsWith("xoxb-")) {
        errors.push({
          code: "EXECUTOR_CONFIG_INVALID",
          message: "Slack Bot Token detected. Please provide a Discord Bot Token.",
          field: "token",
        });
      }
    }

    // 2. Snowflake format validations (Snowflakes are 17-20 digit strings) using Authentication Manager
    if (guildId && !IntegrationAuthenticationManager.validateSnowflake(guildId)) {
      errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: "Guild ID must be a 17-20 digit Snowflake ID", field: "guildId" });
    }

    if (!webhookUrl) {
      if (!channelId) {
        errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: "Channel ID is required when Webhook URL is not provided", field: "channelId" });
      } else if (!IntegrationAuthenticationManager.validateSnowflake(channelId)) {
        errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: "Channel ID must be a 17-20 digit Snowflake ID", field: "channelId" });
      }
    }

    // 3. Operation Validations
    const validOperations: DiscordOperationType[] = ["send", "reply", "edit", "delete"];
    if (!validOperations.includes(operation)) {
      errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: `Unsupported operation: ${operation}`, field: "operation" });
    }

    if ((operation === "reply" || operation === "edit" || operation === "delete")) {
      if (!messageId) {
        errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: `Message ID is required for operation '${operation}'`, field: "messageId" });
      } else if (!IntegrationAuthenticationManager.validateSnowflake(messageId)) {
        errors.push({ code: "EXECUTOR_CONFIG_INVALID", message: "Message ID must be a 17-20 digit Snowflake ID", field: "messageId" });
      }
    }

    // 4. Payload Validations
    if (operation !== "delete") {
      const hasContent = content && content.trim().length > 0;
      const hasEmbeds = embeds.length > 0;
      if (!hasContent && !hasEmbeds) {
        errors.push({
          code: "EXECUTOR_CONFIG_INVALID",
          message: "Either Content or Embeds must be provided for message operations",
          field: "content",
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
    const authType = (config.authType || "bot") as DiscordAuthType;
    const token = String(config.token || "");
    const guildId = config.guildId ? String(config.guildId) : undefined;
    const channelId = config.channelId ? String(config.channelId) : "";
    const operation = (String(config.operation || "send")).toLowerCase() as DiscordOperationType;
    const messageId = config.messageId ? String(config.messageId) : undefined;
    const content = config.content ? String(config.content) : "";
    const embeds = (config.embeds as DiscordEmbed[]) || [];
    const attachments = (config.attachments as DiscordAttachment[]) || [];
    const allowedMentions = (config.allowedMentions as DiscordAllowedMentions) || {};
    const components = (config.components as DiscordComponent[]) || [];
    const timeoutMs = Number(config.timeoutMs ?? 5000);
    const webhookUrl = config.webhookUrl ? String(config.webhookUrl) : undefined;

    // Future compatibility structures
    const threadId = config.threadId ? String(config.threadId) : undefined;
    const forumPostTitle = config.forumPostTitle ? String(config.forumPostTitle) : undefined;
    const interactionToken = config.interactionToken ? String(config.interactionToken) : undefined;
    const interactionType = config.interactionType ? String(config.interactionType) : undefined;

    const logger = input.context.services.logger;

    // Initialize Telemetry Adapter
    const intTelemetry = new IntegrationTelemetryAdapter(logger, input.node.id);

    // Validate attachment size constraint (Security requirement)
    const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB limit
    for (const attachment of attachments) {
      if (attachment.sizeBytes && attachment.sizeBytes > MAX_ATTACHMENT_SIZE) {
        logger.error(
          `Attachment exceeds max limit of 10MB: "${attachment.filename}" (${attachment.sizeBytes} bytes)`,
          { event: "DISCORD_MESSAGE_FAILED", reason: "ATTACHMENT_TOO_LARGE" },
          input.node.id
        );
        intTelemetry.emit("INTEGRATION_FAILED", { providerId: "discord", reason: "ATTACHMENT_TOO_LARGE" });
        return failureResult({
          code: "DISCORD_SECURITY_ERROR",
          message: `Attachment size exceeds safety limits of 10MB: "${attachment.filename}"`,
          retryable: false,
        });
      }
    }

    // Resolve rate limiting bucket key
    const bucketKey = webhookUrl ? "webhook" : `${channelId}:${operation}`;

    // Resolve Connection Pool
    const connection = IntegrationConnectionManager.getOrCreateConnection("discord", guildId || "direct_message");

    try {
      // ── Telemetry: Emit DISCORD_CONNECTED & INTEGRATION_CONNECTED ──
      logger.info(
        `Connecting to Discord Gateway/REST API`,
        { 
          event: "DISCORD_CONNECTED", 
          tokenPreview: webhookUrl ? "Webhook Mode" : `${authType === "bot" ? "Bot" : "OAuth"} token-preview: ${token.substring(0, 10)}...`,
          guildId: guildId || "direct_message",
        },
        input.node.id
      );
      intTelemetry.emit("INTEGRATION_CONNECTED", { providerId: "discord", guildId });

      // Simulate connection verification handshake delay
      await new Promise((resolve) => setTimeout(resolve, 50));

      // ── Telemetry: Emit DISCORD_MESSAGE_STARTED ──
      logger.info(
        `Starting Discord message operation: ${operation}`,
        { 
          event: "DISCORD_MESSAGE_STARTED", 
          operation, 
          channelId,
          guildId: guildId || "direct_message",
          threadId,
          forumPostTitle,
          webhookMode: !!webhookUrl,
        },
        input.node.id
      );

      // Pre-emptive rate limit wait using IntegrationRateLimiter
      await IntegrationRateLimiter.checkAndDelay(bucketKey, logger, input.node.id);

      // Perform simulated network operation
      const apiPromise = this.executeDiscordApiCall(
        bucketKey,
        operation,
        channelId,
        content,
        embeds,
        attachments,
        allowedMentions,
        components,
        messageId,
        threadId,
        forumPostTitle,
        webhookUrl,
        interactionToken,
        interactionType
      );

      // Timeout safety using IntegrationTimeoutManager
      const result = await IntegrationTimeoutManager.runWithTimeout(
        apiPromise,
        timeoutMs,
        "Discord API request timed out"
      );

      // ── Telemetry: Emit DISCORD_MESSAGE_COMPLETED ──
      logger.info(
        `Discord operation completed successfully`,
        { 
          event: "DISCORD_MESSAGE_COMPLETED", 
          messageId: result.messageId, 
          channelId,
          operation,
        },
        input.node.id
      );

      // Record success in health manager
      IntegrationConnectionManager.recordSuccess("discord", guildId || "direct_message", intTelemetry);

      return successResult(
        {
          out: {
            messageId: result.messageId,
            success: true,
            operation,
            channelId,
            guildId,
            bucketId: result.bucketId,
            healthStatus: connection.status,
            payload: {
              content,
              embedsCount: embeds.length,
              attachmentsCount: attachments.length,
              componentsCount: components.length,
            },
          },
        },
        {
          operation,
          channelId,
          messageId: result.messageId,
          textPreview: content ? content.substring(0, 50) : "[Embeds Only]",
        }
      );

    } catch (err: any) {
      // ── Telemetry: Emit DISCORD_MESSAGE_FAILED ──
      logger.error(
        `Discord operation failed: ${err.message}`,
        { event: "DISCORD_MESSAGE_FAILED", error: err.message, code: err.code || "DISCORD_OPERATION_FAILED" },
        input.node.id
      );

      const isRateLimited = err?.status === 429 || err?.message?.toLowerCase().includes("rate limit");

      // Record failure in health monitor
      IntegrationConnectionManager.recordFailure("discord", guildId || "direct_message", isRateLimited, intTelemetry);

      // Map error details using IntegrationErrorMapper
      const mappedError = IntegrationErrorMapper.mapToExecutorError(err, "DISCORD_OPERATION_FAILED");

      return failureResult(mappedError, {
        operation,
        channelId,
        retryAfter: err?.retryAfter,
      });
    } finally {
      // ── Telemetry: Emit DISCORD_DISCONNECTED ──
      logger.info(
        `Disconnecting from Discord API`,
        { event: "DISCORD_DISCONNECTED" },
        input.node.id
      );
    }
  }

  /**
   * Mock execution of Discord REST API call.
   */
  private async executeDiscordApiCall(
    bucketKey: string,
    operation: DiscordOperationType,
    channelId: string,
    content: string,
    embeds: DiscordEmbed[],
    attachments: DiscordAttachment[],
    allowedMentions: DiscordAllowedMentions,
    components: DiscordComponent[],
    messageId?: string,
    threadId?: string,
    forumPostTitle?: string,
    webhookUrl?: string,
    interactionToken?: string,
    interactionType?: string
  ): Promise<{ messageId: string; bucketId: string }> {
    // Simulate typical API network roundtrip latency
    await new Promise((resolve) => setTimeout(resolve, 80));

    const bucketId = `bkt-discord-${bucketKey.replace(":", "-")}`;

    // Simulate 429 rate limit errors (5% chance)
    if (Math.random() < 0.05) {
      const retryAfter = 2; // Wait 2 seconds
      IntegrationRateLimiter.register429(bucketKey, retryAfter);

      const error: any = new Error("You are being rate limited.");
      error.status = 429;
      error.retryAfter = retryAfter;
      error.code = "DISCORD_RATE_LIMITED";
      error.details = {
        message: "You are sending messages too quickly.",
        retry_after: retryAfter,
        global: false,
        bucket: bucketId,
      };
      throw error;
    }

    // Success update
    IntegrationRateLimiter.updateBucket(bucketKey, 5, Date.now() + 5000);

    return {
      messageId: messageId || `msg-discord-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      bucketId,
    };
  }
}
