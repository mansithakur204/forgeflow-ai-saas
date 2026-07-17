// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Pipelines Dashboard API Route
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";

// Seeding helper to populate real database queue with test jobs if empty
function seedInitialData() {
  if (forgeFlowService.queueManager.getJobs().length > 0) return;

  // Run 1: Completed
  const job1 = forgeFlowService.queueManager.enqueue(
    "planner-agent",
    "Identify if company size > 500. Route to enterprise sales.",
    "high"
  );
  forgeFlowService.queueManager.startExecution(job1.id);
  forgeFlowService.queueManager.completeExecution(job1.id, { result: "Enterprise Route approved." });
  job1.createdAt = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
  job1.startedAt = new Date(Date.now() - 4 * 3600 * 1000 + 1000).toISOString();
  job1.completedAt = new Date(Date.now() - 4 * 3600 * 1000 + 4500).toISOString();
  job1.variables = { workflowId: "wf-demo", workflowName: "Lead Qualification AI" };

  // Run 2: Failed
  const job2 = forgeFlowService.queueManager.enqueue(
    "tool-agent",
    "OCR extract vendor invoices.",
    "medium"
  );
  forgeFlowService.queueManager.startExecution(job2.id);
  forgeFlowService.queueManager.failExecution(job2.id, "Upstream database connection timeout after 3 retries.");
  job2.createdAt = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  job2.startedAt = new Date(Date.now() - 2 * 3600 * 1000 + 2000).toISOString();
  job2.completedAt = new Date(Date.now() - 2 * 3600 * 1000 + 8200).toISOString();
  job2.variables = { workflowId: "wf-002", workflowName: "Invoice Processing Suite" };

  // Run 3: Cancelled
  const job3 = forgeFlowService.queueManager.enqueue(
    "planner-agent",
    "Enrich contact records from Clearbit.",
    "low"
  );
  forgeFlowService.queueManager.startExecution(job3.id);
  forgeFlowService.queueManager.cancelExecution(job3.id);
  job3.createdAt = new Date(Date.now() - 1.5 * 3600 * 1000).toISOString();
  job3.startedAt = new Date(Date.now() - 1.5 * 3600 * 1000 + 1500).toISOString();
  job3.completedAt = new Date(Date.now() - 1.5 * 3600 * 1000 + 2200).toISOString();
  job3.variables = { workflowId: "wf-006", workflowName: "Data Enrichment Pipeline" };

  // Run 4: Queued (Waiting)
  const job4 = forgeFlowService.queueManager.enqueue(
    "planner-agent",
    "Daily Support summary compile.",
    "medium"
  );
  job4.createdAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  job4.variables = { workflowId: "wf-003", workflowName: "Customer Support Triage" };

  // Run 5: Running (Active)
  const job5 = forgeFlowService.queueManager.enqueue(
    "research-agent",
    "Researching competitors pricing models.",
    "high"
  );
  forgeFlowService.queueManager.startExecution(job5.id);
  job5.createdAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  job5.startedAt = new Date(Date.now() - 5 * 60 * 1000 + 500).toISOString();
  job5.variables = { workflowId: "wf-demo", workflowName: "Lead Qualification AI" };

  const context = {
    orchestrationId: `orch-seeded-${Date.now()}`,
    correlationId: `corr-seeded-${Date.now()}`,
    currentState: "researching",
    currentAgentId: "research-agent",
    progress: 45,
    executionTimeMs: 12500,
    currentStepIndex: 2,
    totalSteps: 5,
    sharedVariables: {},
    sharedMetadata: { goal: job5.input, jobId: job5.id },
  };
  forgeFlowService.orchestrator.activeContexts.set(context.orchestrationId, context as any);
}

export async function GET(request: Request) {
  try {
    seedInitialData();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const status = searchParams.get("status") || "";
    const agentId = searchParams.get("agentId") || "";
    const sortBy = searchParams.get("sortBy") || "startedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const jobs = forgeFlowService.queueManager.getJobs();
    
    // Sort queued list to figure out queue positions
    const queuedJobs = [...jobs]
      .filter((j) => j.status === "queued")
      .sort((a, b) => {
        const weights = { critical: 4, high: 3, medium: 2, low: 1 };
        const diff = weights[b.priority] - weights[a.priority];
        if (diff !== 0) return diff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    // Map each job record
    let items = jobs.map((job) => {
      const activeContext = Array.from(forgeFlowService.orchestrator.activeContexts.values())
        .find((ctx) => ctx.sharedMetadata?.jobId === job.id);

      const workflowId = String(job.variables?.workflowId || "wf-demo");
      const workflowName = String(job.variables?.workflowName || "Lead Qualification AI");

      let durationMs: number | null = null;
      if (job.startedAt) {
        const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
        durationMs = end - new Date(job.startedAt).getTime();
      }

      let activeAgent = job.agentId;
      let currentNode: string = job.status;
      let progress = 0;

      if (activeContext) {
        activeAgent = activeContext.currentAgentId || activeAgent;
        currentNode = activeContext.currentState || currentNode;
        progress = activeContext.progress || progress;
      } else if (job.status === "completed") {
        activeAgent = "reviewer-agent";
        currentNode = "completed";
        progress = 100;
      } else if (job.status === "failed") {
        currentNode = "failed";
        progress = 100;
      } else if (job.status === "cancelled") {
        currentNode = "cancelled";
        progress = 100;
      }

      const qPos = job.status === "queued" ? queuedJobs.findIndex((q) => q.id === job.id) + 1 : 0;

      return {
        id: job.id,
        workflowId,
        workflowName,
        status: job.status,
        startedAt: job.startedAt || job.createdAt,
        finishedAt: job.completedAt || null,
        durationMs,
        queuePosition: qPos,
        retryCount: job.retriesAttempted,
        maxRetries: job.maxRetries,
        activeAgent,
        currentNode,
        progress,
        input: job.input,
        error: job.error,
      };
    });

    // Apply Search
    if (search) {
      items = items.filter(
        (item) =>
          item.id.toLowerCase().includes(search) ||
          item.workflowName.toLowerCase().includes(search) ||
          item.input.toLowerCase().includes(search) ||
          item.activeAgent.toLowerCase().includes(search)
      );
    }

    // Apply Status Filter
    if (status) {
      items = items.filter((item) => item.status === status);
    }

    // Apply Agent Filter
    if (agentId) {
      items = items.filter((item) => item.activeAgent === agentId);
    }

    // Apply Sorting
    items.sort((a: any, b: any) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === "startedAt") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Pagination bounds
    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    // Calculate aggregated status counters for metrics grid
    const running = jobs.filter((j) => j.status === "running").length;
    const queued = jobs.filter((j) => j.status === "queued").length;
    const completed = jobs.filter((j) => j.status === "completed").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const cancelled = jobs.filter((j) => j.status === "cancelled").length;

    return NextResponse.json({
      success: true,
      pipelines: paginatedItems,
      metrics: {
        running,
        queued,
        completed,
        failed,
        cancelled,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action, jobId } = await request.json();
    if (!jobId) {
      return NextResponse.json({ success: false, error: "Missing Job ID parameter" }, { status: 400 });
    }

    const jobs = forgeFlowService.queueManager.getJobs();
    const targetJob = jobs.find((j) => j.id === jobId);

    if (action === "cancel") {
      forgeFlowService.queueManager.cancelExecution(jobId);
      // If active context matches, cancel on orchestrator
      const activeCtx = Array.from(forgeFlowService.orchestrator.activeContexts.values())
        .find((ctx) => ctx.sharedMetadata?.jobId === jobId);
      if (activeCtx && forgeFlowService.orchestrator.getContext()?.orchestrationId === activeCtx.orchestrationId) {
        forgeFlowService.orchestrator.cancel();
      }
      return NextResponse.json({ success: true, message: "Pipeline cancelled successfully" });
    }

    if (action === "retry") {
      if (!targetJob) {
        return NextResponse.json({ success: false, error: "Target pipeline not found" }, { status: 404 });
      }
      // Re-trigger the orchestrator running sequence
      const runRes = await forgeFlowService.orchestrator.start(targetJob.input);
      // Link the new run variables back to workflow configuration
      const newJobId = runRes.orchestrationId;
      return NextResponse.json({
        success: true,
        message: "Pipeline retry triggered successfully",
        newJobId,
      });
    }

    if (action === "replay") {
      if (!targetJob) {
        return NextResponse.json({ success: false, error: "Target pipeline not found" }, { status: 404 });
      }
      const runRes = await forgeFlowService.orchestrator.start(targetJob.input);
      return NextResponse.json({
        success: true,
        message: "Pipeline replay triggered successfully",
        newJobId: runRes.orchestrationId,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}

export const dynamic = "force-dynamic";
