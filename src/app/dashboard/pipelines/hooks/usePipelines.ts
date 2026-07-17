// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Pipelines Observability React Hook
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import type { PipelineFilters, PipelineResponse } from "../types";

export function usePipelines(filters: PipelineFilters, isLiveRefresh: boolean) {
  const [data, setData] = useState<PipelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPipelines = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("search", filters.search);
      queryParams.set("status", filters.status);
      queryParams.set("agentId", filters.agentId);
      queryParams.set("sortBy", filters.sortBy);
      queryParams.set("sortOrder", filters.sortOrder);
      queryParams.set("page", String(filters.page));
      queryParams.set("limit", String(filters.limit));

      const res = await fetch(`/api/pipelines?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.statusText}`);
      }
      const json: PipelineResponse = await res.json();
      if (json.success) {
        setData(json);
        setError(null);
      } else {
        throw new Error(json.error || "Failed to retrieve pipeline data.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch pipelines.");
    } finally {
      setLoading(false);
    }
  }, [
    filters.search,
    filters.status,
    filters.agentId,
    filters.sortBy,
    filters.sortOrder,
    filters.page,
    filters.limit,
  ]);

  useEffect(() => {
    fetchPipelines();

    let timer: any;
    if (isLiveRefresh) {
      timer = setInterval(fetchPipelines, 5000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [fetchPipelines, isLiveRefresh]);

  const cancelPipeline = async (jobId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", jobId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          fetchPipelines();
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const retryPipeline = async (jobId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", jobId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          fetchPipelines();
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const replayPipeline = async (jobId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "replay", jobId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          fetchPipelines();
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchPipelines,
    cancelPipeline,
    retryPipeline,
    replayPipeline,
  };
}
