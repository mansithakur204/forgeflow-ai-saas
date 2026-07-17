// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Billing & Subscription API Route Controller
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";

export async function GET() {
  try {
    const plans = await forgeFlowService.billingRepository.getPlans();
    const subscription = await forgeFlowService.billingRepository.getSubscription();
    const usage = await forgeFlowService.billingRepository.getUsage();
    const invoices = await forgeFlowService.billingRepository.getInvoices();

    return NextResponse.json({
      success: true,
      subscription,
      plans,
      usage,
      invoices,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, planId } = body;

    const plans = await forgeFlowService.billingRepository.getPlans();
    const subscription = await forgeFlowService.billingRepository.getSubscription();

    // ─── ACTION: UPGRADE / DOWNGRADE ───
    if (action === "upgrade" || action === "downgrade") {
      if (!planId) {
        return NextResponse.json({ success: false, error: "Target Plan ID is required" }, { status: 400 });
      }

      const targetPlan = plans.find((p) => p.id === planId);
      if (!targetPlan) {
        return NextResponse.json({ success: false, error: `Billing Plan "${planId}" not found` }, { status: 404 });
      }

      // Update subscription record
      subscription.planId = planId;
      subscription.status = "active";
      subscription.trialEndsAt = null;
      // Set renewal for next month
      subscription.renewalDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
      await forgeFlowService.billingRepository.saveSubscription(subscription);

      // Create new invoice for upgrading payment transaction if price is above zero
      if (targetPlan.priceMonthly > 0) {
        const newInvoice = {
          id: `inv-${Date.now()}`,
          invoiceNumber: `INV-226-${Math.floor(1000 + Math.random() * 9000)}`,
          amount: targetPlan.priceMonthly,
          status: "paid" as const,
          createdAt: new Date().toISOString(),
          pdfUrl: `/invoices/inv-${planId}.pdf`,
        };
        await forgeFlowService.billingRepository.addInvoice(newInvoice);
      }

      return NextResponse.json({
        success: true,
        message: `Subscription successfully updated to ${targetPlan.name} Plan.`,
      });
    }

    // ─── ACTION: CANCEL SUBSCRIPTION ───
    if (action === "cancel") {
      subscription.status = "canceled";
      await forgeFlowService.billingRepository.saveSubscription(subscription);

      return NextResponse.json({
        success: true,
        message: "Your subscription has been canceled. Your services will stop at the end of the billing period.",
      });
    }

    return NextResponse.json({ success: false, error: `Invalid action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
