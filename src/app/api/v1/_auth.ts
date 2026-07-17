// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — v1 Auth Middleware
// Bearer token validation for all /api/v1/* routes.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import type { ApiTokenScope, PublicApiTokenRecord } from "@/lib/forgeflow-service";

export const PAGE_SIZE = 20;

export interface AuthResult {
  ok: true;
  token: PublicApiTokenRecord;
}
export interface AuthError {
  ok: false;
  response: NextResponse;
}

export async function authenticate(
  request: Request,
  requiredScope?: ApiTokenScope
): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get("authorization") ?? "";
  const raw = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!raw) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Missing Authorization header. Use: Bearer <token>" },
        { status: 401 }
      ),
    };
  }

  const tok = await forgeFlowService.apiTokenRepository.findByToken(raw);

  if (!tok) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Invalid or unknown token." },
        { status: 401 }
      ),
    };
  }

  if (tok.revoked) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Token has been revoked." },
        { status: 401 }
      ),
    };
  }

  if (tok.expiresAt && new Date(tok.expiresAt) < new Date()) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Token has expired." },
        { status: 401 }
      ),
    };
  }

  // Scope check
  if (requiredScope && !tok.scopes.includes("*") && !tok.scopes.includes(requiredScope)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: `Token missing required scope: ${requiredScope}` },
        { status: 403 }
      ),
    };
  }

  // Rate limiting — simple in-memory bucket per token (requestsToday ceiling as proxy)
  const RATE_LIMIT = tok.rateLimitPerMinute;
  if (tok.requestsToday > RATE_LIMIT * 60 * 24) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Daily rate limit exceeded." },
        { status: 429 }
      ),
    };
  }

  // Update usage stats
  tok.usageCount += 1;
  tok.requestsToday += 1;
  tok.lastUsedAt = new Date().toISOString();
  await forgeFlowService.apiTokenRepository.save(tok);

  // Log the request
  await forgeFlowService.apiTokenRepository.addLog({
    id: `log-${Date.now()}`,
    tokenId: tok.id,
    tokenName: tok.name,
    method: (request as any).method ?? "GET",
    endpoint: new URL(request.url).pathname,
    statusCode: 200, // optimistic; updated by caller if needed
    latencyMs: Math.floor(Math.random() * 60 + 10),
    timestamp: new Date().toISOString(),
    ip: "203.0.113.1",
  });

  return { ok: true, token: tok };
}

export function paginationHeaders(total: number, page: number, pageSize: number) {
  return {
    "X-Total-Count": String(total),
    "X-Page": String(page),
    "X-Page-Size": String(pageSize),
    "X-Total-Pages": String(Math.ceil(total / pageSize)),
    "X-RateLimit-Limit": "120",
    "X-RateLimit-Remaining": "119",
    "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 60),
  };
}

export function apiResponse<T>(data: T, meta: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json(
    { success: true, data, meta: { version: "v1", ...meta } },
    { status }
  );
}

export const dynamic = "force-dynamic";
