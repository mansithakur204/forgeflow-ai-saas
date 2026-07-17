import { getDb } from "@/lib/db/connection";
import type { IIntegrationRepository } from "../interfaces";
import type { IntegrationCredentialsRecord } from "@/lib/forgeflow-service";

export class PostgresIntegrationRepository implements IIntegrationRepository {
  async findAll(): Promise<IntegrationCredentialsRecord[]> {
    const db = getDb();
    const rows = await db`SELECT * FROM integrations ORDER BY provider_id ASC`;
    return rows.map((r: any) => ({
      providerId: r.providerId,
      status: r.status,
      health: r.health,
      lastSync: r.lastSync ? new Date(r.lastSync).toISOString() : null,
      encryptedSecrets: typeof r.encryptedSecrets === "string" ? JSON.parse(r.encryptedSecrets) : r.encryptedSecrets,
      updatedAt: new Date(r.updatedAt).toISOString(),
    }));
  }

  async findById(providerId: string): Promise<IntegrationCredentialsRecord | undefined> {
    const db = getDb();
    const [row] = await db`SELECT * FROM integrations WHERE provider_id = ${providerId}`;
    if (!row) return undefined;
    return {
      providerId: row.providerId,
      status: row.status,
      health: row.health,
      lastSync: row.lastSync ? new Date(row.lastSync).toISOString() : null,
      encryptedSecrets: typeof row.encryptedSecrets === "string" ? JSON.parse(row.encryptedSecrets) : row.encryptedSecrets,
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  async findByProvider(providerId: string): Promise<IntegrationCredentialsRecord | undefined> {
    return this.findById(providerId);
  }

  async save(record: IntegrationCredentialsRecord): Promise<IntegrationCredentialsRecord> {
    const db = getDb();
    const existing = await this.findById(record.providerId);

    if (existing) {
      const [updated] = await db`
        UPDATE integrations
        SET status = ${record.status},
            health = ${record.health},
            last_sync = ${record.lastSync},
            encrypted_secrets = ${db.json(record.encryptedSecrets)},
            updated_at = NOW(),
            version_lock = version_lock + 1
        WHERE provider_id = ${record.providerId}
        RETURNING *
      `;
      return {
        providerId: updated.providerId,
        status: updated.status,
        health: updated.health,
        lastSync: updated.lastSync ? new Date(updated.lastSync).toISOString() : null,
        encryptedSecrets: typeof updated.encryptedSecrets === "string" ? JSON.parse(updated.encryptedSecrets) : updated.encryptedSecrets,
        updatedAt: new Date(updated.updatedAt).toISOString(),
      };
    } else {
      const [inserted] = await db`
        INSERT INTO integrations (provider_id, status, health, last_sync, encrypted_secrets, updated_at)
        VALUES (${record.providerId}, ${record.status}, ${record.health}, ${record.lastSync}, ${db.json(record.encryptedSecrets)}, NOW())
        RETURNING *
      `;
      return {
        providerId: inserted.providerId,
        status: inserted.status,
        health: inserted.health,
        lastSync: inserted.lastSync ? new Date(inserted.lastSync).toISOString() : null,
        encryptedSecrets: typeof inserted.encryptedSecrets === "string" ? JSON.parse(inserted.encryptedSecrets) : inserted.encryptedSecrets,
        updatedAt: new Date(inserted.updatedAt).toISOString(),
      };
    }
  }

  async delete(providerId: string): Promise<boolean> {
    const db = getDb();
    const result = await db`DELETE FROM integrations WHERE provider_id = ${providerId}`;
    return result.count > 0;
  }
}
