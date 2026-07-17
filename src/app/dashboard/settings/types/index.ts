// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workspace Settings Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkspaceSettings {
  version: number;
  general: {
    workspaceName: string;
    description: string;
    timezone: string;
  };
  workspace: {
    id: string;
    owner: string;
    billingTier: string;
  };
  aiProviders: {
    defaultProvider: string;
    temperature: number;
    openaiKey: string;
    geminiKey: string;
    anthropicKey: string;
  };
  environmentVariables: Record<string, string>;
  security: {
    sessionTimeoutMinutes: number;
    ipRestrictions: string;
    mfaRequired: boolean;
  };
  notifications: {
    onPipelineFailure: boolean;
    onAgentHandoff: boolean;
    onApprovalRequest: boolean;
  };
  appearance: {
    theme: "light" | "dark" | "system";
    accentColor: string;
  };
  roles: {
    roleName: string;
    description: string;
    permissions: string[];
  }[];
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface SettingsResponse {
  success: boolean;
  settings: WorkspaceSettings;
  logs: AuditLogRecord[];
  error?: string;
}
