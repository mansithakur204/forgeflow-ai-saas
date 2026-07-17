// GET /api/v1/workflows — list workflows with auth, pagination, search, sort
import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { authenticate, apiResponse, paginationHeaders, PAGE_SIZE } from "../_auth";

export async function GET(request: Request) {
  const auth = await authenticate(request, "workflows:read");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search   = searchParams.get("search")?.toLowerCase() ?? "";
  const status   = searchParams.get("status") ?? "";
  const sortBy   = searchParams.get("sortBy") ?? "createdAt";
  const order    = searchParams.get("order") === "asc" ? 1 : -1;
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE), 10)));

  let items = [...forgeFlowService.workflows];
  if (search)  items = items.filter((w) => w.name.toLowerCase().includes(search) || (w.description ?? "").toLowerCase().includes(search));
  if (status)  items = items.filter((w) => w.status === status);
  items.sort((a: any, b: any) => {
    const av = a[sortBy] ?? ""; const bv = b[sortBy] ?? "";
    return av < bv ? -order : av > bv ? order : 0;
  });

  const total = items.length;
  const data  = items.slice((page - 1) * pageSize, page * pageSize).map(({ nodes: _n, connections: _c, ...rest }) => rest);

  return NextResponse.json(
    { success: true, data, meta: { version: "v1", total, page, pageSize, totalPages: Math.ceil(total / pageSize) } },
    { headers: paginationHeaders(total, page, pageSize) }
  );
}

export const dynamic = "force-dynamic";
