import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";

export async function GET() {
  return NextResponse.json(forgeFlowService.workflows);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, status, nodes, connections, runCount, lastRun, tags } = body;
    
    // Resolve dynamic ID for new workflows
    const targetId = (!id || id === "new") ? `wf-${Date.now()}` : id;
    const existingIdx = forgeFlowService.workflows.findIndex((w) => w.id === targetId);
    
    const existing = existingIdx > -1 ? forgeFlowService.workflows[existingIdx] : null;

    const updatedWorkflow = {
      id: targetId,
      name: name || "Untitled Workflow",
      description: description || (existing ? existing.description : ""),
      status: status || (existing ? existing.status : "draft"),
      nodeCount: nodes ? nodes.length : (existing ? existing.nodeCount : 0),
      runCount: runCount || (existing ? existing.runCount : 0),
      lastRun: lastRun || (existing ? existing.lastRun : null),
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      tags: tags || (existing ? existing.tags : []),
      nodes: nodes || (existing ? existing.nodes : undefined),
      connections: connections || (existing ? existing.connections : undefined),
    };

    if (existingIdx > -1) {
      forgeFlowService.workflows[existingIdx] = updatedWorkflow;
    } else {
      forgeFlowService.workflows.push(updatedWorkflow);
    }
    return NextResponse.json({ success: true, workflow: updatedWorkflow });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing workflow ID" }, { status: 400 });
    }
    const idx = forgeFlowService.workflows.findIndex((w) => w.id === id);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 });
    }
    forgeFlowService.workflows.splice(idx, 1);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
