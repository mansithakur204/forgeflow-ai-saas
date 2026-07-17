"use client";

import React, { useState, useEffect } from "react";
import {
  Code2, Key, Plus, RefreshCw, Copy, CheckCircle,
  AlertTriangle, Shield, Trash2, X, Eye, EyeOff,
  Activity, Clock, Zap, Globe, ChevronRight,
  Terminal, BarChart3, BookOpen, Lock,
} from "lucide-react";
import { useApiDashboard } from "../hooks/useApi";
import type { PublicApiTokenRecord, ApiTokenScope } from "../types";
import {
  SCOPE_LABELS, SCOPE_COLORS, V1_RESOURCES,
} from "../types";

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, success, onDone }: { message: string; success: boolean; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 4500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl text-xs font-semibold animate-fade-in max-w-sm ${success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-rose-500/10 border-rose-500/20 text-rose-600"}`}>
      {success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
      <span className="leading-snug">{message}</span>
    </div>
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ title, body, confirmLabel = "Confirm", onConfirm, onCancel }: {
  title: string; body: string; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onCancel} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm bg-background border border-border/40 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center gap-2 font-extrabold text-sm text-rose-500"><Shield className="w-5 h-5" />{title}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
        <div className="flex gap-2 justify-end border-t border-border/20 pt-3 text-xs font-bold">
          <button onClick={onCancel} className="px-3 py-1.5 bg-border/40 hover:bg-border/60 border border-border/60 rounded-xl text-foreground transition">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-1.5 rounded-xl text-white bg-rose-600 hover:bg-rose-500 border border-rose-700 transition">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-background border border-border/30 rounded-3xl p-5 flex flex-col gap-3 hover:border-border/60 transition-all group">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{label}</span>
        <div className={`p-2 rounded-xl ${color} transition-transform group-hover:scale-105`}><Icon className="w-4 h-4" /></div>
      </div>
      <div>
        <div className="text-2xl font-black text-foreground">{value}</div>
        {sub && <div className="text-xs text-muted-foreground font-semibold mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Create Token Modal ────────────────────────────────────────────────────────
function CreateTokenModal({
  allScopes, onSubmit, onCancel,
}: {
  allScopes: ApiTokenScope[];
  onSubmit: (p: { name: string; scopes: ApiTokenScope[]; expiresAt?: string; rateLimitPerMinute?: number }) => Promise<{ success: boolean; token?: any; error?: string }>;
  onCancel: () => void;
}) {
  const [name, setName]               = useState("");
  const [selectedScopes, setScopes]   = useState<ApiTokenScope[]>(["*"]);
  const [expiresAt, setExpiresAt]     = useState("");
  const [rateLimit, setRateLimit]     = useState(60);
  const [submitting, setSubmitting]   = useState(false);
  const [created, setCreated]         = useState<{ token: string } | null>(null);
  const [copied, setCopied]           = useState(false);
  const [err, setErr]                 = useState("");

  const toggleScope = (s: ApiTokenScope) => {
    if (s === "*") { setScopes(["*"]); return; }
    setScopes((prev) => {
      const without = prev.filter((x) => x !== "*" && x !== s);
      return prev.includes(s) ? (without.length ? without : ["*"]) : [...without, s];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr("Name is required."); return; }
    setSubmitting(true);
    const res = await onSubmit({ name, scopes: selectedScopes, expiresAt: expiresAt || undefined, rateLimitPerMinute: rateLimit });
    setSubmitting(false);
    if (res.success && res.token) {
      setCreated({ token: res.token.token });
    } else {
      setErr(res.error || "Failed to create token.");
    }
  };

  const handleCopy = async () => {
    if (created) {
      await navigator.clipboard.writeText(created.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div onClick={created ? undefined : onCancel} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg bg-background border border-border/40 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl my-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl"><Key className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">Create Personal Access Token</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold uppercase">The token is shown only once</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-border/40 text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Success panel */}
        {created ? (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs">
              <div className="font-black text-emerald-600 flex items-center gap-1.5 mb-2"><CheckCircle className="w-4 h-4" />Token created successfully!</div>
              <p className="text-muted-foreground leading-relaxed">Copy this token now. It will <strong>not</strong> be shown again.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-background border border-border/60 rounded-xl font-mono text-xs text-foreground break-all">{created.token}</div>
              <button onClick={handleCopy} className="p-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition">
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={onCancel} className="py-2 font-bold text-xs bg-border/40 hover:bg-border/60 border border-border/60 text-foreground rounded-xl transition">
              I've saved my token — Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
            {err && <div className="px-3 py-2 text-rose-600 bg-rose-500/10 border border-rose-500/20 rounded-xl">{err}</div>}

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-muted-foreground">Token Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="e.g. Production SDK"
                className="px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none focus:border-brand-500" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-bold text-muted-foreground">Scopes</label>
              <div className="grid grid-cols-2 gap-1.5">
                {allScopes.map((s) => (
                  <button key={s} type="button" onClick={() => toggleScope(s)}
                    className={`text-left px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition ${selectedScopes.includes(s) ? `${SCOPE_COLORS[s] || "bg-brand-500/10 text-brand-500 border-brand-500/20"}` : "bg-border/10 border-border/40 text-muted-foreground hover:border-border/60"}`}>
                    {SCOPE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-muted-foreground">Expiration <span className="font-normal">(opt.)</span></label>
                <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                  className="px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-muted-foreground">Rate Limit / min</label>
                <input type="number" min={1} max={1000} value={rateLimit} onChange={(e) => setRateLimit(parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none" />
              </div>
            </div>

            <div className="flex gap-2 border-t border-border/20 pt-4">
              <button type="button" onClick={onCancel} className="flex-1 py-2 font-semibold bg-border/40 hover:bg-border/60 border border-border/60 text-foreground rounded-xl transition">Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 py-2 font-bold bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition flex items-center justify-center gap-1.5 shadow-sm">
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Key className="w-3.5 h-3.5" />Generate Token</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Method badge ──────────────────────────────────────────────────────────────
function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    POST: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    PUT: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    DELETE: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    PATCH: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  };
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${colors[method] || "bg-border/20 text-muted-foreground border-border/30"}`}>{method}</span>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ code }: { code: number }) {
  const c = code >= 500 ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
    : code >= 400 ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
    : code >= 300 ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  return <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${c}`}>{code}</span>;
}

// ─── Code Example ──────────────────────────────────────────────────────────────
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative bg-[#0d0d0f] border border-border/30 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/20 bg-border/5">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{lang}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition">
          {copied ? <><CheckCircle className="w-3 h-3 text-emerald-500" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
        </button>
      </div>
      <pre className="p-4 text-[11px] text-foreground/90 font-mono overflow-x-auto leading-relaxed whitespace-pre">{code}</pre>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function ApiDashboard() {
  const { data, loading, error, refetch, createToken, revokeToken, deleteToken } = useApiDashboard();
  const [tab, setTab]                 = useState<"tokens" | "explorer" | "stats" | "history">("tokens");
  const [showCreate, setShowCreate]   = useState(false);
  const [toast, setToast]             = useState<{ success: boolean; message: string } | null>(null);
  const [confirm, setConfirm]         = useState<{ type: "revoke" | "delete"; id: string; name: string } | null>(null);
  const [selectedResource, setSelectedResource] = useState(0);
  const [explorerToken, setExplorerToken] = useState("");
  const [tryResult, setTryResult]     = useState<string | null>(null);
  const [trying, setTrying]           = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const showToast = (success: boolean, message: string) => setToast({ success, message });
  const HISTORY_PAGE_SIZE = 15;

  const handleCreate = async (p: Parameters<typeof createToken>[0]) => {
    const res = await createToken(p);
    if (res.success) showToast(true, `Token "${p.name}" created. Copy it now!`);
    else showToast(false, res.error || "Failed to create token.");
    return res;
  };

  const handleTryIt = async () => {
    const resource = V1_RESOURCES[selectedResource];
    const path = resource.path.replace(":id", "wf-1");
    setTrying(true);
    try {
      const res = await fetch(path, {
        headers: explorerToken ? { Authorization: `Bearer ${explorerToken}` } : {},
      });
      const json = await res.json();
      setTryResult(JSON.stringify(json, null, 2));
    } catch (e: any) {
      setTryResult(`Error: ${e.message}`);
    } finally {
      setTrying(false);
    }
  };

  const resource = V1_RESOURCES[selectedResource];
  const codeExamples = {
    curl: `curl -X ${resource.method} \\
  ${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}${resource.path.replace(":id", "wf-1")} \\
  -H "Authorization: Bearer <your-token>" \\
  -H "Content-Type: application/json"`,

    typescript: `import fetch from "node-fetch";

const response = await fetch(
  "${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}${resource.path.replace(":id", "wf-1")}",
  {
    method: "${resource.method}",
    headers: {
      "Authorization": "Bearer <your-token>",
      "Content-Type": "application/json",
    },
  }
);

const data = await response.json();
console.log(data);`,

    python: `import requests

response = requests.${resource.method.toLowerCase()}(
    "${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}${resource.path.replace(":id", "wf-1")}",
    headers={
        "Authorization": "Bearer <your-token>",
        "Content-Type": "application/json",
    }
)

data = response.json()
print(data)`,
  };

  const [codeTab, setCodeTab] = useState<"curl" | "typescript" | "python">("curl");

  // Paged history
  const allLogs = data?.logs ?? [];
  const pagedLogs = allLogs.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);
  const totalHistoryPages = Math.ceil(allLogs.length / HISTORY_PAGE_SIZE);

  return (
    <div className="flex flex-col h-full max-w-screen-xl mx-auto w-full">
      {toast && <Toast message={toast.message} success={toast.success} onDone={() => setToast(null)} />}

      {showCreate && data && (
        <CreateTokenModal
          allScopes={data.scopes}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.type === "revoke" ? "Revoke Token" : "Delete Token"}
          body={confirm.type === "revoke"
            ? `Revoke "${confirm.name}"? Any services using this token will immediately lose access.`
            : `Permanently delete "${confirm.name}"? This cannot be undone.`}
          confirmLabel={confirm.type === "revoke" ? "Revoke" : "Delete"}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const { type, id, name } = confirm!;
            setConfirm(null);
            const res = type === "revoke" ? await revokeToken(id) : await deleteToken(id);
            if (res.success) showToast(true, `Token "${name}" ${type}d.`);
            else showToast(false, res.error || `Failed to ${type}.`);
          }}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 pt-6 pb-4 border-b border-border/30">
        <div>
          <nav className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <span>Dashboard</span><ChevronRight className="w-3 h-3" /><span className="text-foreground">API</span>
          </nav>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Public API
            {loading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">REST API v1 — Bearer token authentication, OpenAPI 3.0.3 spec.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href="/api/v1" target="_blank"
            className="py-1.5 px-3 border border-border/60 bg-border/20 hover:bg-border/40 text-foreground text-xs font-bold rounded-xl transition flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> OpenAPI Spec
          </a>
          <button onClick={() => setShowCreate(true)}
            className="py-1.5 px-3 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Token
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 py-4">
          <KpiCard label="Active Tokens" value={data.stats.activeTokens} sub={`of ${data.stats.totalTokens} total`} icon={Key} color="bg-brand-500/10 text-brand-500" />
          <KpiCard label="Total Requests" value={data.stats.totalRequests.toLocaleString()} sub="all time" icon={Activity} color="bg-emerald-500/10 text-emerald-500" />
          <KpiCard label="Requests Today" value={data.stats.requestsToday.toLocaleString()} sub="across all tokens" icon={Zap} color="bg-blue-500/10 text-blue-500" />
          <KpiCard label="API Version" value="v1" sub="REST · OpenAPI 3.0.3" icon={Globe} color="bg-violet-500/10 text-violet-500" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border/20 px-6 text-xs font-bold gap-1">
        {(["tokens", "explorer", "stats", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2.5 px-3 border-b-2 capitalize transition ${tab === t ? "border-brand-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "tokens" ? "Token Management" : t === "explorer" ? "API Explorer" : t === "stats" ? "Usage Statistics" : "Request History"}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="flex flex-col gap-3 p-6 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-border/30 rounded-2xl" />)}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center gap-3 p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
          <p className="text-sm font-bold">Failed to load API dashboard</p>
          <button onClick={refetch} className="px-4 py-2 bg-brand-500 text-white text-xs font-bold rounded-xl">Retry</button>
        </div>
      )}

      {data && (
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── TOKEN MANAGEMENT ── */}
          {tab === "tokens" && (
            <div className="flex flex-col gap-4">
              {data.tokens.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <Lock className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm font-bold">No tokens yet</p>
                  <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />Create Token</button>
                </div>
              )}
              {data.tokens.map((tok) => {
                const expired = !!tok.expiresAt && new Date(tok.expiresAt) < new Date();
                return (
                  <div key={tok.id} className={`p-5 bg-background border rounded-3xl flex flex-col md:flex-row md:items-center gap-4 transition ${tok.revoked ? "border-border/20 opacity-60" : "border-border/30 hover:border-border/60"}`}>
                    {/* Left */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${tok.revoked ? "bg-border/20 text-muted-foreground" : "bg-brand-500/10 text-brand-500"}`}>
                        <Key className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold text-foreground">{tok.name}</span>
                          {tok.revoked && <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full uppercase">Revoked</span>}
                          {expired && !tok.revoked && <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full uppercase">Expired</span>}
                          {!tok.revoked && !expired && <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full uppercase">Active</span>}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 truncate">{tok.token}</div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {tok.scopes.map((s) => (
                            <span key={s} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${SCOPE_COLORS[s] || "bg-border/20 text-muted-foreground border-border/30"}`}>{SCOPE_LABELS[s]}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <div className="text-center">
                        <div className="font-black text-foreground text-sm">{tok.usageCount.toLocaleString()}</div>
                        <div className="text-muted-foreground font-semibold text-[10px]">Total Req</div>
                      </div>
                      <div className="text-center">
                        <div className="font-black text-foreground text-sm">{tok.requestsToday}</div>
                        <div className="text-muted-foreground font-semibold text-[10px]">Today</div>
                      </div>
                      <div className="text-center">
                        <div className="font-black text-foreground text-sm">{tok.rateLimitPerMinute}/m</div>
                        <div className="text-muted-foreground font-semibold text-[10px]">Rate Limit</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-foreground text-[11px]">{tok.expiresAt ? new Date(tok.expiresAt).toLocaleDateString() : "Never"}</div>
                        <div className="text-muted-foreground font-semibold text-[10px]">Expires</div>
                      </div>
                    </div>

                    {/* Actions */}
                    {!tok.revoked && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setConfirm({ type: "revoke", id: tok.id, name: tok.name })}
                          className="px-3 py-1.5 text-xs font-bold bg-border/40 hover:bg-amber-500/10 hover:text-amber-600 border border-border/60 hover:border-amber-500/20 rounded-xl transition">
                          Revoke
                        </button>
                        <button onClick={() => setConfirm({ type: "delete", id: tok.id, name: tok.name })}
                          className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-border/60 hover:border-rose-500/20 rounded-xl transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {tok.revoked && (
                      <button onClick={() => setConfirm({ type: "delete", id: tok.id, name: tok.name })}
                        className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-border/60 hover:border-rose-500/20 rounded-xl transition shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── API EXPLORER ── */}
          {tab === "explorer" && (
            <div className="flex flex-col lg:flex-row gap-5">
              {/* Sidebar */}
              <div className="w-full lg:w-56 shrink-0 flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Resources</span>
                {V1_RESOURCES.map((r, i) => (
                  <button key={i} onClick={() => { setSelectedResource(i); setTryResult(null); }}
                    className={`text-left px-3 py-2 rounded-xl text-xs transition flex items-center gap-2 ${selectedResource === i ? "bg-brand-500/10 text-brand-500 border border-brand-500/20 font-bold" : "text-muted-foreground hover:text-foreground hover:bg-border/20 font-semibold"}`}>
                    <MethodBadge method={r.method} />
                    <span className="truncate font-mono text-[10px]">{r.path}</span>
                  </button>
                ))}
              </div>

              {/* Main area */}
              <div className="flex-1 flex flex-col gap-4 min-w-0">
                {/* Endpoint header */}
                <div className="p-4 bg-background border border-border/30 rounded-2xl flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <MethodBadge method={resource.method} />
                    <code className="text-sm font-mono font-bold text-foreground">{resource.path}</code>
                  </div>
                  <p className="text-xs text-muted-foreground">{resource.description}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] font-black text-muted-foreground/60">Required scope:</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${SCOPE_COLORS[resource.scope] || "bg-border/20"}`}>{resource.scope}</span>
                  </div>
                </div>

                {/* Try It */}
                <div className="p-4 bg-background border border-border/30 rounded-2xl flex flex-col gap-3">
                  <h4 className="text-xs font-black text-foreground flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5" />Try It</h4>
                  <div className="flex gap-2">
                    <input value={explorerToken} onChange={(e) => setExplorerToken(e.target.value)}
                      type="password" placeholder="Paste your Bearer token…"
                      className="flex-1 px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-brand-500" />
                    <button onClick={handleTryIt} disabled={trying}
                      className="px-4 py-1.5 bg-brand-500 text-white text-xs font-bold rounded-xl hover:bg-brand-600 transition flex items-center gap-1.5 shrink-0">
                      {trying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Send Request"}
                    </button>
                  </div>
                  {tryResult && (
                    <div className="bg-[#0d0d0f] border border-border/30 rounded-xl p-4 overflow-x-auto">
                      <pre className="text-[10px] font-mono text-foreground/90 leading-relaxed whitespace-pre">{tryResult}</pre>
                    </div>
                  )}
                </div>

                {/* Code Examples */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-black text-foreground flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5" />Code Examples</h4>
                  <div className="flex gap-1 border-b border-border/20 pb-2">
                    {(["curl", "typescript", "python"] as const).map((l) => (
                      <button key={l} onClick={() => setCodeTab(l)}
                        className={`text-[10px] font-bold px-3 py-1 rounded-lg capitalize transition ${codeTab === l ? "bg-brand-500/10 text-brand-500" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
                    ))}
                  </div>
                  <CodeBlock code={codeExamples[codeTab]} lang={codeTab} />
                </div>
              </div>
            </div>
          )}

          {/* ── USAGE STATISTICS ── */}
          {tab === "stats" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-foreground">Requests by Endpoint</h3>
              <div className="flex flex-col gap-2">
                {Object.entries(data.stats.endpointStats)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .map(([endpoint, stat]) => {
                    const maxCount = Math.max(...Object.values(data.stats.endpointStats).map((s) => s.count), 1);
                    const pct = Math.round((stat.count / maxCount) * 100);
                    const errPct = stat.count > 0 ? Math.round((stat.errors / stat.count) * 100) : 0;
                    return (
                      <div key={endpoint} className="p-4 bg-background border border-border/30 rounded-2xl flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <code className="text-xs font-bold text-foreground font-mono">{endpoint}</code>
                          <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                            <span className="text-foreground font-black">{stat.count.toLocaleString()} req</span>
                            <span className={errPct > 10 ? "text-rose-500" : "text-muted-foreground"}>{errPct}% err</span>
                            <span>{stat.avgLatency}ms avg</span>
                          </div>
                        </div>
                        <div className="h-2 bg-border/20 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-brand-500 to-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>

              <h3 className="text-sm font-extrabold text-foreground mt-2">Token Usage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.tokens.filter((t) => !t.revoked).map((tok) => (
                  <div key={tok.id} className="p-4 bg-background border border-border/30 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl shrink-0"><Key className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground">{tok.name}</div>
                      <div className="text-[10px] text-muted-foreground">{tok.usageCount.toLocaleString()} total · {tok.requestsToday} today</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-foreground">{tok.rateLimitPerMinute}/m</div>
                      <div className="text-[10px] text-muted-foreground">rate limit</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── REQUEST HISTORY ── */}
          {tab === "history" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-foreground">Request History</h3>
                <span className="text-xs text-muted-foreground font-semibold">{allLogs.length} total requests</span>
              </div>

              {allLogs.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Clock className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm font-bold">No request history yet</p>
                </div>
              )}

              <div className="border border-border/30 rounded-2xl overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-border/10 border-b border-border/20 text-muted-foreground font-black text-[10px] uppercase tracking-wider">
                      <th className="p-3 pl-4 text-left">Method</th>
                      <th className="p-3 text-left">Endpoint</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Latency</th>
                      <th className="p-3 text-left">Token</th>
                      <th className="p-3 pr-4 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/15">
                    {pagedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-border/5 transition">
                        <td className="p-3 pl-4"><MethodBadge method={log.method} /></td>
                        <td className="p-3 font-mono text-foreground text-[10px]">{log.endpoint}</td>
                        <td className="p-3"><StatusBadge code={log.statusCode} /></td>
                        <td className="p-3 text-muted-foreground font-semibold">
                          <span className={log.latencyMs > 150 ? "text-amber-600" : ""}>{log.latencyMs}ms</span>
                        </td>
                        <td className="p-3 text-muted-foreground text-[10px] font-semibold max-w-[120px] truncate">{log.tokenName}</td>
                        <td className="p-3 pr-4 text-muted-foreground text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalHistoryPages > 1 && (
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Page {historyPage} of {totalHistoryPages}</span>
                  <div className="flex gap-2">
                    <button disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => p - 1)}
                      className="px-3 py-1.5 bg-border/40 border border-border/60 rounded-xl disabled:opacity-40 text-foreground font-bold transition hover:bg-border/60">Prev</button>
                    <button disabled={historyPage >= totalHistoryPages} onClick={() => setHistoryPage((p) => p + 1)}
                      className="px-3 py-1.5 bg-brand-500 text-white rounded-xl disabled:opacity-40 font-bold transition hover:bg-brand-600">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
