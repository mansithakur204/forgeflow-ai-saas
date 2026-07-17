// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — API Dashboard Types
// ─────────────────────────────────────────────────────────────────────────────

export type ApiTokenScope =
  | "workflows:read" | "workflows:write"
  | "executions:read"
  | "secrets:read"
  | "integrations:read"
  | "templates:read"
  | "marketplace:read"
  | "billing:read"
  | "organizations:read"
  | "*";

export interface PublicApiTokenRecord {
  id: string;
  name: string;
  token: string; // always masked after creation
  scopes: ApiTokenScope[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revoked: boolean;
  usageCount: number;
  requestsToday: number;
  rateLimitPerMinute: number;
}

export interface ApiRequestLogRecord {
  id: string;
  tokenId: string;
  tokenName: string;
  method: string;
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  timestamp: string;
  ip: string;
}

export interface EndpointStat {
  count: number;
  errors: number;
  avgLatency: number;
}

export interface ApiDashboardData {
  tokens: PublicApiTokenRecord[];
  logs: ApiRequestLogRecord[];
  stats: {
    totalTokens: number;
    activeTokens: number;
    totalRequests: number;
    requestsToday: number;
    endpointStats: Record<string, EndpointStat>;
  };
  scopes: ApiTokenScope[];
}

export const SCOPE_LABELS: Record<ApiTokenScope, string> = {
  "workflows:read":     "Workflows — Read",
  "workflows:write":    "Workflows — Write",
  "executions:read":    "Executions — Read",
  "secrets:read":       "Secrets — Read",
  "integrations:read":  "Integrations — Read",
  "templates:read":     "Templates — Read",
  "marketplace:read":   "Marketplace — Read",
  "billing:read":       "Billing — Read",
  "organizations:read": "Organizations — Read",
  "*":                  "Full Access (all scopes)",
};

export const SCOPE_COLORS: Record<string, string> = {
  "workflows:read":     "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "workflows:write":    "bg-violet-500/10 text-violet-500 border-violet-500/20",
  "executions:read":    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "secrets:read":       "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "integrations:read":  "bg-teal-500/10 text-teal-500 border-teal-500/20",
  "templates:read":     "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  "marketplace:read":   "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  "billing:read":       "bg-rose-500/10 text-rose-500 border-rose-500/20",
  "organizations:read": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "*":                  "bg-brand-500/10 text-brand-500 border-brand-500/20",
};

export const V1_RESOURCES = [
  { method: "GET",  path: "/api/v1/workflows",     scope: "workflows:read",     description: "List all workflows" },
  { method: "GET",  path: "/api/v1/workflows/:id", scope: "workflows:read",     description: "Get a single workflow" },
  { method: "GET",  path: "/api/v1/executions",    scope: "executions:read",    description: "List execution history" },
  { method: "GET",  path: "/api/v1/secrets",       scope: "secrets:read",       description: "List secret metadata" },
  { method: "GET",  path: "/api/v1/integrations",  scope: "integrations:read",  description: "List integrations" },
  { method: "GET",  path: "/api/v1/templates",     scope: "templates:read",     description: "List templates" },
  { method: "GET",  path: "/api/v1/marketplace",   scope: "marketplace:read",   description: "List marketplace entries" },
  { method: "GET",  path: "/api/v1/billing",       scope: "billing:read",       description: "Subscription & usage" },
  { method: "GET",  path: "/api/v1/organizations", scope: "organizations:read", description: "Org & members" },
  { method: "GET",  path: "/api/v1",               scope: "*",                  description: "OpenAPI specification" },
] as const;
