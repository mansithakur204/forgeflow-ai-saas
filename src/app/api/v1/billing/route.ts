// GET /api/v1/billing
import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { authenticate } from "../_auth";

export async function GET(request: Request) {
  const auth = await authenticate(request, "billing:read");
  if (!auth.ok) return auth.response;

  const [subscription, usage, invoices] = await Promise.all([
    forgeFlowService.billingRepository.getSubscription(),
    forgeFlowService.billingRepository.getUsage(),
    forgeFlowService.billingRepository.getInvoices(),
  ]);

  return NextResponse.json({
    success: true,
    data: { subscription, usage, invoices },
    meta: { version: "v1" },
  });
}

export const dynamic = "force-dynamic";
