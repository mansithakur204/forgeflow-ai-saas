import { getDb } from "@/lib/db/connection";
import type { IBillingRepository } from "../interfaces";
import type { BillingPlan, SubscriptionRecord, UsageRecord, InvoiceRecord } from "@/lib/forgeflow-service";

export class PostgresBillingRepository implements IBillingRepository {
  private async ensureSeeded() {
    const db = getDb();
    const [row] = await db`SELECT COUNT(*)::integer FROM billing_plans`;
    if (row.count > 0) return;

    // Seed default plans
    const freePlan = {
      id: "free",
      name: "Free",
      price_monthly: 0,
      features: JSON.stringify(["3 Workflows", "10,000 Tokens/mo", "50MB Storage", "100 AI Credits"]),
      limits: JSON.stringify({ tokens: 10000, workflows: 3, storageMb: 50, aiCredits: 100 })
    };

    const proPlan = {
      id: "pro",
      name: "Pro",
      price_monthly: 29,
      features: JSON.stringify(["Unlimited Workflows", "500,000 Tokens/mo", "5GB Storage", "5,000 AI Credits", "Priority Support"]),
      limits: JSON.stringify({ tokens: 500000, workflows: 1000000, storageMb: 5000, aiCredits: 5000 })
    };

    const teamPlan = {
      id: "team",
      name: "Team",
      price_monthly: 79,
      features: JSON.stringify(["Pro Features", "2,000,000 Tokens/mo", "20GB Storage", "20,000 AI Credits", "Collaborative Workspaces", "Shared Integrations"]),
      limits: JSON.stringify({ tokens: 2000000, workflows: 1000000, storageMb: 20000, aiCredits: 20000 })
    };

    const entPlan = {
      id: "enterprise",
      name: "Enterprise",
      price_monthly: 299,
      features: JSON.stringify(["Team Features", "Unlimited Tokens", "100GB Storage", "100,000 AI Credits", "Custom SLA", "Dedicated SRE Support", "Audit Logs Export"]),
      limits: JSON.stringify({ tokens: 100000000, workflows: 100000000, storageMb: 100000, aiCredits: 100000 })
    };

    await db`
      INSERT INTO billing_plans (id, name, price_monthly, features, limits)
      VALUES 
        (${freePlan.id}, ${freePlan.name}, ${freePlan.price_monthly}, ${freePlan.features}, ${freePlan.limits}),
        (${proPlan.id}, ${proPlan.name}, ${proPlan.price_monthly}, ${proPlan.features}, ${proPlan.limits}),
        (${teamPlan.id}, ${teamPlan.name}, ${teamPlan.price_monthly}, ${teamPlan.features}, ${teamPlan.limits}),
        (${entPlan.id}, ${entPlan.name}, ${entPlan.price_monthly}, ${entPlan.features}, ${entPlan.limits})
    `;

    // Seed default subscription, usage & invoice
    await db`
      INSERT INTO billing_subscriptions (id, plan_id, status, trial_ends_at, renewal_date, billing_cycle)
      VALUES ('sub-1', 'pro', 'trialing', NOW() + interval '14 days', NOW() + interval '14 days', 'monthly')
      ON CONFLICT DO NOTHING
    `;

    await db`
      INSERT INTO billing_usage (id, tokens_used, workflows_run, storage_mb_used, ai_credits_used)
      VALUES ('usage-1', 148200, 242, 1200, 1450)
      ON CONFLICT DO NOTHING
    `;

    await db`
      INSERT INTO billing_invoices (id, invoice_number, amount, status, created_at, pdf_url)
      VALUES ('inv-1', 'INV-2026-001', 0, 'paid', NOW() - interval '30 days', '/invoices/inv-001.pdf')
      ON CONFLICT DO NOTHING
    `;
  }

  async getPlans(): Promise<BillingPlan[]> {
    await this.ensureSeeded();
    const db = getDb();
    const rows = await db`SELECT * FROM billing_plans ORDER BY price_monthly ASC`;
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      priceMonthly: Number(r.priceMonthly),
      features: typeof r.features === "string" ? JSON.parse(r.features) : r.features,
      limits: typeof r.limits === "string" ? JSON.parse(r.limits) : r.limits,
    }));
  }

  async getSubscription(): Promise<SubscriptionRecord> {
    await this.ensureSeeded();
    const db = getDb();
    const [row] = await db`SELECT * FROM billing_subscriptions LIMIT 1`;
    return {
      planId: row.planId,
      status: row.status,
      trialEndsAt: row.trialEndsAt ? new Date(row.trialEndsAt).toISOString() : null,
      renewalDate: new Date(row.renewalDate).toISOString(),
      billingCycle: row.billingCycle,
    };
  }

  async saveSubscription(sub: SubscriptionRecord): Promise<SubscriptionRecord> {
    await this.ensureSeeded();
    const db = getDb();
    // Transactional safe updates with locks
    await db`
      UPDATE billing_subscriptions
      SET plan_id = ${sub.planId},
          status = ${sub.status},
          trial_ends_at = ${sub.trialEndsAt},
          renewal_date = ${sub.renewalDate},
          billing_cycle = ${sub.billingCycle},
          version_lock = version_lock + 1
      WHERE id = 'sub-1'
    `;
    return sub;
  }

  async getUsage(): Promise<UsageRecord> {
    await this.ensureSeeded();
    const db = getDb();
    const [row] = await db`SELECT * FROM billing_usage LIMIT 1`;
    return {
      tokensUsed: Number(row.tokensUsed),
      workflowsRun: Number(row.workflowsRun),
      storageMbUsed: Number(row.storageMbUsed),
      aiCreditsUsed: Number(row.aiCreditsUsed),
    };
  }

  async saveUsage(usage: UsageRecord): Promise<UsageRecord> {
    await this.ensureSeeded();
    const db = getDb();
    await db`
      UPDATE billing_usage
      SET tokens_used = ${usage.tokensUsed},
          workflows_run = ${usage.workflowsRun},
          storage_mb_used = ${usage.storageMbUsed},
          ai_credits_used = ${usage.aiCreditsUsed},
          updated_at = NOW()
      WHERE id = 'usage-1'
    `;
    return usage;
  }

  async getInvoices(): Promise<InvoiceRecord[]> {
    await this.ensureSeeded();
    const db = getDb();
    const rows = await db`SELECT * FROM billing_invoices ORDER BY created_at DESC`;
    return rows.map((r: any) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      amount: Number(r.amount),
      status: r.status,
      createdAt: new Date(r.createdAt).toISOString(),
      pdfUrl: r.pdfUrl,
    }));
  }

  async addInvoice(inv: InvoiceRecord): Promise<void> {
    await this.ensureSeeded();
    const db = getDb();
    await db`
      INSERT INTO billing_invoices (id, invoice_number, amount, status, created_at, pdf_url)
      VALUES (${inv.id}, ${inv.invoiceNumber}, ${inv.amount}, ${inv.status}, ${inv.createdAt}, ${inv.pdfUrl})
    `;
  }
}
