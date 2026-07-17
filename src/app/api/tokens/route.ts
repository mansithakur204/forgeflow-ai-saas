// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Internal PAT Management API
// Used by the /dashboard/api frontend to create, list, and revoke tokens.
// This route is internal (dashboard-only) and does NOT use Bearer auth.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import type { ApiTokenScope } from "@/lib/forgeflow-service";

const ALL_SCOPES: ApiTokenScope[] = [
  "workflows:read", "workflows:write", "executions:read",
  "secrets:read", "integrations:read", "templates:read",
  "marketplace:read", "billing:read", "organizations:read", "*",
];

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "ff_live_pk_";
  for (let i = 0; i < 32; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

// ── GET — list all tokens (token strings masked after creation) ───────────────
export async function GET() {
  const tokens = await forgeFlowService.apiTokenRepository.getAll();
  const logs   = await forgeFlowService.apiTokenRepository.getLogs();

  // Aggregate usage stats
  const endpointStats: Record<string, { count: number; errors: number; avgLatency: number }> = {};
  for (const log of logs) {
    if (!endpointStats[log.endpoint]) endpointStats[log.endpoint] = { count: 0, errors: 0, avgLatency: 0 };
    endpointStats[log.endpoint].count += 1;
    if (log.statusCode >= 400) endpointStats[log.endpoint].errors += 1;
    endpointStats[log.endpoint].avgLatency += log.latencyMs;
  }
  for (const k of Object.keys(endpointStats)) {
    endpointStats[k].avgLatency = Math.round(endpointStats[k].avgLatency / endpointStats[k].count);
  }

  // Masked token list (never expose full token value after creation)
  const maskedTokens = tokens.map((t) => ({
    ...t,
    token: t.token.slice(0, 14) + "••••••••••••••••••••" + t.token.slice(-4),
  }));

  return NextResponse.json({
    success: true,
    tokens: maskedTokens,
    logs: logs.slice(0, 100),
    stats: {
      totalTokens: tokens.length,
      activeTokens: tokens.filter((t) => !t.revoked).length,
      totalRequests: logs.length,
      requestsToday: tokens.reduce((s, t) => s + t.requestsToday, 0),
      endpointStats,
    },
    scopes: ALL_SCOPES,
  });
}

// ── POST — create / revoke ────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, tokenId, name, scopes, expiresAt, rateLimitPerMinute } = body;

    // ── CREATE ──────────────────────────────────────────────────────────────
    if (action === "create") {
      if (!name?.trim()) return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });

      const validScopes: ApiTokenScope[] = (scopes ?? ["*"]).filter((s: string) => ALL_SCOPES.includes(s as ApiTokenScope));
      if (validScopes.length === 0) return NextResponse.json({ success: false, error: "At least one valid scope is required" }, { status: 400 });

      const rawToken = generateToken();
      const now = new Date().toISOString();

      const tok = {
        id: `tok-${Date.now()}`,
        name: name.trim(),
        token: rawToken, // stored plain (would be hashed in prod)
        scopes: validScopes,
        createdAt: now,
        expiresAt: expiresAt || null,
        lastUsedAt: null,
        revoked: false,
        usageCount: 0,
        requestsToday: 0,
        rateLimitPerMinute: rateLimitPerMinute || 60,
      };

      await forgeFlowService.apiTokenRepository.save(tok);

      // Return the full token ONCE (never shown again)
      return NextResponse.json({ success: true, token: tok, message: "Store this token securely — it won't be shown again." }, { status: 201 });
    }

    // ── REVOKE ───────────────────────────────────────────────────────────────
    if (action === "revoke") {
      if (!tokenId) return NextResponse.json({ success: false, error: "tokenId is required" }, { status: 400 });
      const tok = await forgeFlowService.apiTokenRepository.findById(tokenId);
      if (!tok) return NextResponse.json({ success: false, error: "Token not found" }, { status: 404 });
      tok.revoked = true;
      await forgeFlowService.apiTokenRepository.save(tok);
      return NextResponse.json({ success: true, message: `Token "${tok.name}" revoked.` });
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (action === "delete") {
      if (!tokenId) return NextResponse.json({ success: false, error: "tokenId is required" }, { status: 400 });
      const tok = await forgeFlowService.apiTokenRepository.findById(tokenId);
      if (!tok) return NextResponse.json({ success: false, error: "Token not found" }, { status: 404 });
      await forgeFlowService.apiTokenRepository.delete(tokenId);
      return NextResponse.json({ success: true, message: `Token "${tok.name}" deleted.` });
    }

    return NextResponse.json({ success: false, error: `Unknown action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
