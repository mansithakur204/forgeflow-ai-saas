// GET /api/v1/executions
import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { authenticate, paginationHeaders, PAGE_SIZE } from "../_auth";

export async function GET(request: Request) {
  const auth = await authenticate(request, "executions:read");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status     = searchParams.get("status") ?? "";
  const workflowId = searchParams.get("workflowId") ?? "";
  const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize   = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE), 10)));

  // Use the public getWorkflowRuns() accessor — workflowRuns is private
  let runs = forgeFlowService.executionHistory.getWorkflowRuns(workflowId || undefined);
  if (status) runs = runs.filter((r) => r.status === status);

  runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const total = runs.length;
  const data  = runs.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json(
    { success: true, data, meta: { version: "v1", total, page, pageSize, totalPages: Math.ceil(total / pageSize) } },
    { headers: paginationHeaders(total, page, pageSize) }
  );
}

export const dynamic = "force-dynamic";
