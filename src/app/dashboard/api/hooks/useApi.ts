// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — API Dashboard Data Hook
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import type { ApiDashboardData, ApiTokenScope } from "../types";

export function useApiDashboard() {
  const [data, setData]       = useState<ApiDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/tokens");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load API data");
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const post = async (body: object) => {
    try {
      const res  = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) await fetchData();
      return json;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    createToken: (payload: { name: string; scopes: ApiTokenScope[]; expiresAt?: string; rateLimitPerMinute?: number }) =>
      post({ action: "create", ...payload }),
    revokeToken: (tokenId: string) => post({ action: "revoke", tokenId }),
    deleteToken: (tokenId: string) => post({ action: "delete", tokenId }),
  };
}
