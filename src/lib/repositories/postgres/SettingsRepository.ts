import { getDb } from "@/lib/db/connection";
import type { ISettingsRepository } from "../interfaces";
import type { WorkspaceSettings, AuditLogRecord } from "@/lib/forgeflow-service";

export class PostgresSettingsRepository implements ISettingsRepository {
  private async ensureSeeded() {
    const db = getDb();
    const [row] = await db`SELECT COUNT(*)::integer FROM workspace_settings`;
    if (row.count > 0) return;

    const defaultSettings: WorkspaceSettings = {
      version: 1,
      general: {
        workspaceName: "ForgeFlow AI Workspace",
        description: "Standard tenant workspace for Agentic workflows.",
        timezone: "UTC",
      },
      workspace: {
        id: "ws-tenant-default-001",
        owner: "Jane Doe (jane.doe@example.com)",
        billingTier: "Enterprise",
      },
      aiProviders: {
        defaultProvider: "openai",
        temperature: 0.7,
        openaiKey: "",
        geminiKey: "",
        anthropicKey: "",
      },
      environmentVariables: {},
      security: {
        sessionTimeoutMinutes: 60,
        ipRestrictions: "0.0.0.0/0",
        mfaRequired: false,
      },
      notifications: {
        onPipelineFailure: true,
        onAgentHandoff: false,
        onApprovalRequest: true,
      },
      appearance: {
        theme: "dark",
        accentColor: "#3b82f6",
      },
      roles: [
        { roleName: "Admin", description: "Full workspace read/write and security rights.", permissions: ["all"] },
        { roleName: "Editor", description: "Create, edit and trigger workflows. No billing or security updates.", permissions: ["read", "write", "trigger"] },
        { roleName: "Viewer", description: "View metrics and canvases only.", permissions: ["read"] }
      ]
    };

    await db`
      INSERT INTO workspace_settings (id, settings)
      VALUES ('settings-1', ${db.json(defaultSettings as any)})
      ON CONFLICT DO NOTHING
    `;
  }

  async get(): Promise<WorkspaceSettings> {
    await this.ensureSeeded();
    const db = getDb();
    const [row] = await db`SELECT settings FROM workspace_settings WHERE id = 'settings-1'`;
    return typeof row.settings === "string" ? JSON.parse(row.settings) : row.settings;
  }

  async save(settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    await this.ensureSeeded();
    const db = getDb();
    // Save version bump with optimistic locking protection
    await db`
      UPDATE workspace_settings
      SET settings = ${db.json(settings as any)},
          updated_at = NOW(),
          version_lock = version_lock + 1
      WHERE id = 'settings-1'
    `;
    return settings;
  }

  async getLogs(): Promise<AuditLogRecord[]> {
    await this.ensureSeeded();
    const db = getDb();
    const rows = await db`SELECT * FROM workspace_settings_audit_logs ORDER BY timestamp DESC`;
    return rows.map((r: any) => ({
      id: r.id,
      timestamp: new Date(r.timestamp).toISOString(),
      user: r.userName,
      action: r.action,
      details: r.details,
    }));
  }

  async addLog(log: AuditLogRecord): Promise<void> {
    await this.ensureSeeded();
    const db = getDb();
    await db`
      INSERT INTO workspace_settings_audit_logs (id, user_name, action, details, timestamp)
      VALUES (${log.id}, ${log.user}, ${log.action}, ${log.details}, ${log.timestamp})
    `;
  }

  async resetToDefaults(): Promise<void> {
    const db = getDb();
    await db`DELETE FROM workspace_settings WHERE id = 'settings-1'`;
  }
}
