// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Marketplace React Hook
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import type { MarketplaceFilters, MarketplaceResponse } from "../types";

export function useMarketplace(filters: MarketplaceFilters) {
  const [data, setData] = useState<MarketplaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketplace = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("search", filters.search);
      queryParams.set("category", filters.category);
      queryParams.set("license", filters.license);
      queryParams.set("minRating", filters.minRating.toString());
      queryParams.set("sortBy", filters.sortBy);
      queryParams.set("sortOrder", filters.sortOrder);

      const res = await fetch(`/api/marketplace?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.statusText}`);
      }
      const json: MarketplaceResponse = await res.json();
      if (json.success) {
        setData(json);
        setError(null);
      } else {
        throw new Error(json.error || "Failed to retrieve marketplace catalog.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch marketplace.");
    } finally {
      setLoading(false);
    }
  }, [
    filters.search,
    filters.category,
    filters.license,
    filters.minRating,
    filters.sortBy,
    filters.sortOrder,
  ]);

  useEffect(() => {
    fetchMarketplace();
  }, [fetchMarketplace]);

  const installTemplate = async (entryId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install", entryId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchMarketplace();
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to install template" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateTemplate = async (entryId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", entryId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchMarketplace();
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to update template" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const toggleFavorite = async (entryId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "favorite", entryId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchMarketplace();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const submitReview = async (
    entryId: string,
    author: string,
    rating: number,
    comment: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review", entryId, author, rating, comment }),
      });
      const json = await res.json();
      if (json.success) {
        fetchMarketplace();
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to post review" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const reportTemplate = async (entryId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "report", entryId, reason }),
      });
      const json = await res.json();
      if (json.success) {
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to file report" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchMarketplace,
    installTemplate,
    updateTemplate,
    toggleFavorite,
    submitReview,
    reportTemplate,
  };
}
