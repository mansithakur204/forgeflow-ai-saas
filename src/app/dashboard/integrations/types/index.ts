// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Integrations Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IntegrationFilters {
  search: string;
  category: string;
  status: string; // all, connected, disconnected
}

export interface IntegrationItem {
  id: string;
  name: string;
  category: "ai" | "messaging" | "workspace" | "email" | "database";
  description: string;
  connected: boolean;
  health: "healthy" | "degraded" | "failed";
  lastSync: string | null;
  hasSecrets: boolean;
}

export interface IntegrationResponse {
  success: boolean;
  integrations: IntegrationItem[];
  error?: string;
}
