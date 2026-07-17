import { getDb } from "@/lib/db/connection";
import type { ISecretsRepository } from "../interfaces";
import type { SecretRecord, SecretVersionRecord, SecretAuditRecord } from "@/lib/forgeflow-service";

export class PostgresSecretsRepository implements ISecretsRepository {
  async getAll(): Promise<SecretRecord[]> {
    const db = getDb();
    const rows = await db`
      SELECT * FROM secrets WHERE deleted_at IS NULL ORDER BY created_at DESC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      value: r.value,
      folder: r.folder,
      version: Number(r.version),
      tags: typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags,
      archived: Boolean(r.archived),
      expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
      lastRotatedAt: new Date(r.lastRotatedAt).toISOString(),
      createdAt: new Date(r.createdAt).toISOString(),
      usageCount: Number(r.usageCount),
    }));
  }

  async findById(id: string): Promise<SecretRecord | undefined> {
    const db = getDb();
    const [row] = await db`
      SELECT * FROM secrets WHERE id = ${id} AND deleted_at IS NULL
    `;
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      value: row.value,
      folder: row.folder,
      version: Number(row.version),
      tags: typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags,
      archived: Boolean(row.archived),
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
      lastRotatedAt: new Date(row.lastRotatedAt).toISOString(),
      createdAt: new Date(row.createdAt).toISOString(),
      usageCount: Number(row.usageCount),
    };
  }

  async save(secret: SecretRecord): Promise<SecretRecord> {
    const db = getDb();
    const existing = await this.findById(secret.id);

    if (existing) {
      // Optimistic Locking Check
      if (existing.version !== secret.version) {
        throw new Error(`Optimistic locking conflict: Secret "${secret.name}" version has changed from ${secret.version} to ${existing.version}.`);
      }

      const nextVersion = secret.version + 1;
      const [updated] = await db`
        UPDATE secrets
        SET name = ${secret.name},
            type = ${secret.type},
            value = ${secret.value},
            folder = ${secret.folder},
            tags = ${db.json(secret.tags)},
            version = ${nextVersion},
            archived = ${secret.archived},
            expires_at = ${secret.expiresAt},
            last_rotated_at = ${secret.lastRotatedAt},
            usage_count = ${secret.usageCount}
        WHERE id = ${secret.id} AND version = ${secret.version}
        RETURNING *
      `;

      if (!updated) {
        throw new Error("Optimistic locking conflict or secret was deleted concurrently.");
      }

      return {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        value: updated.value,
        folder: updated.folder,
        version: Number(updated.version),
        tags: typeof updated.tags === "string" ? JSON.parse(updated.tags) : updated.tags,
        archived: Boolean(updated.archived),
        expiresAt: updated.expiresAt ? new Date(updated.expiresAt).toISOString() : null,
        lastRotatedAt: new Date(updated.lastRotatedAt).toISOString(),
        createdAt: new Date(updated.createdAt).toISOString(),
        usageCount: Number(updated.usageCount),
      };
    } else {
      const [inserted] = await db`
        INSERT INTO secrets (
          id, name, type, value, folder, tags, version, archived, expires_at, last_rotated_at, created_at, usage_count
        ) VALUES (
          ${secret.id}, ${secret.name}, ${secret.type}, ${secret.value}, ${secret.folder},
          ${db.json(secret.tags)}, 1, ${secret.archived}, ${secret.expiresAt}, ${secret.lastRotatedAt}, ${secret.createdAt}, ${secret.usageCount}
        )
        RETURNING *
      `;
      return {
        id: inserted.id,
        name: inserted.name,
        type: inserted.type,
        value: inserted.value,
        folder: inserted.folder,
        version: Number(inserted.version),
        tags: typeof inserted.tags === "string" ? JSON.parse(inserted.tags) : inserted.tags,
        archived: Boolean(inserted.archived),
        expiresAt: inserted.expiresAt ? new Date(inserted.expiresAt).toISOString() : null,
        lastRotatedAt: new Date(inserted.lastRotatedAt).toISOString(),
        createdAt: new Date(inserted.createdAt).toISOString(),
        usageCount: Number(inserted.usageCount),
      };
    }
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    // Soft Delete support
    const result = await db`
      UPDATE secrets SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL
    `;
    return result.count > 0;
  }

  async getVersions(secretId: string): Promise<SecretVersionRecord[]> {
    const db = getDb();
    const rows = await db`
      SELECT * FROM secret_versions WHERE secret_id = ${secretId} ORDER BY version DESC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      secretId: r.secretId,
      version: Number(r.version),
      value: r.value,
      createdAt: new Date(r.createdAt).toISOString(),
      createdBy: r.createdBy,
    }));
  }

  async addVersion(v: SecretVersionRecord): Promise<void> {
    const db = getDb();
    await db`
      INSERT INTO secret_versions (id, secret_id, version, value, created_at, created_by)
      VALUES (${v.id}, ${v.secretId}, ${v.version}, ${v.value}, ${v.createdAt}, ${v.createdBy})
    `;
  }

  async getLogs(secretId?: string): Promise<SecretAuditRecord[]> {
    const db = getDb();
    const rows = secretId
      ? await db`SELECT * FROM secret_audit_logs WHERE secret_id = ${secretId} ORDER BY timestamp DESC`
      : await db`SELECT * FROM secret_audit_logs ORDER BY timestamp DESC`;

    return rows.map((r: any) => ({
      id: r.id,
      secretId: r.secretId,
      action: r.action,
      user: r.userName,
      timestamp: new Date(r.timestamp).toISOString(),
      details: r.details,
    }));
  }

  async addLog(log: SecretAuditRecord): Promise<void> {
    const db = getDb();
    await db`
      INSERT INTO secret_audit_logs (id, secret_id, action, user_name, timestamp, details)
      VALUES (${log.id}, ${log.secretId}, ${log.action}, ${log.user}, ${log.timestamp}, ${log.details})
    `;
  }
}
