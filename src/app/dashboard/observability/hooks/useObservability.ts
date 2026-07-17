import { useState, useEffect } from "react";
import type { DashboardData, DashboardFilters } from "../types";

export function useObservability(filters: DashboardFilters, inspectId: string | null, isLiveRefresh: boolean) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        const queryParams = new URLSearchParams();
        if (filters.workflowId) queryParams.set("workflowId", filters.workflowId);
        if (filters.agentId) queryParams.set("agentId", filters.agentId);
        if (filters.provider) queryParams.set("provider", filters.provider);
        if (filters.status) queryParams.set("status", filters.status);
        if (inspectId) queryParams.set("inspectId", inspectId);

        const res = await fetch(`/api/observability?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to retrieve observability statistics: ${res.statusText}`);
        }
        const json = await res.json();
        if (active) {
          setData(json);
          setError(null);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Failed to fetch observability metrics");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchData();

    let timer: any;
    if (isLiveRefresh) {
      // Auto-refresh every 5 seconds for real-time observability telemetry (Task 8)
      timer = setInterval(fetchData, 5000);
    }

    return () => {
      active = false;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [
    filters.workflowId,
    filters.agentId,
    filters.provider,
    filters.status,
    filters.dateRange,
    inspectId,
    isLiveRefresh,
  ]);

  return { data, loading, error };
}
