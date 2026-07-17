// GET /api/v1/marketplace
import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { authenticate, paginationHeaders, PAGE_SIZE } from "../_auth";

export async function GET(request: Request) {
  const auth = await authenticate(request, "marketplace:read");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search   = searchParams.get("search")?.toLowerCase() ?? "";
  const category = searchParams.get("category") ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE), 10)));

  let all = await forgeFlowService.marketplaceRepository.findAll();
  if (search)   all = all.filter((e) => e.name.toLowerCase().includes(search) || e.description.toLowerCase().includes(search));
  if (category) all = all.filter((e) => e.category === category);

  const total = all.length;
  const data  = all.slice((page - 1) * pageSize, page * pageSize).map(({ nodes: _n, connections: _c, ...rest }) => rest);

  return NextResponse.json(
    { success: true, data, meta: { version: "v1", total, page, pageSize, totalPages: Math.ceil(total / pageSize) } },
    { headers: paginationHeaders(total, page, pageSize) }
  );
}

export const dynamic = "force-dynamic";
