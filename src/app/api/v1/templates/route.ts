// GET /api/v1/templates
import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { authenticate, paginationHeaders, PAGE_SIZE } from "../_auth";

export async function GET(request: Request) {
  const auth = await authenticate(request, "templates:read");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search   = searchParams.get("search")?.toLowerCase() ?? "";
  const category = searchParams.get("category") ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE), 10)));

  let all = await forgeFlowService.templatesRepository.findAll();
  if (search)   all = all.filter((t) => t.name.toLowerCase().includes(search) || t.description.toLowerCase().includes(search));
  if (category) all = all.filter((t) => t.category === category);

  const total = all.length;
  const data  = all.slice((page - 1) * pageSize, page * pageSize).map(({ nodes: _n, connections: _c, ...rest }) => rest);

  return NextResponse.json(
    { success: true, data, meta: { version: "v1", total, page, pageSize, totalPages: Math.ceil(total / pageSize) } },
    { headers: paginationHeaders(total, page, pageSize) }
  );
}

export const dynamic = "force-dynamic";
