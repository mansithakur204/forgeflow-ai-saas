// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Secrets Manager React Hook
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import type {
  SecretsListResponse,
  SecretDetailResponse,
  SecretsFilters,
  SecretRecord,
} from "../types";

const PAGE_SIZE = 20;

export function useSecrets(filters: SecretsFilters) {
  const [data, setData]       = useState<SecretsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchSecrets = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        search:   filters.search,
        folder:   filters.folder,
        tag:      filters.tag,
        type:     filters.type,
        archived: String(filters.archived),
        page:     String(filters.page),
        pageSize: String(PAGE_SIZE),
      });

      const res  = await fetch(`/api/secrets?${q}`);
      const json: SecretsListResponse = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load secrets");
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.folder, filters.tag, filters.type, filters.archived, filters.page]);

  useEffect(() => { fetchSecrets(); }, [fetchSecrets]);

  // ── Reveal a single secret value ──────────────────────────────────────────
  const revealSecret = async (secretId: string): Promise<SecretDetailResponse> => {
    const res  = await fetch(`/api/secrets?secretId=${secretId}&reveal=true`);
    return res.json();
  };

  // ── Fetch detail without reveal (for drawer) ──────────────────────────────
  const fetchDetail = async (secretId: string): Promise<SecretDetailResponse> => {
    const res  = await fetch(`/api/secrets?secretId=${secretId}`);
    return res.json();
  };

  const post = async (body: object): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const res  = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) fetchSecrets();
      return json;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchSecrets,
    revealSecret,
    fetchDetail,
    createSecret: (payload: {
      name: string; type: string; value: string;
      folder?: string; tags?: string[]; expiresAt?: string;
    }) => post({ action: "create", ...payload }),
    rotateSecret:    (secretId: string, newValue: string) => post({ action: "rotate", secretId, newValue }),
    updateMetadata:  (secretId: string, patch: Partial<Pick<SecretRecord, "folder" | "tags" | "expiresAt">>) => post({ action: "update-metadata", secretId, ...patch }),
    archiveSecret:   (secretId: string) => post({ action: "archive", secretId }),
    restoreSecret:   (secretId: string) => post({ action: "restore", secretId }),
    duplicateSecret: (secretId: string) => post({ action: "duplicate", secretId }),
    deleteSecret:    (secretId: string) => post({ action: "delete", secretId }),
  };
}
