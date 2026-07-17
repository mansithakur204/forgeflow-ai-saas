// GET /api/v1/integrations
import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { authenticate } from "../_auth";

export async function GET(request: Request) {
  const auth = await authenticate(request, "integrations:read");
  if (!auth.ok) return auth.response;

  const all = await forgeFlowService.integrationsRepository.findAll();
  // Strip raw encrypted secrets from public API response
  const data = all.map(({ encryptedSecrets: _s, ...rest }) => rest);

  return NextResponse.json({ success: true, data, meta: { version: "v1", total: data.length } });
}

export const dynamic = "force-dynamic";
