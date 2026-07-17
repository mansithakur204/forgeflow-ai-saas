// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Billing Dashboard Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BillingPlan {
  id: string;
  name: string;
  priceMonthly: number;
  features: string[];
  limits: {
    tokens: number;
    workflows: number;
    storageMb: number;
    aiCredits: number;
  };
}

export interface SubscriptionRecord {
  planId: string;
  status: "active" | "trialing" | "canceled" | "past_due";
  trialEndsAt: string | null;
  renewalDate: string;
  billingCycle: "monthly" | "yearly";
}

export interface UsageRecord {
  tokensUsed: number;
  workflowsRun: number;
  storageMbUsed: number;
  aiCreditsUsed: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: "paid" | "open" | "uncollectible";
  createdAt: string;
  pdfUrl: string;
}

export interface BillingResponse {
  success: boolean;
  subscription: SubscriptionRecord;
  plans: BillingPlan[];
  usage: UsageRecord;
  invoices: InvoiceRecord[];
  error?: string;
}
