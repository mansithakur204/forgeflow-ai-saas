// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Agent Run Endpoint
// POST /api/agents/[id]/run
// Records an agent execution event into the execution history store.
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
    const body = await request.json().catch(() => ({}));
    const { objective = "Execute assigned task" } = body as { objective?: string };

    // Look up the agent in the registry
    const agent = (forgeFlowService.agentRegistry.list() as any[]).find(
      (a: { id: string }) => a.id === id
    );
    const agentName =
      (agent as any)?.config?.metadata?.name ??
      (agent as any)?.metadata?.name ??
      `Agent ${id}`;

    const startedAt = new Date().toISOString();

    // Simulate agent execution (real implementation would call AgentRuntime)
    const rand = Math.random();
    const status: RunStatus = rand < 0.88 ? "completed" : "failed";
    const durationMs = Math.floor(500 + Math.random() * 3000);
    const finishedAt = new Date(Date.now() + durationMs).toISOString();

    const toolsUsed = ["file-tool", "http-tool"].slice(
      0,
      Math.ceil(Math.random() * 2)
    );
    const memoryAccessed = rand < 0.5 ? ["working", "semantic"] : ["working"];
    const outputSummary =
      status === "completed"
        ? `Task completed successfully in ${(durationMs / 1000).toFixed(1)}s`
        : "Task failed due to internal error";

    const record = forgeFlowService.executionHistory.recordAgentRun({
      agentId: id,
      agentName,
      objective,
      status,
      durationMs,
      startedAt,
      finishedAt,
      toolsUsed,
      memoryAccessed,
      outputSummary,
      errorMessage:
        status === "failed" ? "Simulated agent execution error" : null,
    });

    return NextResponse.json({
      success: true,
      run: {
        id: record.id,
        agentId: id,
        agentName: record.agentName,
        status: record.status,
        durationMs: record.durationMs,
        startedAt: record.startedAt,
        finishedAt: record.finishedAt,
        outputSummary: record.outputSummary,
        toolsUsed: record.toolsUsed,
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
