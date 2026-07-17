// GET /api/v1/secrets — metadata only, values NEVER exposed
import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { authenticate, paginationHeaders, PAGE_SIZE } from "../_auth";

const MASK = "••••••••••••••••";

export async function GET(request: Request) {
  const auth = await authenticate(request, "secrets:read");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const folder   = searchParams.get("folder") ?? "";
  const type     = searchParams.get("type") ?? "";
  const archived = searchParams.get("archived") === "true";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE), 10)));

  let all = await forgeFlowService.secretsRepository.getAll();
  all = all.filter((s) => s.archived === archived);
  if (folder) all = all.filter((s) => s.folder === folder);
  if (type)   all = all.filter((s) => s.type === type);

  const total = all.length;
  const page_data = all.slice((page - 1) * pageSize, page * pageSize).map(({ value: _v, ...rest }) => ({ ...rest, value: MASK }));

  return NextResponse.json(
    { success: true, data: page_data, meta: { version: "v1", total, page, pageSize, totalPages: Math.ceil(total / pageSize) } },
    { headers: paginationHeaders(total, page, pageSize) }
  );
}

export const dynamic = "force-dynamic";
