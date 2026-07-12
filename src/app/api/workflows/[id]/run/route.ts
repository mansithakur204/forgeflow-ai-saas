// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Run Endpoint
// POST /api/workflows/[id]/run
// Simulates a workflow execution and records it to the execution history.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import type { RunStatus } from "@/lib/execution-history";

interface RunRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RunRouteContext) {
  try {
    const { id } = await params;
    const workflow = forgeFlowService.workflows.find((w) => w.id === id);
    if (!workflow) {
      return NextResponse.json(
        { success: false, error: "Workflow not found" },
        { status: 404 }
      );
    }

    const startedAt = new Date().toISOString();
    const executedNodes = (workflow.nodes ?? []).map((n) => n.id);

    // Simulate execution: randomly complete or fail for demo purposes
    // In production this would invoke the real WorkflowRunner
    const rand = Math.random();
    const status: RunStatus = rand < 0.85 ? "completed" : "failed";
    const durationMs = Math.floor(800 + Math.random() * 4200); // 0.8–5s simulated
    const finishedAt = new Date(Date.now() + durationMs).toISOString();

    const record = forgeFlowService.executionHistory.recordWorkflowRun({
      workflowId: id,
      workflowName: workflow.name,
      status,
      durationMs,
      startedAt,
      finishedAt,
      executedNodes,
      errorMessage:
        status === "failed"
          ? "Simulated execution failure: upstream service unavailable"
          : null,
    });

    // Update runCount and lastRun on the workflow
    const idx = forgeFlowService.workflows.findIndex((w) => w.id === id);
    if (idx > -1) {
      forgeFlowService.workflows[idx].runCount =
        (forgeFlowService.workflows[idx].runCount ?? 0) + 1;
      forgeFlowService.workflows[idx].lastRun = finishedAt;
    }

    return NextResponse.json({
      success: true,
      run: {
        id: record.id,
        workflowId: id,
        status: record.status,
        durationMs: record.durationMs,
        startedAt: record.startedAt,
        finishedAt: record.finishedAt,
        executedNodes: record.executedNodes,
        errorMessage: record.errorMessage,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}

export const dynamic = "force-dynamic";
