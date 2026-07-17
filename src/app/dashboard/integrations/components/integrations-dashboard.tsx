"use client";

import React, { useState } from "react";
import type { IntegrationFilters, IntegrationItem } from "../types";
import { useIntegrations } from "../hooks/useIntegrations";
import {
  Plug,
  Cpu,
  MessageSquare,
  Database,
  Mail,
  Search,
  Filter,
  X,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Settings,
  Lock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export function IntegrationsDashboard() {
  const [filters, setFilters] = useState<IntegrationFilters>({
    search: "",
    category: "",
    status: "",
  });

  const {
    data,
    loading,
    error,
    refetch,
    connectIntegration,
    disconnectIntegration,
    testIntegration,
  } = useIntegrations(filters);

  // Modal State
  const [activeConfigProv, setActiveConfigProv] = useState<IntegrationItem | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Loading states per card for row action Test connectivity
  const [cardTestingId, setCardTestingId] = useState<string | null>(null);
  const [cardTestRes, setCardTestRes] = useState<Record<string, string>>({});

  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: "",
      category: "",
      status: "",
    });
  };

  // Helper to open modal for connection / update
  const openConfigModal = (prov: IntegrationItem) => {
    setActiveConfigProv(prov);
    setTestResult(null);
    setTesting(false);
    setSubmitting(false);

    // Initial fields template mapping based on providerId
    const template: Record<string, string> = {};
    if (["openai", "gemini", "anthropic", "groq", "resend", "sendgrid"].includes(prov.id)) {
      template.apiKey = prov.connected ? "••••••••••••••••••••••••" : "";
    } else if (prov.id === "azure_openai") {
      template.apiKey = prov.connected ? "••••••••••••••••••••" : "";
      template.endpoint = "";
      template.deploymentId = "";
    } else if (prov.id === "ollama") {
      template.endpoint = "http://localhost:11434";
    } else if (prov.id === "slack") {
      template.botToken = prov.connected ? "xoxb-••••••••••••••••••••" : "";
      template.channel = "#general";
    } else if (prov.id === "discord") {
      template.botToken = prov.connected ? "••••••••••••••••••••" : "";
      template.clientId = "";
    } else if (prov.id === "notion") {
      template.apiToken = prov.connected ? "secret_••••••••••••••••••••" : "";
    } else if (prov.id === "google_sheets") {
      template.clientId = "";
      template.clientSecret = prov.connected ? "••••••••••••••••••••" : "";
    } else if (prov.id === "smtp") {
      template.host = "smtp.mailtrap.io";
      template.port = "2525";
      template.username = "";
      template.password = prov.connected ? "••••••••••••••••" : "";
    } else if (["postgresql", "mysql", "sqlserver", "mongodb"].includes(prov.id)) {
      template.connectionString = prov.connected ? "••••••••••••••••••••••••••••••••" : "";
    }

    setFormFields(template);
  };

  // Inline Connection test checking
  const handleTestConnection = async (id: string, explicitSecrets?: Record<string, string>) => {
    setCardTestingId(id);
    // Remove masked indicator secrets from input fields when testing saved configurations
    const cleanSecrets = explicitSecrets ? { ...explicitSecrets } : undefined;
    if (cleanSecrets) {
      for (const [k, v] of Object.entries(cleanSecrets)) {
        if (v.includes("••••")) delete cleanSecrets[k];
      }
    }

    const res = await testIntegration(id, cleanSecrets);
    setCardTestingId(null);
    if (res.success) {
      setCardTestRes((prev) => ({ ...prev, [id]: "success" }));
      setTimeout(() => setCardTestRes((prev) => ({ ...prev, [id]: "" })), 4000);
    } else {
      setCardTestRes((prev) => ({ ...prev, [id]: res.error || "Handshake Rejected." }));
    }
  };

  // Modal validation check
  const runModalTest = async () => {
    if (!activeConfigProv) return;
    setTesting(true);
    setTestResult(null);

    // Filter out placeholders masked passwords
    const cleanSecrets = { ...formFields };
    for (const [k, v] of Object.entries(cleanSecrets)) {
      if (v.includes("••••")) delete cleanSecrets[k];
    }

    const res = await testIntegration(activeConfigProv.id, cleanSecrets);
    setTesting(false);
    if (res.success) {
      setTestResult({ success: true, message: res.message || "Credential configuration validated successfully!" });
    } else {
      setTestResult({ success: false, error: res.error || "Handshake validation failed." });
    }
  };

  // Modal form submission saving
  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConfigProv) return;
    setSubmitting(true);

    const cleanSecrets = { ...formFields };
    for (const [k, v] of Object.entries(cleanSecrets)) {
      if (v.includes("••••")) delete cleanSecrets[k];
    }

    const res = await connectIntegration(activeConfigProv.id, cleanSecrets);
    setSubmitting(false);
    if (res.success) {
      setActiveConfigProv(null);
      refetch();
    } else {
      setTestResult({ success: false, error: res.error || "Failed to establish integration." });
    }
  };

  const handleDisconnect = async (id: string) => {
    const res = await disconnectIntegration(id);
    if (res.success) {
      refetch();
    }
  };

  // Icon mapping helpers
  const getProviderIcon = (category: string) => {
    switch (category) {
      case "ai":
        return <Cpu className="w-5 h-5" />;
      case "messaging":
        return <MessageSquare className="w-5 h-5" />;
      case "database":
        return <Database className="w-5 h-5" />;
      case "email":
        return <Mail className="w-5 h-5" />;
      default:
        return <Plug className="w-5 h-5" />;
    }
  };

  const renderHealthIndicator = (status: string, connected: boolean) => {
    if (!connected) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-500 border border-gray-500/20">
          Disconnected
        </span>
      );
    }

    switch (status.toLowerCase()) {
      case "healthy":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Healthy
          </span>
        );
      case "degraded":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 border border-orange-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Degraded
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-500/10 text-neutral-600 border border-neutral-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto relative overflow-hidden">
      
      {/* Navigation Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
        <span className="hover:text-foreground cursor-pointer transition">Dashboard</span>
        <span>/</span>
        <span className="text-foreground">Integrations</span>
      </nav>

      {/* Top Header Layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Third-Party Integrations Manager
            {loading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect AI model providers, communications channels, data buckets, and mail systems securely.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500 fill-current" />
          <span>Active AES-256 Secrets Encryption</span>
        </div>
      </div>

      {/* Filters Form and Search */}
      <div className="bg-surface-card border border-border/40 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
          {/* Keyword Search */}
          <div className="relative w-full md:w-64 text-xs">
            <input
              type="text"
              placeholder="Search providers..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs focus:outline-none focus:border-brand-500 text-foreground"
            />
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
          </div>

          {/* Category selection */}
          <div className="flex flex-col text-[10px] gap-0.5">
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-semibold focus:outline-none text-foreground"
            >
              <option value="">All Categories</option>
              <option value="ai">AI Runtimes</option>
              <option value="messaging">Communications</option>
              <option value="workspace">Workspaces</option>
              <option value="email">Transactional Email</option>
              <option value="database">Database Buckets</option>
            </select>
          </div>

          {/* Status filter selection */}
          <div className="flex flex-col text-[10px] gap-0.5">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-semibold focus:outline-none text-foreground"
            >
              <option value="">All Connections</option>
              <option value="connected">Connected Only</option>
              <option value="disconnected">Disconnected Only</option>
            </select>
          </div>
        </div>

        <button
          onClick={resetFilters}
          className="text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
        >
          Reset Filters
        </button>
      </div>

      {/* loading skeleton grids */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-border/40 rounded-2xl" />
          ))}
        </div>
      )}

      {/* error warning state */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto bg-rose-500/10 border border-rose-500/20 rounded-2xl shadow-sm text-center gap-4 mt-6">
          <AlertTriangle className="w-12 h-12 text-rose-500" />
          <h2 className="text-lg font-bold text-foreground">Integrations Loading Error</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-500 transition"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* empty results illustration */}
      {data && data.integrations.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-surface-card border border-border/40 rounded-3xl shadow-sm text-center gap-3">
          <Plug className="w-12 h-12 text-border" />
          <h3 className="text-md font-bold text-foreground">No Integrations Match Filters</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Refine search query strings or status properties to display supporting credentials templates.
          </p>
        </div>
      )}

      {/* Main Integrations cards grid */}
      {data && data.integrations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.integrations.map((item) => (
            <div
              key={item.id}
              className={`p-5 bg-surface-card border border-border/40 rounded-3xl shadow-xs flex flex-col justify-between gap-5 hover:shadow-md transition relative group overflow-hidden ${
                item.connected ? "ring-1 ring-brand-500/10" : ""
              }`}
            >
              <div className="flex flex-col gap-3">
                {/* Card Title Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-brand-500/10 rounded-2xl text-brand-500">
                      {getProviderIcon(item.category)}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">{item.name}</h3>
                      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest leading-none mt-0.5 block">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  {renderHealthIndicator(item.health, item.connected)}
                </div>

                {/* Card Body Description */}
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Card Footer sync actions */}
              <div className="border-t border-border/20 pt-4 flex flex-col gap-3">
                {item.connected && (
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                    <span>Last Sync:</span>
                    <span>
                      {item.lastSync ? new Date(item.lastSync).toLocaleTimeString() : "Never Synced"}
                    </span>
                  </div>
                )}

                {/* Inline operational notifications */}
                {cardTestRes[item.id] && (
                  <div
                    className={`p-2 rounded-xl text-[10px] flex items-center gap-1.5 leading-tight ${
                      cardTestRes[item.id] === "success"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                    }`}
                  >
                    {cardTestRes[item.id] === "success" ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Ping handshake success!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate" title={cardTestRes[item.id]}>
                          {cardTestRes[item.id]}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Card operations */}
                <div className="flex flex-wrap gap-2">
                  {!item.connected ? (
                    <button
                      onClick={() => openConfigModal(item)}
                      className="flex-1 py-1.5 text-xs font-bold bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition shadow-xs flex items-center justify-center gap-1"
                    >
                      Connect
                    </button>
                  ) : (
                    <>
                      <button
                        disabled={cardTestingId === item.id}
                        onClick={() => handleTestConnection(item.id)}
                        className="flex-1 py-1.5 text-xs font-semibold bg-border/40 border border-border/60 hover:bg-border/70 rounded-xl transition flex items-center justify-center gap-1"
                      >
                        {cardTestingId === item.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Test ping"
                        )}
                      </button>

                      <button
                        onClick={() => openConfigModal(item)}
                        className="p-1.5 bg-border/40 border border-border/60 hover:bg-border/70 rounded-xl transition"
                        title="Update credentials"
                      >
                        <Settings className="w-3.5 h-3.5 text-foreground" />
                      </button>

                      <button
                        onClick={() => handleDisconnect(item.id)}
                        className="py-1.5 px-2.5 text-xs font-semibold border border-rose-500/20 hover:bg-rose-500/10 text-rose-500 rounded-xl transition"
                        title="Disconnect"
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Integration Credentials Modal Dialog */}
      {activeConfigProv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* dim back blur mask */}
          <div
            onClick={() => setActiveConfigProv(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Modal card content */}
          <div className="relative w-full max-w-md bg-background border border-border/40 rounded-3xl shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto z-10">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500">
                  {getProviderIcon(activeConfigProv.category)}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Configure {activeConfigProv.name}</h3>
                  <span className="text-[10px] text-muted-foreground tracking-wide font-semibold block uppercase">
                    Secrets persists under AES encryption
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveConfigProv(null)}
                className="p-1.5 rounded-lg hover:bg-border/40 text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inputs Form */}
            <form onSubmit={handleSaveConnection} className="flex flex-col gap-4">
              <div className="flex flex-col gap-3.5">
                {Object.keys(formFields).map((fieldKey) => (
                  <div key={fieldKey} className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground capitalize">
                      {fieldKey === "apiKey"
                        ? "API Key String"
                        : fieldKey === "botToken"
                        ? "Slack Bot Token (xoxb-)"
                        : fieldKey === "apiToken"
                        ? "Notion API Token (secret_)"
                        : fieldKey === "clientSecret"
                        ? "OAuth Client Secret"
                        : fieldKey === "connectionString"
                        ? "Database Connection URI"
                        : fieldKey}
                    </label>
                    <div className="relative">
                      <input
                        type={fieldKey.toLowerCase().includes("key") || fieldKey.toLowerCase().includes("token") || fieldKey.toLowerCase().includes("secret") || fieldKey.toLowerCase().includes("password") ? "password" : "text"}
                        value={formFields[fieldKey]}
                        onChange={(e) => setFormFields({ ...formFields, [fieldKey]: e.target.value })}
                        required
                        className="w-full px-3 py-1.5 pr-8 bg-background border border-border/60 rounded-xl text-xs focus:outline-none focus:border-brand-500 text-foreground font-mono"
                        placeholder={`Enter ${fieldKey}...`}
                      />
                      <Lock className="w-3.5 h-3.5 text-muted-foreground/40 absolute right-3 top-2.5" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Status Test Banners */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 border leading-normal mt-1 ${
                    testResult.success
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                  }`}
                >
                  {testResult.success ? (
                    <>
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{testResult.message}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold text-[11px]">Validation Handshake Failure</h4>
                        <p className="text-[10px] mt-0.5">{testResult.error}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="border-t border-border/20 pt-4 flex gap-2">
                <button
                  type="button"
                  disabled={testing || submitting}
                  onClick={runModalTest}
                  className="flex-1 py-2 text-xs font-semibold bg-border/40 border border-border/60 hover:bg-border/70 text-foreground rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {testing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Test Ping"
                  )}
                </button>
                <button
                  type="submit"
                  disabled={submitting || testing}
                  className="flex-1 py-2 text-xs font-bold bg-brand-500 text-white border border-brand-600 rounded-xl hover:bg-brand-600 transition flex items-center justify-center gap-1 shadow-sm"
                >
                  {submitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Save & Connect"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
