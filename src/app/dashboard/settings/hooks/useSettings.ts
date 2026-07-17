// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workspace Settings React Hook
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import type { SettingsResponse, WorkspaceSettings } from "../types";

export function useSettings() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.statusText}`);
      }
      const json: SettingsResponse = await res.json();
      if (json.success) {
        setData(json);
        setError(null);
      } else {
        throw new Error(json.error || "Failed to retrieve workspace configurations.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (settings: WorkspaceSettings): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", settings }),
      });
      const json = await res.json();
      if (json.success) {
        fetchSettings();
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to save settings" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const resetSettings = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const json = await res.json();
      if (json.success) {
        fetchSettings();
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to reset settings" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const testProvider = async (providerId: string, apiKey: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-provider", providerId, apiKey }),
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

  const regenerateApiKey = async (): Promise<{ success: boolean; apiKey?: string; error?: string }> => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate-api-key" }),
      });
      const json = await res.json();
      if (json.success) {
        fetchSettings();
        return { success: true, apiKey: json.apiKey };
      }
      return { success: false, error: json.error || "Failed to generate keys" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const restoreSettings = async (restored: WorkspaceSettings): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", restored }),
      });
      const json = await res.json();
      if (json.success) {
        fetchSettings();
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to restore backup configurations" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchSettings,
    saveSettings,
    resetSettings,
    testProvider,
    regenerateApiKey,
    restoreSettings,
  };
}
