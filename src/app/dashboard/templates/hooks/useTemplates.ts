// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Templates React Hook
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import type { TemplateFilters, TemplateResponse, WorkflowTemplate } from "../types";

export function useTemplates(filters: TemplateFilters) {
  const [data, setData] = useState<TemplateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("search", filters.search);
      queryParams.set("category", filters.category);
      queryParams.set("difficulty", filters.difficulty);
      queryParams.set("sortBy", filters.sortBy);
      queryParams.set("sortOrder", filters.sortOrder);

      const res = await fetch(`/api/templates?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.statusText}`);
      }
      const json: TemplateResponse = await res.json();
      if (json.success) {
        setData(json);
        setError(null);
      } else {
        throw new Error(json.error || "Failed to retrieve templates.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch templates.");
    } finally {
      setLoading(false);
    }
  }, [
    filters.search,
    filters.category,
    filters.difficulty,
    filters.sortBy,
    filters.sortOrder,
  ]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createWorkflow = async (templateId: string): Promise<{ success: boolean; workflowId?: string; error?: string }> => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-workflow", templateId }),
      });
      const json = await res.json();
      if (json.success) {
        return { success: true, workflowId: json.workflowId };
      }
      return { success: false, error: json.error || "Failed to instantiate workflow" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const toggleFavorite = async (templateId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "favorite", templateId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTemplates();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const duplicateTemplate = async (templateId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", templateId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTemplates();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const importTemplate = async (template: WorkflowTemplate): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", template }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTemplates();
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to import template" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const exportTemplate = async (templateId: string): Promise<WorkflowTemplate | null> => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export", templateId }),
      });
      const json = await res.json();
      if (json.success) {
        return json.template;
      }
      return null;
    } catch {
      return null;
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchTemplates,
    createWorkflow,
    toggleFavorite,
    duplicateTemplate,
    importTemplate,
    exportTemplate,
  };
}
