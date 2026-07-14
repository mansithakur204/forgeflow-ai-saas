// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Reviewer Agent
// Implements Plan Validation, Execution checks, and Quality Gates approvals.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAgent } from "../base-agent";
import type { AgentStatus, AgentRole } from "../../types/agent";
import type { AgentSession } from "../../types/session";
import type {
  ReviewerConfiguration,
  ReviewerContext,
  ReviewResult,
  ReviewStatus,
} from "../../types/reviewer";
import type { ExecutionPlan } from "../../types/planning";

export class ReviewerAgent extends BaseAgent {
  private configOverride: ReviewerConfiguration = {};

  constructor() {
    super({
      id: "reviewer-agent",
      metadata: {
        id: "reviewer-agent",
        name: "Reviewer Agent",
        description: "Specialized agent for validating execution plans, outcomes, and RAG quality gates.",
        version: "2.0.0",
        author: "ForgeFlow AI",
      },
      capabilities: {
        canPlan: true,
        canExecute: false,
        canSearchCode: false,
        canEditCode: false,
        canAccessMemory: true,
        canUseTools: false,
      },
      role: "reviewer" as AgentRole,
    });
  }

  setConfiguration(config: ReviewerConfiguration): void {
    this.configOverride = {
      minQualityScore: 0.8,
      requireHumanApprovalThreshold: 0.7,
      strictDependencyValidation: true,
      ...config,
    };
  }

  async executeStep(session: AgentSession, input: string) {
    const logger: any = session.context.variables.logger || console;
    const agentId = this.getConfig().id;
    const startedAt = Date.now();

    // ── Telemetry: Emit REVIEW_STARTED ──
    logger.info(`Reviewer agent started execution`, { event: "REVIEW_STARTED" }, agentId);

    // 1. Resolve Target Context from input payload
    let targetType: "plan" | "execution" = "plan";
    let targetId = `target-${Date.now()}`;
    let targetPlan: ExecutionPlan | undefined;
    let targetExecutionLogs: any[] = [];
    let targetCitations: any[] = [];

    try {
      const parsed = JSON.parse(input);
      if (parsed.planId || parsed.tasks) {
        targetType = "plan";
        targetId = parsed.planId || parsed.id || targetId;
        targetPlan = parsed;
      } else if (parsed.logs || parsed.outputs) {
        targetType = "execution";
        targetId = parsed.sessionId || targetId;
        targetExecutionLogs = parsed.logs || [];
        targetCitations = parsed.citations || [];
      }
    } catch (e) {
      // Fallback: assume input is a plan description text and check session variables
      if (session.context.variables.targetPlan) {
        targetType = "plan";
        targetPlan = session.context.variables.targetPlan as ExecutionPlan;
        targetId = targetPlan.id;
      } else if (session.context.variables.executionLogs) {
        targetType = "execution";
        targetExecutionLogs = session.context.variables.executionLogs as any[];
        targetId = String(session.context.variables.sessionId || targetId);
      }
    }

    const context: ReviewerContext = {
      targetId,
      type: targetType,
      status: (targetType === "plan" ? "validating_plan" : "validating_execution") as ReviewStatus,
      variables: { ...session.context.variables },
    };

    const warnings: string[] = [];
    const recommendations: string[] = [];
    let qualityScore = 1.0;
    let confidence = 0.95;

    // 2. Perform validations based on target type
    if (targetType === "plan" && targetPlan) {
      // ── Task 14.6B: Plan Validation & Telemetry: Emit PLAN_VALIDATED ──
      logger.info(`Validating execution plan DAG`, { event: "PLAN_VALIDATED", targetId }, agentId);

      const tasks = targetPlan.tasks || [];
      if (tasks.length === 0) {
        warnings.push("Execution plan is empty and contains no runnable tasks.");
        qualityScore -= 0.5;
      }

      // Check circular dependencies
      const taskIds = new Set(tasks.map(t => t.id));
      const adjacency = new Map<string, Set<string>>();
      const inDegree = new Map<string, number>();

      for (const task of tasks) {
        adjacency.set(task.id, new Set());
        inDegree.set(task.id, 0);
      }

      for (const task of tasks) {
        for (const dep of task.dependencies) {
          if (!taskIds.has(dep)) {
            warnings.push(`Missing dependency reference: Task "${task.id}" depends on non-existent task "${dep}".`);
            qualityScore -= 0.2;
          } else {
            adjacency.get(dep)!.add(task.id);
            inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
          }
        }
      }

      // Kahn's algorithm cycle check
      const queue: string[] = [];
      for (const [tid, deg] of inDegree.entries()) {
        if (deg === 0) queue.push(tid);
      }

      let visited = 0;
      while (queue.length > 0) {
        const curr = queue.shift()!;
        visited++;
        for (const neighbor of adjacency.get(curr) || []) {
          const deg = inDegree.get(neighbor)! - 1;
          inDegree.set(neighbor, deg);
          if (deg === 0) queue.push(neighbor);
        }
      }

      if (visited !== tasks.length) {
        warnings.push("Circular dependencies detected inside the execution plan graph.");
        qualityScore = 0.0; // Fail plan immediately
      }

      recommendations.push("Ensure task outputs correctly map to dependent task inputs.");

    } else {
      // ── Task 14.6C: Execution Validation & Telemetry: Emit EXECUTION_VALIDATED ──
      logger.info(`Validating tool execution outcomes`, { event: "EXECUTION_VALIDATED", targetId }, agentId);

      if (targetExecutionLogs.length === 0) {
        warnings.push("No execution logs found for validation.");
        qualityScore -= 0.1;
      }

      let failuresCount = 0;
      let timeoutsCount = 0;
      let totalRetries = 0;

      for (const log of targetExecutionLogs) {
        if (log.status === "failed") {
          failuresCount++;
          qualityScore -= 0.3;
        }
        if (log.error && log.error.toLowerCase().includes("timeout")) {
          timeoutsCount++;
          qualityScore -= 0.2;
        }
        if (log.retries && log.retries > 0) {
          totalRetries += log.retries;
          qualityScore -= 0.05 * log.retries;
        }
      }

      if (failuresCount > 0) {
        warnings.push(`Detected ${failuresCount} failed node execution(s) in logs.`);
        recommendations.push("Inspect tool configs and endpoints. Recommend rerunning plan with retry mapping.");
      }
      if (timeoutsCount > 0) {
        warnings.push(`Detected ${timeoutsCount} timeout abort(s) in logs.`);
        recommendations.push("Increase timeout limits in agent configurations.");
      }

      // ── Task 14.6D: Knowledge & Memory Validation ──
      if (targetCitations.length > 0) {
        let lowConfidenceCount = 0;
        for (const citation of targetCitations) {
          if (citation.score && citation.score < 0.6) {
            lowConfidenceCount++;
          }
        }
        if (lowConfidenceCount > 0) {
          warnings.push(`Detected ${lowConfidenceCount} low confidence RAG citation source(s).`);
          qualityScore -= 0.1;
          recommendations.push("Update knowledge base documents to improve RAG retrieval matching scores.");
        }
      }
    }

    // Ensure quality score boundaries
    qualityScore = Math.max(0.0, Number(qualityScore.toFixed(2)));

    // 3. Quality Gate Threshold Checks (Task 14.6E)
    context.status = "checking_quality";

    let approvalStatus: "approved" | "warning" | "rejected" = "approved";
    let retryRecommendation = false;
    let humanApprovalRequired = false;

    const minScore = this.configOverride.minQualityScore ?? 0.8;
    const humanThreshold = this.configOverride.requireHumanApprovalThreshold ?? 0.7;

    if (qualityScore < minScore) {
      if (qualityScore >= humanThreshold) {
        approvalStatus = "warning";
        retryRecommendation = true;
      } else {
        approvalStatus = "rejected";
        retryRecommendation = false;
      }
    }

    // If warnings list contains circular dependencies or severe errors, force reject
    if (warnings.some(w => w.includes("Circular") || w.includes("empty"))) {
      approvalStatus = "rejected";
      retryRecommendation = false;
    }

    // Human in the loop trigger condition (Task 14.6H Future Compatibility)
    if (approvalStatus === "warning" || qualityScore < 0.5) {
      humanApprovalRequired = true;
      recommendations.push("Requires manual human verification before deployment.");
    }

    // Telemetry: Emit QUALITY_GATE_COMPLETED
    logger.info(`Quality gate processing completed`, {
      event: "QUALITY_GATE_COMPLETED",
      targetId,
      qualityScore,
      approvalStatus,
      humanApprovalRequired,
    }, agentId);

    context.status = "completed";

    // ── Telemetry: Emit REVIEW_COMPLETED ──
    const durationMs = Date.now() - startedAt;
    logger.info(`Reviewer agent finished execution`, { event: "REVIEW_COMPLETED", durationMs }, agentId);

    const reviewResult: ReviewResult = {
      targetId,
      type: targetType,
      approvalStatus,
      retryRecommendation,
      humanApprovalRequired,
      qualityScore,
      confidence,
      warnings,
      recommendations,
      success: true,
    };

    return {
      output: `Review completed. Target ID: ${targetId}. Status: ${approvalStatus.toUpperCase()}. Quality Score: ${qualityScore}.`,
      newStatus: "completed" as AgentStatus,
      metadata: {
        reviewResult,
        reviewerContext: context,
      },
    };
  }
}
