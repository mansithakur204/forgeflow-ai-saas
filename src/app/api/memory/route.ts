import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";

export async function GET() {
  try {
    const provider = forgeFlowService.memorySystem.getProvider();
    const stats = await provider.getStats();
    const entries = await provider.listEntries();

    return NextResponse.json({
      success: true,
      stats,
      entries,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await forgeFlowService.memorySystem.getProvider().clear();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
