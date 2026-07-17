// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Secrets Dashboard Types
// ─────────────────────────────────────────────────────────────────────────────

export type SecretType =
  | "OpenAI" | "Gemini" | "Anthropic" | "Azure OpenAI" | "Groq" | "Ollama"
  | "Slack" | "Discord" | "Notion" | "GitHub" | "SMTP"
  | "PostgreSQL" | "MySQL" | "MongoDB" | "Database" | "Custom";

export interface SecretRecord {
  id: string;
  name: string;
  type: SecretType;
  value: string; // always "••••••••" from API unless revealed
  folder: string;
  tags: string[];
  version: number;
  archived: boolean;
  expiresAt: string | null;
  lastRotatedAt: string;
  createdAt: string;
  usageCount: number;
}

export interface SecretVersionRecord {
  id: string;
  secretId: string;
  version: number;
  value: string;
  createdAt: string;
  createdBy: string;
}

export interface SecretAuditRecord {
  id: string;
  secretId: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
}

export interface SecretsListResponse {
  success: boolean;
  secrets: SecretRecord[];
  total: number;
  page: number;
  pageSize: number;
  folders: string[];
  tags: string[];
  logs: SecretAuditRecord[];
  error?: string;
}

export interface SecretDetailResponse {
  success: boolean;
  secret: SecretRecord;
  versions: SecretVersionRecord[];
  logs: SecretAuditRecord[];
  error?: string;
}

export interface SecretsFilters {
  search: string;
  folder: string;
  tag: string;
  type: string;
  archived: boolean;
  page: number;
}

export const SECRET_TYPE_OPTIONS: SecretType[] = [
  "OpenAI", "Gemini", "Anthropic", "Azure OpenAI", "Groq", "Ollama",
  "Slack", "Discord", "Notion", "GitHub", "SMTP",
  "PostgreSQL", "MySQL", "MongoDB", "Database", "Custom",
];

export const SECRET_TYPE_COLORS: Record<string, string> = {
  OpenAI:       "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Gemini:       "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Anthropic:    "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Azure OpenAI": "bg-sky-500/10 text-sky-500 border-sky-500/20",
  Groq:         "bg-violet-500/10 text-violet-500 border-violet-500/20",
  Ollama:       "bg-gray-500/10 text-gray-500 border-gray-500/20",
  Slack:        "bg-rose-500/10 text-rose-500 border-rose-500/20",
  Discord:      "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  Notion:       "bg-stone-500/10 text-stone-500 border-stone-500/20",
  GitHub:       "bg-neutral-500/10 text-neutral-500 border-neutral-500/20",
  SMTP:         "bg-orange-500/10 text-orange-500 border-orange-500/20",
  PostgreSQL:   "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  MySQL:        "bg-teal-500/10 text-teal-600 border-teal-500/20",
  MongoDB:      "bg-green-500/10 text-green-600 border-green-500/20",
  Database:     "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  Custom:       "bg-pink-500/10 text-pink-500 border-pink-500/20",
};
