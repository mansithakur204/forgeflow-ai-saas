// GET /api/v1/workflows/:id
import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { authenticate } from "../../_auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request, "workflows:read");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const workflow = forgeFlowService.workflows.find((w) => w.id === id);
  if (!workflow) {
    return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: workflow,
    meta: { version: "v1" },
  });
}

export const dynamic = "force-dynamic";
