"use client";

import React, { useState, useEffect } from "react";
import {
  Key, Search, Plus, RefreshCw, Eye, EyeOff, Copy,
  RotateCcw, Archive, Trash2, ChevronRight, X,
  CheckCircle, AlertTriangle, Shield,
  FolderOpen, Tag, Download, Lock,
} from "lucide-react";
import {
  useSecrets,
} from "../hooks/useSecrets";
import type {
  SecretRecord,
  SecretsFilters, SecretDetailResponse,
} from "../types";
import {
  SECRET_TYPE_COLORS,
  SECRET_TYPE_OPTIONS as TYPE_OPTIONS,
} from "../types";

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, success, onDone }: { message: string; success: boolean; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl text-xs font-semibold animate-fade-in ${success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-rose-500/10 border-rose-500/20 text-rose-600"}`}>
      {success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
      {message}
    </div>
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({
  title, body, confirmLabel = "Confirm", danger = true,
  onConfirm, onCancel,
}: {
  title: string; body: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onCancel} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm bg-background border border-border/40 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl">
        <div className={`flex items-center gap-2 font-extrabold text-sm ${danger ? "text-rose-500" : "text-brand-500"}`}>
          <Shield className="w-5 h-5" />{title}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
        <div className="flex gap-2 justify-end border-t border-border/20 pt-3 text-xs font-bold">
          <button onClick={onCancel} className="px-3 py-1.5 bg-border/40 hover:bg-border/60 border border-border/60 rounded-xl text-foreground transition">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-1.5 rounded-xl text-white transition ${danger ? "bg-rose-600 hover:bg-rose-500 border border-rose-700" : "bg-brand-500 hover:bg-brand-600"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Create/Edit Modal ─────────────────────────────────────────────────────────
function CreateSecretModal({
  folders, onSubmit, onCancel,
}: {
  folders: string[];
  onSubmit: (payload: { name: string; type: string; value: string; folder: string; tags: string[]; expiresAt?: string }) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [name, setName]         = useState("");
  const [type, setType]         = useState<string>("Custom");
  const [value, setValue]       = useState("");
  const [folder, setFolder]     = useState(folders[0] || "General");
  const [newFolder, setNewFolder] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags]         = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]           = useState("");

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) { setErr("Name and value are required."); return; }
    setSubmitting(true);
    const res = await onSubmit({
      name,
      type,
      value,
      folder: newFolder.trim() || folder,
      tags,
      expiresAt: expiresAt || undefined,
    });
    setSubmitting(false);
    if (!res.success) setErr(res.error || "Failed to create secret");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div onClick={onCancel} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md bg-background border border-border/40 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl my-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl"><Key className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">Add New Secret</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase font-semibold">Encrypted with AES-256-CBC</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-border/40 text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        {err && (
          <div className="text-xs text-rose-600 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{err}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-muted-foreground">Secret Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="e.g. OPENAI_API_KEY"
              className="px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground font-mono focus:outline-none focus:border-brand-500" />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-muted-foreground">Secret Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none">
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Value */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-muted-foreground">Secret Value</label>
            <div className="relative">
              <input value={value} onChange={(e) => setValue(e.target.value)} required
                type={showValue ? "text" : "password"}
                placeholder="Paste your secret…"
                className="w-full px-3 py-1.5 pr-9 bg-background border border-border/60 rounded-xl text-xs text-foreground font-mono focus:outline-none focus:border-brand-500" />
              <button type="button" onClick={() => setShowValue(!showValue)}
                className="absolute right-2.5 top-1.5 text-muted-foreground hover:text-foreground">
                {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Folder */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-muted-foreground">Folder</label>
              <select value={folder} onChange={(e) => setFolder(e.target.value)}
                className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none">
                {folders.map((f) => <option key={f} value={f}>{f}</option>)}
                <option value="__new__">+ New folder…</option>
              </select>
            </div>
            {(folder === "__new__" || newFolder) && (
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-muted-foreground">New Folder Name</label>
                <input value={newFolder} onChange={(e) => setNewFolder(e.target.value)}
                  placeholder="My Folder"
                  className="px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none" />
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-muted-foreground">Tags</label>
            <div className="flex gap-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Add tag…"
                className="flex-1 px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none" />
              <button type="button" onClick={addTag}
                className="px-3 bg-border/40 hover:bg-border/60 rounded-xl text-xs font-bold text-foreground border border-border/60 transition">Add</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-border/20 rounded-full border border-border/40 text-foreground font-semibold">
                    {t}
                    <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="text-muted-foreground hover:text-foreground"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Expiry */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-muted-foreground">Expiration Date <span className="font-normal">(optional)</span></label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none" />
          </div>

          <div className="flex gap-2 border-t border-border/20 pt-4">
            <button type="button" onClick={onCancel}
              className="flex-1 py-2 font-semibold bg-border/40 hover:bg-border/60 border border-border/60 text-foreground rounded-xl transition">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2 font-bold bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition flex items-center justify-center gap-1.5 shadow-sm">
              {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Lock className="w-3.5 h-3.5" />Encrypt & Save</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Secret Details Drawer ─────────────────────────────────────────────────────
function SecretDrawer({
  secret: initialSecret, onClose, onRotate, onArchive, onRestore, onDuplicate, onDelete, onReveal,
}: {
  secret: SecretRecord;
  onClose: () => void;
  onRotate: (id: string, newValue: string) => Promise<{ success: boolean; error?: string }>;
  onArchive: (id: string) => Promise<{ success: boolean; error?: string }>;
  onRestore: (id: string) => Promise<{ success: boolean; error?: string }>;
  onDuplicate: (id: string) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  onReveal: (id: string) => Promise<SecretDetailResponse>;
}) {
  const [detail, setDetail]       = useState<SecretDetailResponse | null>(null);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [tab, setTab]             = useState<"info" | "versions" | "audit">("info");
  const [rotateMode, setRotateMode] = useState(false);
  const [newValue, setNewValue]   = useState("");
  const [rotating, setRotating]   = useState(false);
  const [confirm, setConfirm]     = useState<"delete" | "archive" | "restore" | null>(null);

  useEffect(() => {
    // Load detail immediately
    onReveal(initialSecret.id).then((r) => {
      if (!r.success) return;
      setDetail(r);
    });
  }, [initialSecret.id]);

  const handleReveal = async () => {
    setRevealing(true);
    const r = await onReveal(initialSecret.id);
    setRevealing(false);
    if (r.success) setRevealedValue(r.secret.value);
  };

  const handleCopy = async () => {
    const val = revealedValue ?? "••••••••••••••••";
    if (revealedValue) {
      await navigator.clipboard.writeText(revealedValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      await handleReveal();
    }
  };

  const handleRotate = async () => {
    if (!newValue) return;
    setRotating(true);
    await onRotate(initialSecret.id, newValue);
    setRotating(false);
    setRotateMode(false);
    setNewValue("");
    // Refresh
    const r = await onReveal(initialSecret.id);
    if (r.success) setDetail(r);
  };

  const isExpired = initialSecret.expiresAt && new Date(initialSecret.expiresAt) < new Date();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {confirm && (
        <ConfirmDialog
          title={confirm === "delete" ? "Delete Secret" : confirm === "archive" ? "Archive Secret" : "Restore Secret"}
          body={
            confirm === "delete"
              ? `Permanently delete "${initialSecret.name}"? This cannot be undone.`
              : confirm === "archive"
              ? `Archive "${initialSecret.name}"? It will be moved out of the active vault.`
              : `Restore "${initialSecret.name}" back into the active vault?`
          }
          confirmLabel={confirm === "delete" ? "Delete Forever" : confirm === "archive" ? "Archive" : "Restore"}
          danger={confirm === "delete"}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            setConfirm(null);
            if (confirm === "delete")   { await onDelete(initialSecret.id); onClose(); }
            if (confirm === "archive")  { await onArchive(initialSecret.id); onClose(); }
            if (confirm === "restore")  { await onRestore(initialSecret.id); onClose(); }
          }}
        />
      )}

      <div className="relative w-full max-w-md bg-background border-l border-border/40 h-full flex flex-col shadow-2xl z-10 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border/20 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl shrink-0"><Key className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground font-mono">{initialSecret.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SECRET_TYPE_COLORS[initialSecret.type] || SECRET_TYPE_COLORS.Custom}`}>
                  {initialSecret.type}
                </span>
                {isExpired && (
                  <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full">Expired</span>
                )}
                {initialSecret.archived && (
                  <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">Archived</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-border/40 text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Masked value + actions bar */}
        <div className="px-5 py-3 bg-border/5 border-b border-border/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-1.5 bg-background border border-border/40 rounded-xl font-mono text-xs text-foreground tracking-widest overflow-hidden">
              {revealedValue ?? "••••••••••••••••••••••••"}
            </div>
            <button onClick={handleReveal} disabled={revealing}
              title="Reveal secret"
              className="p-2 bg-border/40 hover:bg-border/60 border border-border/40 rounded-xl text-muted-foreground hover:text-foreground transition">
              {revealing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : revealedValue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button onClick={handleCopy} title="Copy to clipboard"
              className="p-2 bg-border/40 hover:bg-border/60 border border-border/40 rounded-xl text-muted-foreground hover:text-foreground transition">
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 font-semibold">
            v{initialSecret.version} • Last rotated {new Date(initialSecret.lastRotatedAt).toLocaleDateString()} • {initialSecret.usageCount} uses
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/20 shrink-0 text-xs font-bold px-5">
          {(["info", "versions", "audit"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-2.5 px-3 border-b-2 capitalize transition ${tab === t ? "border-brand-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t === "versions" ? "Version History" : t === "audit" ? "Audit Log" : "Details"}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-muted-foreground flex flex-col gap-4">

          {/* ── INFO TAB ── */}
          {tab === "info" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 bg-border/10 p-3 rounded-2xl border border-border/20">
                  <span className="font-black uppercase text-[9px] text-muted-foreground/60">Folder</span>
                  <span className="font-bold text-foreground flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5" />{initialSecret.folder}</span>
                </div>
                <div className="flex flex-col gap-1 bg-border/10 p-3 rounded-2xl border border-border/20">
                  <span className="font-black uppercase text-[9px] text-muted-foreground/60">Created</span>
                  <span className="font-bold text-foreground">{new Date(initialSecret.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col gap-1 bg-border/10 p-3 rounded-2xl border border-border/20">
                  <span className="font-black uppercase text-[9px] text-muted-foreground/60">Expiry</span>
                  <span className={`font-bold ${isExpired ? "text-rose-500" : "text-foreground"}`}>
                    {initialSecret.expiresAt ? new Date(initialSecret.expiresAt).toLocaleDateString() : "Never"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 bg-border/10 p-3 rounded-2xl border border-border/20">
                  <span className="font-black uppercase text-[9px] text-muted-foreground/60">Usage Count</span>
                  <span className="font-bold text-foreground">{initialSecret.usageCount} references</span>
                </div>
              </div>

              {/* Tags */}
              {initialSecret.tags.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-black uppercase text-[9px] text-muted-foreground/60">Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {initialSecret.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 bg-brand-500/10 border border-brand-500/20 text-brand-500 rounded-full font-bold">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rotate Panel */}
              <div className="border-t border-border/20 pt-4">
                <button onClick={() => setRotateMode(!rotateMode)}
                  className="flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-brand-500 transition">
                  <RotateCcw className="w-3.5 h-3.5" /> {rotateMode ? "Cancel Rotation" : "Rotate Secret"}
                </button>

                {rotateMode && (
                  <div className="mt-3 flex flex-col gap-2">
                    <input value={newValue} onChange={(e) => setNewValue(e.target.value)}
                      type="password" placeholder="Enter new secret value…"
                      className="px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground font-mono focus:outline-none focus:border-brand-500" />
                    <button onClick={handleRotate} disabled={rotating || !newValue}
                      className="py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5">
                      {rotating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><RotateCcw className="w-3.5 h-3.5" />Confirm Rotation</>}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── VERSION HISTORY TAB ── */}
          {tab === "versions" && (
            <div className="flex flex-col gap-3">
              {(detail?.versions ?? []).length === 0
                ? <p className="italic text-muted-foreground">No version history yet.</p>
                : (detail?.versions ?? []).map((v) => (
                  <div key={v.id} className="p-3 bg-border/10 border border-border/20 rounded-2xl flex flex-col gap-1">
                    <div className="flex justify-between font-bold text-foreground text-[11px]">
                      <span>v{v.version}</span>
                      <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground/60 truncate">{v.value}</div>
                    <div className="text-[9px] text-muted-foreground border-t border-border/10 pt-1 mt-1">By: {v.createdBy}</div>
                  </div>
                ))}
            </div>
          )}

          {/* ── AUDIT LOG TAB ── */}
          {tab === "audit" && (
            <div className="flex flex-col gap-3">
              {(detail?.logs ?? []).length === 0
                ? <p className="italic text-muted-foreground">No audit events recorded.</p>
                : (detail?.logs ?? []).map((log) => (
                  <div key={log.id} className="p-3 bg-border/10 border border-border/20 rounded-2xl flex flex-col gap-1">
                    <div className="flex justify-between font-bold text-foreground text-[11px]">
                      <span>{log.action}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{log.details}</p>
                    <div className="text-[9px] text-muted-foreground/60 border-t border-border/10 pt-1 mt-1 flex justify-between">
                      <span>By: {log.user}</span>
                      <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer action buttons */}
        <div className="p-5 border-t border-border/20 flex gap-2 shrink-0">
          <button onClick={() => onDuplicate(initialSecret.id)}
            className="flex-1 py-2 text-xs font-semibold bg-border/40 hover:bg-border/60 border border-border/60 text-foreground rounded-xl transition">Duplicate</button>
          {initialSecret.archived
            ? <button onClick={() => setConfirm("restore")}
                className="flex-1 py-2 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl hover:bg-emerald-500/20 transition">Restore</button>
            : <button onClick={() => setConfirm("archive")}
                className="flex-1 py-2 text-xs font-semibold bg-border/40 hover:bg-border/60 border border-border/60 text-foreground rounded-xl transition">Archive</button>
          }
          <button onClick={() => setConfirm("delete")}
            className="py-2 px-3 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl border border-rose-700 transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export function SecretsDashboard() {
  const [filters, setFilters] = useState<SecretsFilters>({
    search: "", folder: "", tag: "", type: "", archived: false, page: 1,
  });

  const {
    data, loading, error, refetch,
    createSecret, rotateSecret, archiveSecret, restoreSecret,
    duplicateSecret, deleteSecret, revealSecret, fetchDetail,
  } = useSecrets(filters);

  const [drawerSecret, setDrawerSecret]   = useState<SecretRecord | null>(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [toast, setToast]                 = useState<{ success: boolean; message: string } | null>(null);
  const [revealedMap, setRevealedMap]     = useState<Record<string, string>>({});
  const [revealingId, setRevealingId]     = useState<string | null>(null);
  const [copiedId, setCopiedId]           = useState<string | null>(null);

  const showToast = (success: boolean, message: string) => setToast({ success, message });

  const handleCreate = async (payload: Parameters<typeof createSecret>[0]) => {
    const res = await createSecret(payload);
    if (res.success) {
      showToast(true, "Secret created and encrypted.");
      setShowCreate(false);
    } else {
      showToast(false, res.error || "Failed.");
    }
    return res;
  };

  const handleRevealRow = async (id: string) => {
    if (revealedMap[id]) {
      setRevealedMap((m) => { const n = { ...m }; delete n[id]; return n; });
      return;
    }
    setRevealingId(id);
    const res = await revealSecret(id);
    setRevealingId(null);
    if (res.success) {
      setRevealedMap((m) => ({ ...m, [id]: res.secret.value }));
    }
  };

  const handleCopyRow = async (id: string) => {
    if (!revealedMap[id]) {
      const res = await revealSecret(id);
      if (!res.success) return;
      setRevealedMap((m) => ({ ...m, [id]: res.secret.value }));
      await navigator.clipboard.writeText(res.secret.value);
    } else {
      await navigator.clipboard.writeText(revealedMap[id]);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isExpired = (s: SecretRecord) => !!s.expiresAt && new Date(s.expiresAt) < new Date();

  const allFolders = data?.folders ?? [];
  const allTags    = data?.tags ?? [];

  const exportSecrets = () => {
    if (!data) return;
    const exportable = data.secrets.map(({ value: _v, ...rest }) => ({ ...rest, value: "REDACTED" }));
    const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `secrets-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-0 h-full max-w-screen-xl mx-auto w-full">

      {/* Toast */}
      {toast && <Toast message={toast.message} success={toast.success} onDone={() => setToast(null)} />}

      {/* Create Modal */}
      {showCreate && (
        <CreateSecretModal
          folders={allFolders.length ? allFolders : ["General", "AI Configs", "Integrations", "Databases", "DevOps"]}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Detail Drawer */}
      {drawerSecret && (
        <SecretDrawer
          secret={drawerSecret}
          onClose={() => setDrawerSecret(null)}
          onReveal={async (id) => {
            const res = await revealSecret(id);
            return res;
          }}
          onRotate={async (id, val) => {
            const r = await rotateSecret(id, val);
            if (r.success) showToast(true, "Secret rotated.");
            else showToast(false, r.error || "Rotation failed.");
            return r;
          }}
          onArchive={async (id) => {
            const r = await archiveSecret(id);
            if (r.success) showToast(true, "Secret archived.");
            else showToast(false, r.error || "Archive failed.");
            return r;
          }}
          onRestore={async (id) => {
            const r = await restoreSecret(id);
            if (r.success) showToast(true, "Secret restored.");
            else showToast(false, r.error || "Restore failed.");
            return r;
          }}
          onDuplicate={async (id) => {
            const r = await duplicateSecret(id);
            if (r.success) showToast(true, "Secret duplicated.");
            else showToast(false, r.error || "Duplicate failed.");
            setDrawerSecret(null);
            return r;
          }}
          onDelete={async (id) => {
            const r = await deleteSecret(id);
            if (r.success) showToast(true, "Secret permanently deleted.");
            else showToast(false, r.error || "Delete failed.");
            return r;
          }}
        />
      )}

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 pt-6 pb-4 border-b border-border/30">
        <div>
          <nav className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <span>Dashboard</span><span>/</span><span className="text-foreground">Secrets</span>
          </nav>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Secrets Vault
            {loading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AES-256 encrypted. Values never exposed in transit.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportSecrets}
            className="py-1.5 px-3 border border-border/60 bg-border/20 hover:bg-border/40 text-foreground text-xs font-bold rounded-xl transition flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={() => setShowCreate(true)}
            className="py-1.5 px-3 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Secret
          </button>
        </div>
      </div>

      {/* ── SIDEBAR + TABLE LAYOUT ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="hidden md:flex w-52 shrink-0 flex-col gap-5 border-r border-border/20 p-4 overflow-y-auto bg-background/50">
          {/* Archive toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">View</span>
            <button onClick={() => setFilters({ ...filters, archived: false, page: 1 })}
              className={`text-xs font-bold px-2.5 py-1.5 rounded-xl text-left transition ${!filters.archived ? "bg-brand-500/10 text-brand-500 border border-brand-500/20" : "text-muted-foreground hover:text-foreground hover:bg-border/20"}`}>
              <Shield className="w-3.5 h-3.5 inline mr-1.5" />Active Vault
            </button>
            <button onClick={() => setFilters({ ...filters, archived: true, page: 1 })}
              className={`text-xs font-bold px-2.5 py-1.5 rounded-xl text-left transition ${filters.archived ? "bg-brand-500/10 text-brand-500 border border-brand-500/20" : "text-muted-foreground hover:text-foreground hover:bg-border/20"}`}>
              <Archive className="w-3.5 h-3.5 inline mr-1.5" />Archived
            </button>
          </div>

          {/* Folders */}
          {allFolders.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">Folders</span>
              <button onClick={() => setFilters({ ...filters, folder: "", page: 1 })}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl text-left transition ${!filters.folder ? "text-brand-500 font-bold" : "text-muted-foreground hover:text-foreground hover:bg-border/20"}`}>
                All Folders
              </button>
              {allFolders.map((f) => (
                <button key={f} onClick={() => setFilters({ ...filters, folder: f, page: 1 })}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl text-left truncate transition ${filters.folder === f ? "bg-brand-500/10 text-brand-500 border border-brand-500/20" : "text-muted-foreground hover:text-foreground hover:bg-border/20"}`}>
                  <FolderOpen className="w-3 h-3 inline mr-1.5 shrink-0" />{f}
                </button>
              ))}
            </div>
          )}

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">Tags</span>
              {allTags.map((t) => (
                <button key={t} onClick={() => setFilters({ ...filters, tag: filters.tag === t ? "" : t, page: 1 })}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl text-left truncate transition ${filters.tag === t ? "bg-brand-500/10 text-brand-500 border border-brand-500/20" : "text-muted-foreground hover:text-foreground hover:bg-border/20"}`}>
                  <Tag className="w-3 h-3 inline mr-1.5 shrink-0" />{t}
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 px-5 py-3 border-b border-border/20 items-center shrink-0">
            <div className="relative flex-1 min-w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                placeholder="Search secrets…"
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs focus:outline-none focus:border-brand-500 text-foreground" />
            </div>
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
              className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none font-semibold">
              <option value="">All Types</option>
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {(filters.search || filters.folder || filters.tag || filters.type) && (
              <button onClick={() => setFilters({ ...filters, search: "", folder: "", tag: "", type: "", page: 1 })}
                className="text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-4">
                Clear filters
              </button>
            )}
            <span className="ml-auto text-xs text-muted-foreground font-semibold">
              {data?.total ?? 0} secrets
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {loading && !data && (
              <div className="flex flex-col gap-3 p-5 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-border/30 rounded-2xl" />)}
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-3 p-12 text-center">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
                <p className="text-sm font-bold text-foreground">Failed to load vault</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <button onClick={refetch} className="px-4 py-2 bg-brand-500 text-white text-xs font-bold rounded-xl">Retry</button>
              </div>
            )}

            {!loading && data && data.secrets.length === 0 && (
              <div className="flex flex-col items-center gap-3 p-12 text-center">
                <Lock className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm font-bold text-foreground">No secrets found</p>
                <p className="text-xs text-muted-foreground">Create your first secret or adjust filters.</p>
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />Add Secret
                </button>
              </div>
            )}

            {data && data.secrets.length > 0 && (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-border/10 border-b border-border/30 text-muted-foreground font-black text-[10px] uppercase tracking-wider">
                    <th className="p-3 pl-5 text-left">Name</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Folder</th>
                    <th className="p-3 text-left">Value</th>
                    <th className="p-3 text-left">Version</th>
                    <th className="p-3 text-left">Expiry</th>
                    <th className="p-3 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/15">
                  {data.secrets.map((s) => {
                    const expired = isExpired(s);
                    return (
                      <tr key={s.id}
                        className="hover:bg-border/10 cursor-pointer transition group"
                        onClick={() => setDrawerSecret(s)}>
                        <td className="p-3 pl-5 font-bold text-foreground font-mono text-[11px]">
                          {s.name}
                          {expired && <span className="ml-2 text-[9px] font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 px-1 py-0.5 rounded-full">EXPIRED</span>}
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SECRET_TYPE_COLORS[s.type] || SECRET_TYPE_COLORS.Custom}`}>{s.type}</span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          <span className="flex items-center gap-1"><FolderOpen className="w-3 h-3 shrink-0" />{s.folder}</span>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground/60 text-[11px] max-w-[150px] truncate">
                          {revealedMap[s.id] ?? "••••••••••••••••"}
                        </td>
                        <td className="p-3 text-muted-foreground font-bold">v{s.version}</td>
                        <td className="p-3 text-muted-foreground">
                          {s.expiresAt ? (
                            <span className={expired ? "text-rose-500 font-bold" : ""}>
                              {new Date(s.expiresAt).toLocaleDateString()}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="p-3 pr-5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button title="Reveal" onClick={() => handleRevealRow(s.id)} disabled={revealingId === s.id}
                              className="p-1.5 rounded-lg hover:bg-border/40 text-muted-foreground hover:text-foreground transition">
                              {revealingId === s.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : revealedMap[s.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button title="Copy" onClick={() => handleCopyRow(s.id)}
                              className="p-1.5 rounded-lg hover:bg-border/40 text-muted-foreground hover:text-foreground transition">
                              {copiedId === s.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button title="Open details" onClick={() => setDrawerSecret(s)}
                              className="p-1.5 rounded-lg hover:bg-border/40 text-muted-foreground hover:text-foreground transition">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {data && data.total > data.pageSize && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/20 shrink-0 text-xs font-semibold text-muted-foreground">
              <span>Page {data.page} of {Math.ceil(data.total / data.pageSize)}</span>
              <div className="flex gap-2">
                <button disabled={data.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  className="px-3 py-1.5 bg-border/40 hover:bg-border/60 border border-border/60 rounded-xl disabled:opacity-40 transition text-foreground font-bold">Previous</button>
                <button disabled={data.page >= Math.ceil(data.total / data.pageSize)}
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl disabled:opacity-40 transition font-bold">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
