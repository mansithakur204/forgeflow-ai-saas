import { getDb } from "@/lib/db/connection";
import type { IApiTokenRepository } from "../interfaces";
import type { PublicApiTokenRecord, ApiRequestLogRecord } from "@/lib/forgeflow-service";

export class PostgresApiTokenRepository implements IApiTokenRepository {
  async getAll(): Promise<PublicApiTokenRecord[]> {
    const db = getDb();
    const rows = await db`SELECT * FROM api_tokens ORDER BY created_at DESC`;
    return rows.map((r: any) => this.mapRow(r));
  }

  async findById(id: string): Promise<PublicApiTokenRecord | undefined> {
    const db = getDb();
    const [row] = await db`SELECT * FROM api_tokens WHERE id = ${id}`;
    if (!row) return undefined;
    return this.mapRow(row);
  }

  async findByToken(token: string): Promise<PublicApiTokenRecord | undefined> {
    const db = getDb();
    const [row] = await db`SELECT * FROM api_tokens WHERE token = ${token}`;
    if (!row) return undefined;
    return this.mapRow(row);
  }

  async save(tok: PublicApiTokenRecord): Promise<PublicApiTokenRecord> {
    const db = getDb();
    const existing = await this.findById(tok.id);

    if (existing) {
      await db`
        UPDATE api_tokens
        SET name = ${tok.name},
            token = ${tok.token},
            scopes = ${db.json(tok.scopes)},
            expires_at = ${tok.expiresAt},
            last_used_at = ${tok.lastUsedAt},
            revoked = ${tok.revoked},
            usage_count = ${tok.usageCount},
            requests_today = ${tok.requestsToday},
            rate_limit_per_minute = ${tok.rateLimitPerMinute}
        WHERE id = ${tok.id}
      `;
    } else {
      await db`
        INSERT INTO api_tokens (
          id, name, token, scopes, created_at, expires_at, last_used_at, revoked, usage_count, requests_today, rate_limit_per_minute
        ) VALUES (
          ${tok.id}, ${tok.name}, ${tok.token}, ${db.json(tok.scopes)}, ${tok.createdAt}, ${tok.expiresAt}, ${tok.lastUsedAt},
          ${tok.revoked}, ${tok.usageCount}, ${tok.requestsToday}, ${tok.rateLimitPerMinute}
        )
      `;
    }
    return tok;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db`DELETE FROM api_tokens WHERE id = ${id}`;
    return result.count > 0;
  }

  async getLogs(tokenId?: string): Promise<ApiRequestLogRecord[]> {
    const db = getDb();
    const rows = tokenId
      ? await db`SELECT * FROM api_request_logs WHERE token_id = ${tokenId} ORDER BY timestamp DESC`
      : await db`SELECT * FROM api_request_logs ORDER BY timestamp DESC`;

    return rows.map((r: any) => ({
      id: r.id,
      tokenId: r.tokenId,
      tokenName: r.tokenName,
      method: r.method,
      endpoint: r.endpoint,
      statusCode: Number(r.statusCode),
      latencyMs: Number(r.latencyMs),
      timestamp: new Date(r.timestamp).toISOString(),
      ip: r.ip,
    }));
  }

  async addLog(log: ApiRequestLogRecord): Promise<void> {
    const db = getDb();
    await db`
      INSERT INTO api_request_logs (id, token_id, token_name, method, endpoint, status_code, latency_ms, timestamp, ip)
      VALUES (${log.id}, ${log.tokenId}, ${log.tokenName}, ${log.method}, ${log.endpoint}, ${log.statusCode}, ${log.latencyMs}, ${log.timestamp}, ${log.ip})
    `;
  }

  private mapRow(r: any): PublicApiTokenRecord {
    return {
      id: r.id,
      name: r.name,
      token: r.token,
      scopes: typeof r.scopes === "string" ? JSON.parse(r.scopes) : r.scopes,
      createdAt: new Date(r.createdAt).toISOString(),
      expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
      lastUsedAt: r.lastUsedAt ? new Date(r.lastUsedAt).toISOString() : null,
      revoked: Boolean(r.revoked),
      usageCount: Number(r.usageCount),
      requestsToday: Number(r.requestsToday),
      rateLimitPerMinute: Number(r.rateLimitPerMinute),
    };
  }
}
