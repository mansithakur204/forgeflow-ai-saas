// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — LLM Generation Endpoint
// POST /api/llm
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { llmManager } from "@/lib/ai/manager";
import type { LlmRequest } from "@/lib/ai/provider.interface";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, model, prompt, systemPrompt, temperature, maxTokens, responseFormat, timeout, retryCount, retryDelay } = body;

    if (!prompt) {
      return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
    }

    // Resolve which provider to use. If model starts with 'gpt', infer OpenAI; if 'gemini', infer Gemini.
    let providerId = provider;
    if (!providerId) {
      if (model && model.toLowerCase().includes("gpt")) {
        providerId = "openai";
      } else if (model && model.toLowerCase().includes("gemini")) {
        providerId = "gemini";
      }
    }

    const req: LlmRequest = {
      model: model || "default",
      prompt,
      systemPrompt,
      temperature,
      maxTokens,
      responseFormat,
    };

    const response = await llmManager.execute(req, {
      provider: providerId,
      timeout,
      retryCount,
      retryDelay,
    });

    return NextResponse.json({
      success: true,
      provider: response.metrics.providerName,
      text: response.text,
      usage: response.usage,
      metrics: response.metrics,
      events: response.events,
      raw: response.raw,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      code: err.code || "UNKNOWN_ERROR",
      error: err.message || "An unexpected error occurred during model generation"
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
