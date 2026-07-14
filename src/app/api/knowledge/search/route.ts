// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — RAG / Knowledge Search API Route
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { queryText, collection, limit, minScore, metric } = body;

    if (!queryText) {
      return NextResponse.json({ success: false, error: "Query text is required" }, { status: 400 });
    }

    const results = await forgeFlowService.retrievalPipeline.queryRAG(queryText, {
      collection: collection || undefined,
      limit: limit ?? 5,
      minScore: minScore ?? 0.0,
      metric: metric ?? "cosine",
    });

    return NextResponse.json({
      success: true,
      answer: results.answer,
      citations: results.citations,
      diagnostics: results.diagnostics,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
