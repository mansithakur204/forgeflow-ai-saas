// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Database Migration Runner
// Reads SQL files from ./migrations/ in alphanumeric order and executes them.
// All migrations are idempotent (CREATE TABLE IF NOT EXISTS, etc.).
// ─────────────────────────────────────────────────────────────────────────────

import path from "path";
import fs from "fs";
import { getDb } from "./connection";

const MIGRATIONS_DIR = path.join(process.cwd(), "src", "lib", "db", "migrations");

/**
 * Run all pending SQL migrations in alphabetical order.
 * Safe to call on every startup — DDL statements use IF NOT EXISTS.
 */
export async function runMigrations(): Promise<void> {
  const sql = getDb();

  // Ensure the migrations tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS _forgeflow_migrations (
      id          SERIAL PRIMARY KEY,
      filename    TEXT UNIQUE NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Read and sort migration files
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    console.warn("[ForgeFlow] Migrations directory not found — skipping.");
    return;
  }

  for (const file of files) {
    // Skip already-applied migrations
    const [existing] = await sql`
      SELECT id FROM _forgeflow_migrations WHERE filename = ${file}
    `;
    if (existing) continue;

    const filePath = path.join(MIGRATIONS_DIR, file);
    const ddl = fs.readFileSync(filePath, "utf-8");

    console.log(`[ForgeFlow] Applying migration: ${file}`);

    // Run the entire migration file as a single transaction
    await sql.begin(async (tx) => {
      await tx.unsafe(ddl);
      await tx`
        INSERT INTO _forgeflow_migrations (filename) VALUES (${file})
      `;
    });

    console.log(`[ForgeFlow] Migration applied: ${file}`);
  }
}
