// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Billing Management React Hook
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import type { BillingResponse } from "../types";

export function useBilling() {
  const [data, setData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/billing");
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.statusText}`);
      }
      const json: BillingResponse = await res.json();
      if (json.success) {
        setData(json);
        setError(null);
      } else {
        throw new Error(json.error || "Failed to retrieve billing parameters.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch billing info.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const changePlan = async (
    planId: string,
    isUpgrade: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const action = isUpgrade ? "upgrade" : "downgrade";
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, planId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchBilling();
        return { success: true };
      }
      return { success: false, error: json.error || "Plan update failed" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const cancelSubscription = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const json = await res.json();
      if (json.success) {
        fetchBilling();
        return { success: true };
      }
      return { success: false, error: json.error || "Subscription cancellation failed" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchBilling,
    changePlan,
    cancelSubscription,
  };
}
