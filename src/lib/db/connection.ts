// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — PostgreSQL Connection Pool
// Uses postgres.js (https://github.com/porsager/postgres)
// Lazy-initialised singleton; gracefully absent when DATABASE_URL is unset.
// ─────────────────────────────────────────────────────────────────────────────

import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | null = null;

/**
 * Returns true when DATABASE_URL is present in the environment.
 * Used by the RepositoryFactory to decide which implementation to use.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Returns the singleton postgres client.
 * Throws if DATABASE_URL is not set — callers should always guard with
 * `isDatabaseConfigured()` before calling this.
 */
export function getDb(): ReturnType<typeof postgres> {
  if (_sql) return _sql;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "[ForgeFlow] DATABASE_URL is not configured. " +
      "Set it in your environment or .env.local to enable PostgreSQL persistence."
    );
  }

  _sql = postgres(url, {
    max: 10,                  // connection pool size
    idle_timeout: 30,         // close idle connections after 30s
    connect_timeout: 10,      // fail fast on unreachable host
    ssl: process.env.NODE_ENV === "production" ? "require" : false,
    transform: {
      // Map snake_case columns → camelCase JS properties automatically
      column: postgres.toCamel,
    },
    onnotice: () => {},        // suppress NOTICE messages in logs
  });

  return _sql;
}

/** Close the pool — used in tests and graceful shutdowns */
export async function closeDb(): Promise<void> {
  if (_sql) {
    await _sql.end();
    _sql = null;
  }
}
