"use client";

import React, { useState } from "react";
import { useBilling } from "../hooks/useBilling";
import {
  CreditCard,
  RefreshCw,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  FileText,
  Download,
  Calendar,
  Sparkles,
  Zap,
  HardDrive,
  Users,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

export function BillingDashboard() {
  const { data, loading, error, changePlan, cancelSubscription } = useBilling();

  // Dialog status
  const [confirmPlan, setConfirmPlan] = useState<{
    planId: string;
    name: string;
    price: number;
    isUpgrade: boolean;
  } | null>(null);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<{ success: boolean; message: string } | null>(null);

  const showToast = (success: boolean, message: string) => {
    setToast({ success, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePlanChange = async () => {
    if (!confirmPlan) return;
    const { planId, isUpgrade } = confirmPlan;
    setConfirmPlan(null);

    setUpdating(true);
    const res = await changePlan(planId, isUpgrade);
    setUpdating(false);

    if (res.success) {
      showToast(true, `Subscription successfully updated!`);
    } else {
      showToast(false, res.error || "Subscription update failed.");
    }
  };

  const handleCancelSubscription = async () => {
    setConfirmCancel(false);
    setUpdating(true);
    const res = await cancelSubscription();
    setUpdating(false);

    if (res.success) {
      showToast(true, "Subscription canceled successfully.");
    } else {
      showToast(false, res.error || "Cancellation failed.");
    }
  };

  // Helper formatting routines
  const formatTokens = (num: number) => {
    if (num >= 100000000) return "Unlimited";
    return num.toLocaleString();
  };

  const formatStorage = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  const getPlanOrdinal = (planId: string): number => {
    const list = ["free", "pro", "team", "enterprise"];
    return list.indexOf(planId.toLowerCase());
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-6 animate-pulse max-w-screen-xl mx-auto">
        <div className="h-6 w-32 bg-border/40 rounded-xl" />
        <div className="h-24 bg-border/40 rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-border/40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto bg-rose-500/10 border border-rose-500/20 rounded-2xl shadow-sm text-center gap-4 mt-12">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-bold text-foreground">Billing Sync Failed</h2>
        <p className="text-sm text-muted-foreground">{error || "Failed to load subscription."}</p>
      </div>
    );
  }

  const { subscription, plans, usage, invoices } = data;
  const currentPlan = plans.find((p) => p.id === subscription.planId) || plans[0];

  // Calculate percentages
  const calcPercent = (used: number, limit: number) => {
    if (limit >= 100000000) return 0;
    const pct = (used / limit) * 100;
    return Math.min(Math.round(pct), 100);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto relative overflow-hidden">
      
      {/* Navigation Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
        <span className="hover:text-foreground cursor-pointer transition">Dashboard</span>
        <span>/</span>
        <span className="text-foreground">Billing</span>
      </nav>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Billing & Subscriptions
            {updating && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization plans, review usage limits, and view invoice history.
          </p>
        </div>
      </div>

      {/* Toast Alert popups */}
      {toast && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border leading-normal shadow-md animate-fade-in ${
            toast.success
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 border-rose-500/20"
          }`}
        >
          {toast.success ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      {/* ─── SECTION 1: CURRENT SUBSCRIPTION SUMMARY ─── */}
      <div className="bg-surface-card border border-border/40 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-4 items-center">
          <div className="p-3 bg-brand-500/10 text-brand-500 rounded-2xl border border-brand-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="text-xs text-muted-foreground leading-normal flex flex-col gap-0.5">
            <span className="text-sm font-extrabold text-foreground">
              Current Plan: <span className="text-brand-500 font-black">{currentPlan.name} Plan</span>
            </span>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="capitalize font-black text-foreground">
                Status: <span className={subscription.status === "active" || subscription.status === "trialing" ? "text-emerald-500" : "text-rose-500"}>{subscription.status}</span>
              </span>
              <span>•</span>
              {subscription.status === "trialing" ? (
                <span className="text-brand-500 font-bold">Trial ends on {new Date(subscription.trialEndsAt || "").toLocaleDateString()}</span>
              ) : (
                <span>Next Renewal: {new Date(subscription.renewalDate).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>

        {subscription.planId !== "free" && subscription.status !== "canceled" && (
          <button
            onClick={() => setConfirmCancel(true)}
            className="py-1.5 px-3 border border-rose-500/30 hover:border-rose-500/50 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 rounded-xl text-xs font-bold transition self-stretch md:self-auto text-center"
          >
            Cancel Subscription
          </button>
        )}
      </div>

      {/* ─── SECTION 2: USAGE PROGRESS LIMITS OVERVIEW ─── */}
      <div className="flex flex-col gap-4 text-xs">
        <h2 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-brand-500" /> Current Usage Limits
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Tokens Gauge */}
          <div className="bg-surface-card border border-border/40 p-4.5 rounded-3xl flex flex-col justify-between shadow-xs min-h-[105px]">
            <div className="flex justify-between items-center text-muted-foreground font-bold">
              <span>Token Consumption</span>
              <Sparkles className="w-4 h-4 text-brand-500" />
            </div>
            <div className="mt-2.5">
              <div className="flex justify-between font-black text-foreground text-sm">
                <span>{usage.tokensUsed.toLocaleString()}</span>
                <span className="text-muted-foreground text-xs font-normal">/ {formatTokens(currentPlan.limits.tokens)}</span>
              </div>
              <div className="w-full bg-border/20 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  style={{ width: `${calcPercent(usage.tokensUsed, currentPlan.limits.tokens)}%` }}
                  className="bg-brand-500 h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>
          </div>

          {/* Runs Gauge */}
          <div className="bg-surface-card border border-border/40 p-4.5 rounded-3xl flex flex-col justify-between shadow-xs min-h-[105px]">
            <div className="flex justify-between items-center text-muted-foreground font-bold">
              <span>Workflow Runs</span>
              <Zap className="w-4 h-4 text-brand-500" />
            </div>
            <div className="mt-2.5">
              <div className="flex justify-between font-black text-foreground text-sm">
                <span>{usage.workflowsRun.toLocaleString()}</span>
                <span className="text-muted-foreground text-xs font-normal">/ {formatTokens(currentPlan.limits.workflows)}</span>
              </div>
              <div className="w-full bg-border/20 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  style={{ width: `${calcPercent(usage.workflowsRun, currentPlan.limits.workflows)}%` }}
                  className="bg-brand-500 h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>
          </div>

          {/* Storage Gauge */}
          <div className="bg-surface-card border border-border/40 p-4.5 rounded-3xl flex flex-col justify-between shadow-xs min-h-[105px]">
            <div className="flex justify-between items-center text-muted-foreground font-bold">
              <span>Storage Allocated</span>
              <HardDrive className="w-4 h-4 text-brand-500" />
            </div>
            <div className="mt-2.5">
              <div className="flex justify-between font-black text-foreground text-sm">
                <span>{formatStorage(usage.storageMbUsed)}</span>
                <span className="text-muted-foreground text-xs font-normal">/ {formatStorage(currentPlan.limits.storageMb)}</span>
              </div>
              <div className="w-full bg-border/20 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  style={{ width: `${calcPercent(usage.storageMbUsed, currentPlan.limits.storageMb)}%` }}
                  className="bg-brand-500 h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>
          </div>

          {/* AI Credits Gauge */}
          <div className="bg-surface-card border border-border/40 p-4.5 rounded-3xl flex flex-col justify-between shadow-xs min-h-[105px]">
            <div className="flex justify-between items-center text-muted-foreground font-bold">
              <span>AI Core Credits</span>
              <Users className="w-4 h-4 text-brand-500" />
            </div>
            <div className="mt-2.5">
              <div className="flex justify-between font-black text-foreground text-sm">
                <span>{usage.aiCreditsUsed.toLocaleString()}</span>
                <span className="text-muted-foreground text-xs font-normal">/ {formatTokens(currentPlan.limits.aiCredits)}</span>
              </div>
              <div className="w-full bg-border/20 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  style={{ width: `${calcPercent(usage.aiCreditsUsed, currentPlan.limits.aiCredits)}%` }}
                  className="bg-brand-500 h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 3: SUBSCRIPTION PLANS MATRIX CARDS ─── */}
      <div className="flex flex-col gap-4 text-xs mt-2">
        <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Available Subscription tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === subscription.planId;
            const currentOrdinal = getPlanOrdinal(subscription.planId);
            const targetOrdinal = getPlanOrdinal(plan.id);
            const isUpgrade = targetOrdinal > currentOrdinal;

            return (
              <div
                key={plan.id}
                className={`bg-surface-card border rounded-3xl p-5 flex flex-col justify-between gap-5 relative shadow-xs ${
                  isCurrent ? "border-brand-500 shadow-sm" : "border-border/40"
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-3 right-3 bg-brand-500/10 border border-brand-500/30 text-brand-500 text-[9px] font-black uppercase px-2 py-0.5 rounded-full leading-none">
                    Active
                  </span>
                )}

                <div>
                  <h3 className="text-sm font-extrabold text-foreground">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-xl font-black text-foreground">${plan.priceMonthly}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">/ month</span>
                  </div>

                  <ul className="mt-4 flex flex-col gap-2 border-t border-border/10 pt-4 leading-normal text-muted-foreground font-medium">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex gap-2 items-center text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() =>
                    setConfirmPlan({
                      planId: plan.id,
                      name: plan.name,
                      price: plan.priceMonthly,
                      isUpgrade,
                    })
                  }
                  className={`w-full py-2 rounded-xl text-xs font-bold transition ${
                    isCurrent
                      ? "bg-border/20 border border-border/40 text-muted-foreground cursor-not-allowed"
                      : isUpgrade
                      ? "bg-brand-500 hover:bg-brand-600 text-white shadow-xs"
                      : "bg-background border border-border/60 hover:bg-border/10 text-foreground"
                  }`}
                >
                  {isCurrent ? "Current Plan" : isUpgrade ? "Upgrade Plan" : "Downgrade Plan"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION 4: INVOICES PAYMENT HISTORY ─── */}
      <div className="flex flex-col gap-4 text-xs mt-2">
        <h2 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-brand-500" /> Payment & Billing History
        </h2>

        <div className="bg-surface-card border border-border/40 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-border/10 border-b border-border/40 text-muted-foreground font-black text-[10px] uppercase tracking-wider">
                <th className="p-4 pl-6">Invoice ID</th>
                <th className="p-4">Billing Date</th>
                <th className="p-4">Paid Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                    No billing history transactions found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="text-muted-foreground font-medium hover:bg-border/5 transition">
                    <td className="p-4 pl-6 font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-muted-foreground" /> {inv.invoiceNumber}
                    </td>
                    <td className="p-4">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-foreground font-extrabold">${inv.amount.toFixed(2)}</td>
                    <td className="p-4">
                      <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] uppercase px-1.5 py-0.2 rounded font-black">
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <a
                        href={inv.pdfUrl}
                        download
                        className="py-1 px-2.5 bg-border/40 hover:bg-border/60 text-foreground border border-border/40 rounded-xl transition text-[11px] font-bold inline-flex items-center gap-1 leading-none cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade / Downgrade Confirm Dialog */}
      {confirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setConfirmPlan(null)} className="absolute inset-0 bg-black/45 backdrop-blur-xs" />

          <div className="relative w-full max-w-sm bg-background border border-border/40 rounded-3xl p-6 flex flex-col gap-4.5 z-10 shadow-2xl">
            <div className="flex items-center gap-2 text-brand-500 font-extrabold text-sm border-b border-border/20 pb-2">
              <ShieldCheck className="w-5 h-5 text-brand-500" />
              <span>Confirm Subscription Change</span>
            </div>

            <p className="text-xs text-muted-foreground leading-normal">
              You are about to {confirmPlan.isUpgrade ? "upgrade" : "downgrade"} your workspace subscription tier to the{" "}
              <span className="font-bold text-foreground">{confirmPlan.name} Plan</span>. This updates your usage limits immediately.
              {confirmPlan.price > 0 && confirmPlan.isUpgrade && (
                <span className="block mt-2.5 font-bold text-brand-500">
                  Your payment method will be charged ${confirmPlan.price}.00 immediately.
                </span>
              )}
            </p>

            <div className="flex gap-2 justify-end border-t border-border/20 pt-3.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setConfirmPlan(null)}
                className="px-3 py-1.5 bg-border/40 hover:bg-border/60 text-foreground border border-border/60 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePlanChange}
                className="px-4 py-1.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition shadow-xs"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Confirm Dialog */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setConfirmCancel(false)} className="absolute inset-0 bg-black/45 backdrop-blur-xs" />

          <div className="relative w-full max-w-sm bg-background border border-border/40 rounded-3xl p-6 flex flex-col gap-4.5 z-10 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-500 font-extrabold text-sm border-b border-border/20 pb-2">
              <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
              <span>Cancel Active Subscription</span>
            </div>

            <p className="text-xs text-muted-foreground leading-normal">
              Are you sure you want to cancel your active Pro/Team plan subscription? Your workspace will downgrade to the{" "}
              <span className="font-black text-rose-600">Free Tier limits</span> at the end of the current billing cycle.
            </p>

            <div className="flex gap-2 justify-end border-t border-border/20 pt-3.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="px-3 py-1.5 bg-border/40 hover:bg-border/60 text-foreground border border-border/60 rounded-xl transition"
              >
                Keep Plan
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                className="px-3.5 py-1.5 bg-rose-600 text-white border border-rose-700 rounded-xl hover:bg-rose-500 transition"
              >
                Cancel Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
