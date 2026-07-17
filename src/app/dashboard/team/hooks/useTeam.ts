// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Team Management React Hook
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import type { TeamFilters, TeamResponse, WorkspacePermissions } from "../types";

export function useTeam(filters: TeamFilters) {
  const [data, setData] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("search", filters.search);
      queryParams.set("role", filters.role);
      queryParams.set("status", filters.status);

      const res = await fetch(`/api/team?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.statusText}`);
      }
      const json: TeamResponse = await res.json();
      if (json.success) {
        setData(json);
        setError(null);
      } else {
        throw new Error(json.error || "Failed to retrieve organization settings.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch organization.");
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.role, filters.status]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const inviteMember = async (email: string, role: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", email, role }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTeam();
        return { success: true };
      }
      return { success: false, error: json.error || "Invitation failed" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const removeMember = async (memberId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-member", memberId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTeam();
        return { success: true };
      }
      return { success: false, error: json.error || "De-registration failed" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deactivateMember = async (memberId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate-member", memberId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTeam();
        return { success: true };
      }
      return { success: false, error: json.error || "Toggling account suspended status failed" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const transferOwnership = async (memberId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transfer-ownership", memberId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTeam();
        return { success: true };
      }
      return { success: false, error: json.error || "Ownership transfer failed" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateMemberRole = async (memberId: string, role: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-role", memberId, role }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTeam();
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to update role" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const saveRolePermissions = async (
    role: string,
    permissions: WorkspacePermissions
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-permissions", role, permissions }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTeam();
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to update permissions" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchTeam,
    inviteMember,
    removeMember,
    deactivateMember,
    transferOwnership,
    updateMemberRole,
    saveRolePermissions,
  };
}
