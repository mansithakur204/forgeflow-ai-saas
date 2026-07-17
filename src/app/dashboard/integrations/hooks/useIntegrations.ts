// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Integrations Observability React Hook
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import type { IntegrationFilters, IntegrationResponse } from "../types";

export function useIntegrations(filters: IntegrationFilters) {
  const [data, setData] = useState<IntegrationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.statusText}`);
      }
      const json: IntegrationResponse = await res.json();
      if (json.success) {
        // Apply Client-Side Filtering to prevent heavy database load
        let items = json.integrations;

        if (filters.search) {
          const searchKey = filters.search.toLowerCase();
          items = items.filter(
            (item) =>
              item.name.toLowerCase().includes(searchKey) ||
              item.description.toLowerCase().includes(searchKey)
          );
        }

        if (filters.category) {
          items = items.filter((item) => item.category === filters.category);
        }

        if (filters.status) {
          if (filters.status === "connected") {
            items = items.filter((item) => item.connected);
          } else if (filters.status === "disconnected") {
            items = items.filter((item) => !item.connected);
          }
        }

        setData({ success: true, integrations: items });
        setError(null);
      } else {
        throw new Error(json.error || "Failed to retrieve integrations.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch integrations.");
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.category, filters.status]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const connectIntegration = async (providerId: string, secrets: Record<string, string>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", providerId, secrets }),
      });
      const json = await res.json();
      if (json.success) {
        fetchIntegrations();
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to connect integration" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const disconnectIntegration = async (providerId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", providerId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchIntegrations();
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to disconnect integration" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const testIntegration = async (providerId: string, secrets?: Record<string, string>): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", providerId, secrets }),
      });
      const json = await res.json();
      if (json.success) {
        return { success: true, message: json.message };
      }
      return { success: false, error: json.error || "Connection test failed." };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchIntegrations,
    connectIntegration,
    disconnectIntegration,
    testIntegration,
  };
}
