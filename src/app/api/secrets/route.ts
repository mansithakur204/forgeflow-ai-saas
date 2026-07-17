// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Secrets Manager API Route
// AES-256-CBC encrypted storage. Plaintext NEVER returned on list calls.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { encrypt, decrypt } from "@/lib/encryption";
import crypto from "crypto";

const MASK = "••••••••••••••••";

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secretId = searchParams.get("secretId");
    const reveal    = searchParams.get("reveal") === "true";
    const search    = searchParams.get("search")?.toLowerCase() ?? "";
    const folder    = searchParams.get("folder") ?? "";
    const tag       = searchParams.get("tag") ?? "";
    const type      = searchParams.get("type") ?? "";
    const archived  = searchParams.get("archived") === "true";
    const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize  = Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10));

    // ── Single-secret detail (with optional reveal) ──────────────────────────
    if (secretId) {
      const secret = await forgeFlowService.secretsRepository.findById(secretId);
      if (!secret) {
        return NextResponse.json({ success: false, error: "Secret not found" }, { status: 404 });
      }

      const versions = await forgeFlowService.secretsRepository.getVersions(secretId);
      const logs     = await forgeFlowService.secretsRepository.getLogs(secretId);

      // Increment usage counter
      secret.usageCount += 1;
      await forgeFlowService.secretsRepository.save(secret);

      return NextResponse.json({
        success: true,
        secret: {
          ...secret,
          value: reveal ? decrypt(secret.value) : MASK,
        },
        versions: versions.map((v) => ({
          ...v,
          value: MASK, // versions never revealed via list
        })),
        logs,
      });
    }

    // ── List all secrets (always masked) ──────────────────────────────────────
    let all = await forgeFlowService.secretsRepository.getAll();

    // Filter archived vs active
    all = all.filter((s) => s.archived === archived);

    // Text search across name/folder/tags
    if (search) {
      all = all.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.folder.toLowerCase().includes(search) ||
          s.tags.some((t) => t.toLowerCase().includes(search))
      );
    }
    if (folder) all = all.filter((s) => s.folder === folder);
    if (tag)    all = all.filter((s) => s.tags.includes(tag));
    if (type)   all = all.filter((s) => s.type === type);

    const total = all.length;
    const paginated = all.slice((page - 1) * pageSize, page * pageSize);

    // Build folder and tag catalogues from full set
    const allSecrets = await forgeFlowService.secretsRepository.getAll();
    const folders = Array.from(new Set(allSecrets.map((s) => s.folder))).sort();
    const tags    = Array.from(new Set(allSecrets.flatMap((s) => s.tags))).sort();
    const allLogs = await forgeFlowService.secretsRepository.getLogs();

    return NextResponse.json({
      success: true,
      secrets: paginated.map((s) => ({ ...s, value: MASK })),
      total,
      page,
      pageSize,
      folders,
      tags,
      logs: allLogs.slice(0, 50),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, secretId, name, type, value, folder, tags, expiresAt, newValue } = body;

    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === "create") {
      if (!name || !type || !value) {
        return NextResponse.json({ success: false, error: "name, type, and value are required" }, { status: 400 });
      }

      const id = `sec-${Date.now()}`;
      const now = new Date().toISOString();
      const encryptedValue = encrypt(value);

      const secret = {
        id,
        name: name.trim().toUpperCase().replace(/\s+/g, "_"),
        type,
        value: encryptedValue,
        folder: folder || "General",
        tags: Array.isArray(tags) ? tags : [],
        version: 1,
        archived: false,
        expiresAt: expiresAt || null,
        lastRotatedAt: now,
        createdAt: now,
        usageCount: 0,
      };

      await forgeFlowService.secretsRepository.save(secret);
      await forgeFlowService.secretsRepository.addVersion({
        id: `ver-${Date.now()}`,
        secretId: id,
        version: 1,
        value: encryptedValue,
        createdAt: now,
        createdBy: "Jane Doe",
      });
      await forgeFlowService.secretsRepository.addLog({
        id: `aud-${Date.now()}`,
        secretId: id,
        action: "Secret Created",
        user: "Jane Doe",
        timestamp: now,
        details: `Created ${type} secret "${secret.name}" in folder "${secret.folder}".`,
      });

      return NextResponse.json({ success: true, message: `Secret "${secret.name}" created.` });
    }

    // ── ROTATE ────────────────────────────────────────────────────────────────
    if (action === "rotate") {
      if (!secretId || !newValue) {
        return NextResponse.json({ success: false, error: "secretId and newValue are required" }, { status: 400 });
      }
      const secret = await forgeFlowService.secretsRepository.findById(secretId);
      if (!secret) return NextResponse.json({ success: false, error: "Secret not found" }, { status: 404 });

      const now = new Date().toISOString();
      const prevVersion = secret.version;
      secret.version += 1;
      secret.value = encrypt(newValue);
      secret.lastRotatedAt = now;
      await forgeFlowService.secretsRepository.save(secret);

      await forgeFlowService.secretsRepository.addVersion({
        id: `ver-${Date.now()}`,
        secretId,
        version: secret.version,
        value: secret.value,
        createdAt: now,
        createdBy: "Jane Doe",
      });
      await forgeFlowService.secretsRepository.addLog({
        id: `aud-${Date.now()}`,
        secretId,
        action: "Secret Rotated",
        user: "Jane Doe",
        timestamp: now,
        details: `Rotated "${secret.name}" — v${prevVersion} → v${secret.version}.`,
      });

      return NextResponse.json({ success: true, message: `"${secret.name}" rotated to v${secret.version}.` });
    }

    // ── UPDATE METADATA ───────────────────────────────────────────────────────
    if (action === "update-metadata") {
      if (!secretId) return NextResponse.json({ success: false, error: "secretId is required" }, { status: 400 });
      const secret = await forgeFlowService.secretsRepository.findById(secretId);
      if (!secret) return NextResponse.json({ success: false, error: "Secret not found" }, { status: 404 });

      if (folder !== undefined)    secret.folder   = folder;
      if (Array.isArray(tags))     secret.tags     = tags;
      if (expiresAt !== undefined) secret.expiresAt = expiresAt || null;
      await forgeFlowService.secretsRepository.save(secret);
      await forgeFlowService.secretsRepository.addLog({
        id: `aud-${Date.now()}`,
        secretId,
        action: "Metadata Updated",
        user: "Jane Doe",
        timestamp: new Date().toISOString(),
        details: `Updated folder/tags/expiry for "${secret.name}".`,
      });

      return NextResponse.json({ success: true, message: "Metadata updated." });
    }

    // ── ARCHIVE / RESTORE ─────────────────────────────────────────────────────
    if (action === "archive" || action === "restore") {
      if (!secretId) return NextResponse.json({ success: false, error: "secretId is required" }, { status: 400 });
      const secret = await forgeFlowService.secretsRepository.findById(secretId);
      if (!secret) return NextResponse.json({ success: false, error: "Secret not found" }, { status: 404 });

      secret.archived = action === "archive";
      await forgeFlowService.secretsRepository.save(secret);
      await forgeFlowService.secretsRepository.addLog({
        id: `aud-${Date.now()}`,
        secretId,
        action: action === "archive" ? "Secret Archived" : "Secret Restored",
        user: "Jane Doe",
        timestamp: new Date().toISOString(),
        details: `"${secret.name}" ${action === "archive" ? "moved to archive" : "restored from archive"}.`,
      });

      return NextResponse.json({ success: true, message: `Secret ${action === "archive" ? "archived" : "restored"}.` });
    }

    // ── DUPLICATE ─────────────────────────────────────────────────────────────
    if (action === "duplicate") {
      if (!secretId) return NextResponse.json({ success: false, error: "secretId is required" }, { status: 400 });
      const original = await forgeFlowService.secretsRepository.findById(secretId);
      if (!original) return NextResponse.json({ success: false, error: "Secret not found" }, { status: 404 });

      const now = new Date().toISOString();
      const copy = {
        ...original,
        id: `sec-${Date.now()}`,
        name: `${original.name}_COPY`,
        version: 1,
        archived: false,
        usageCount: 0,
        createdAt: now,
        lastRotatedAt: now,
      };
      await forgeFlowService.secretsRepository.save(copy);
      await forgeFlowService.secretsRepository.addVersion({
        id: `ver-${Date.now()}`,
        secretId: copy.id,
        version: 1,
        value: copy.value,
        createdAt: now,
        createdBy: "Jane Doe",
      });
      await forgeFlowService.secretsRepository.addLog({
        id: `aud-${Date.now()}`,
        secretId: copy.id,
        action: "Secret Duplicated",
        user: "Jane Doe",
        timestamp: now,
        details: `Duplicated "${original.name}" → "${copy.name}".`,
      });

      return NextResponse.json({ success: true, message: `"${copy.name}" created as duplicate.` });
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (action === "delete") {
      if (!secretId) return NextResponse.json({ success: false, error: "secretId is required" }, { status: 400 });
      const secret = await forgeFlowService.secretsRepository.findById(secretId);
      if (!secret) return NextResponse.json({ success: false, error: "Secret not found" }, { status: 404 });

      await forgeFlowService.secretsRepository.delete(secretId);
      await forgeFlowService.secretsRepository.addLog({
        id: `aud-${Date.now()}`,
        secretId,
        action: "Secret Deleted",
        user: "Jane Doe",
        timestamp: new Date().toISOString(),
        details: `Permanently deleted "${secret.name}" from vault.`,
      });

      return NextResponse.json({ success: true, message: `"${secret.name}" permanently deleted.` });
    }

    return NextResponse.json({ success: false, error: `Unknown action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
