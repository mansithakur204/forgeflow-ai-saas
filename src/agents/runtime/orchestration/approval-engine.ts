// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — HITL Approval Engine
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ApprovalRequest,
  ApprovalDecision,
  ApprovalStatus,
  ApprovalConfiguration,
} from "../../types/approval";
import type { OrchestratorContext } from "../../types/orchestration";

export interface ApprovalRule {
  id: string;
  name: string;
  isEnabled: boolean;
  match: (toolId: string, config: Record<string, unknown>) => boolean;
  defaultConfig?: ApprovalConfiguration;
}

export class ApprovalEngine {
  private rules: ApprovalRule[] = [];
  private requests = new Map<string, ApprovalRequest>();
  private approvedActions = new Set<string>(); // key format: `orchestrationId:toolId`
  private logger: any;

  constructor(logger: any = console) {
    this.logger = logger;
    this.registerDefaultRules();
  }

  /**
   * Registers default rules required by Task 15.4D.
   */
  private registerDefaultRules(): void {
    // 1. Database DELETE
    this.registerRule({
      id: "rule-db-delete",
      name: "Database DELETE Approval Required",
      isEnabled: true,
      match: (toolId, config) => {
        if (toolId !== "io_database") return false;
        const op = String(config.operation || "").toUpperCase();
        const query = String(config.query || "").toUpperCase();
        return op === "DELETE" || query.includes("DELETE");
      },
      defaultConfig: {
        timeoutMs: 60000, // 1 minute default timeout
        autoRejectOnTimeout: true,
      },
    });

    // 2. Email Bulk Send
    this.registerRule({
      id: "rule-email-bulk",
      name: "Email Bulk Send Approval Required",
      isEnabled: true,
      match: (toolId, config) => {
        if (toolId !== "io_email") return false;
        const to = String(config.to || "");
        const recipients = to.split(",").map((r) => r.trim()).filter(Boolean);
        const isBulkFlag = !!config.isBulk;
        return isBulkFlag || recipients.length > 5;
      },
      defaultConfig: {
        timeoutMs: 300000, // 5 minutes default timeout
        autoRejectOnTimeout: true,
      },
    });

    // 3. Slack Broadcast
    this.registerRule({
      id: "rule-slack-broadcast",
      name: "Slack Broadcast Approval Required",
      isEnabled: true,
      match: (toolId, config) => {
        if (toolId !== "io_slack") return false;
        const isBroadcast = !!config.broadcast;
        const channel = String(config.channel || "");
        const op = String(config.operation || "").toLowerCase();
        return isBroadcast || channel === "*" || channel.toLowerCase() === "#general" || op === "broadcast";
      },
      defaultConfig: {
        timeoutMs: 120000, // 2 minutes default timeout
      },
    });

    // 4. Discord Broadcast
    this.registerRule({
      id: "rule-discord-broadcast",
      name: "Discord Broadcast Approval Required",
      isEnabled: true,
      match: (toolId, config) => {
        if (toolId !== "io_discord") return false;
        const isBroadcast = !!config.broadcast;
        const channel = String(config.channel || "");
        const op = String(config.operation || "").toLowerCase();
        return isBroadcast || channel === "*" || op === "broadcast";
      },
      defaultConfig: {
        timeoutMs: 120000,
      },
    });

    // 5. Notion Delete
    this.registerRule({
      id: "rule-notion-delete",
      name: "Notion Delete Approval Required",
      isEnabled: true,
      match: (toolId, config) => {
        if (toolId !== "io_notion") return false;
        const op = String(config.operation || "").toLowerCase();
        return op === "delete";
      },
      defaultConfig: {
        timeoutMs: 60000,
      },
    });

    // 6. Custom Tool Execution (io_http or other custom registered tool check)
    this.registerRule({
      id: "rule-custom-tool",
      name: "Custom Tool Execution Approval Required",
      isEnabled: true,
      match: (toolId, config) => {
        if (toolId === "io_http") {
          const method = String(config.method || "").toUpperCase();
          return method === "DELETE";
        }
        // General custom tool execution match if flag requireApproval is set
        return !!config.requireApproval;
      },
      defaultConfig: {
        timeoutMs: 180000,
      },
    });
  }

  registerRule(rule: ApprovalRule): void {
    if (this.rules.some((r) => r.id === rule.id)) {
      throw new Error(`Rule with ID "${rule.id}" is already registered.`);
    }
    this.rules.push(rule);
  }

  /**
   * Check if the tool/action requires approval by evaluating registered rules.
   */
  check(orchestrationId: string, toolId: string, config: Record<string, unknown>): { requiresApproval: boolean; matchedRule?: ApprovalRule } {
    // If we already approved this specific tool action for this run, do not block again.
    if (this.isActionApproved(orchestrationId, toolId)) {
      return { requiresApproval: false };
    }

    for (const rule of this.rules) {
      if (rule.isEnabled && rule.match(toolId, config)) {
        return { requiresApproval: true, matchedRule: rule };
      }
    }

    return { requiresApproval: false };
  }

  /**
   * Create an Approval Request, persist workflow state and start timeout timer.
   */
  createRequest(
    orchestrationId: string,
    toolId: string,
    payload: Record<string, unknown>,
    context: OrchestratorContext,
    variables: Record<string, unknown>,
    customConfig?: ApprovalConfiguration
  ): ApprovalRequest {
    const matched = this.check(orchestrationId, toolId, payload);
    const defaultConfig = matched.matchedRule?.defaultConfig || {};
    const config: ApprovalConfiguration = {
      ...defaultConfig,
      ...customConfig,
    };

    const requestId = `appr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const createdAt = new Date().toISOString();
    let expiresAt: string | undefined = undefined;

    if (config.timeoutMs && config.timeoutMs > 0) {
      expiresAt = new Date(Date.now() + config.timeoutMs).toISOString();
    }

    const request: ApprovalRequest = {
      id: requestId,
      orchestrationId,
      actionType: matched.matchedRule?.name || `Execution of tool: ${toolId}`,
      targetResource: toolId,
      payload,
      status: "pending",
      createdAt,
      expiresAt,
      config,
      workflowState: {
        goal: String(context.sharedMetadata?.goal || ""),
        correlationId: context.correlationId,
        context: { ...context },
        variables: { ...variables },
      },
    };

    this.requests.set(requestId, request);

    // ── Telemetry: APPROVAL_REQUESTED and APPROVAL_PENDING ──
    this.logger.info(`Approval request created for action ${toolId} in orchestration ${orchestrationId}`, {
      event: "APPROVAL_REQUESTED",
      requestId,
      orchestrationId,
      toolId,
    });

    this.logger.info(`Approval pending for request ${requestId}`, {
      event: "APPROVAL_PENDING",
      requestId,
      orchestrationId,
      status: "pending",
      expiresAt,
    });

    return request;
  }

  /**
   * Make a decision on a pending request.
   */
  decide(requestId: string, decision: ApprovalDecision): ApprovalRequest {
    const req = this.getRequest(requestId);
    if (!req) {
      throw new Error(`Approval request with ID "${requestId}" not found.`);
    }

    if (req.status !== "pending") {
      throw new Error(`Cannot decide on request "${requestId}" because it is already in state "${req.status}".`);
    }

    req.decision = decision;
    req.decidedAt = new Date().toISOString();

    if (decision.decision === "approved") {
      req.status = "approved";
      this.approvedActions.add(`${req.orchestrationId}:${req.targetResource}`);

      // ── Telemetry: APPROVAL_APPROVED ──
      this.logger.info(`Approval request ${requestId} approved by ${decision.approver}`, {
        event: "APPROVAL_APPROVED",
        requestId,
        orchestrationId: req.orchestrationId,
        approver: decision.approver,
        reason: decision.reason,
      });
    } else if (decision.decision === "rejected") {
      req.status = "rejected";

      // ── Telemetry: APPROVAL_REJECTED ──
      this.logger.info(`Approval request ${requestId} rejected by ${decision.approver}`, {
        event: "APPROVAL_REJECTED",
        requestId,
        orchestrationId: req.orchestrationId,
        approver: decision.approver,
        reason: decision.reason,
      });
    } else if (decision.decision === "escalated") {
      req.status = "escalated";

      // Telemetry: escalate event
      this.logger.warn(`Approval request ${requestId} escalated by ${decision.approver}`, {
        event: "APPROVAL_ESCALATED",
        requestId,
        orchestrationId: req.orchestrationId,
        approver: decision.approver,
      });
    }

    return req;
  }

  /**
   * Retrieves request, checking for expiration.
   */
  getRequest(requestId: string): ApprovalRequest | undefined {
    const req = this.requests.get(requestId);
    if (!req) return undefined;

    // Check expiration lazily
    if (req.status === "pending" && req.expiresAt && new Date(req.expiresAt).getTime() < Date.now()) {
      req.status = "expired";

      // ── Telemetry: APPROVAL_EXPIRED ──
      this.logger.warn(`Approval request ${requestId} has expired`, {
        event: "APPROVAL_EXPIRED",
        requestId,
        orchestrationId: req.orchestrationId,
      });

      if (req.config.autoRejectOnTimeout) {
        req.status = "rejected";
        this.logger.info(`Approval request ${requestId} auto-rejected on timeout`, {
          event: "APPROVAL_REJECTED",
          requestId,
          orchestrationId: req.orchestrationId,
          reason: "Auto-rejected on timeout",
        });
      }
    }

    return req;
  }

  isActionApproved(orchestrationId: string, toolId: string): boolean {
    return this.approvedActions.has(`${orchestrationId}:${toolId}`);
  }

  getRequests(): Map<string, ApprovalRequest> {
    // Force expiration check for all pending requests
    for (const id of this.requests.keys()) {
      this.getRequest(id);
    }
    return this.requests;
  }

  cancelRequest(requestId: string, reason?: string): void {
    const req = this.getRequest(requestId);
    if (req && req.status === "pending") {
      req.status = "cancelled";
      this.logger.info(`Approval request ${requestId} cancelled: ${reason || "none"}`, {
        event: "APPROVAL_CANCELLED",
        requestId,
        orchestrationId: req.orchestrationId,
      });
    }
  }
}
