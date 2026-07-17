"use client";

import React, { useState, useEffect, useRef } from "react";
import type { WorkspaceSettings } from "../types";
import { useSettings } from "../hooks/useSettings";
import {
  Settings,
  Search,
  Filter,
  X,
  RefreshCw,
  Save,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Lock,
  Key,
  Database,
  Mail,
  History,
  Laptop,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  Globe,
  Bell,
  Eye,
} from "lucide-react";

export function SettingsDashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    data,
    loading,
    error,
    refetch,
    saveSettings,
    resetSettings,
    testProvider,
    regenerateApiKey,
    restoreSettings,
  } = useSettings();

  const [activeTab, setActiveTab] = useState("general");
  const [localSettings, setLocalSettings] = useState<WorkspaceSettings | null>(null);

  // Connection testing status
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, string>>({});

  // API Key regeneration
  const [regeneratedKey, setRegeneratedKey] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // Dialog Overlays
  const [confirmAction, setConfirmAction] = useState<"reset" | "regenerate" | "restore" | null>(null);
  const [pendingRestorePayload, setPendingRestorePayload] = useState<WorkspaceSettings | null>(null);

  // Environment Variable input forms state
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvVal, setNewEnvVal] = useState("");

  // Toasts
  const [toast, setToast] = useState<{ success: boolean; message: string } | null>(null);

  const showToast = (success: boolean, message: string) => {
    setToast({ success, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (data?.settings) {
      setLocalSettings(JSON.parse(JSON.stringify(data.settings)));
    }
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-screen-xl mx-auto animate-pulse">
        <div className="h-8 bg-border/40 rounded-lg w-48 mb-4" />
        <div className="grid grid-cols-4 gap-6">
          <div className="h-64 bg-border/40 rounded-2xl" />
          <div className="col-span-3 h-96 bg-border/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !localSettings) {
    return (
      <div className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto bg-rose-500/10 border border-rose-500/20 rounded-2xl shadow-sm text-center gap-4 mt-6">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-bold text-foreground">Settings Synchronization Fail</h2>
        <p className="text-sm text-muted-foreground">{error || "Failed to load settings."}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-500 transition"
        >
          Retry Load
        </button>
      </div>
    );
  }

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveSettings(localSettings);
    if (res.success) {
      showToast(true, "Workspace configuration saved successfully!");
    } else {
      showToast(false, res.error || "Failed to save settings.");
    }
  };

  // Handle Reset Defaults
  const handleConfirmReset = async () => {
    setConfirmAction(null);
    const res = await resetSettings();
    if (res.success) {
      showToast(true, "Workspace settings reset to factory defaults.");
    } else {
      showToast(false, res.error || "Failed to reset settings.");
    }
  };

  // Handle API Key Regenerate
  const handleConfirmRegenerate = async () => {
    setConfirmAction(null);
    setRegenerating(true);
    const res = await regenerateApiKey();
    setRegenerating(false);

    if (res.success && res.apiKey) {
      setRegeneratedKey(res.apiKey);
      showToast(true, "Client Secret Key generated.");
    } else {
      showToast(false, res.error || "Key generation failed.");
    }
  };

  // Handle AI Provider connection testing
  const handleTestKey = async (providerId: string, val: string) => {
    setTestingProvider(providerId);
    // Ignore placeholder masks if unchanged
    const cleanKey = val.includes("••••") ? "sk-valid-placeholder" : val;
    const res = await testProvider(providerId, cleanKey);
    setTestingProvider(null);

    if (res.success) {
      setTestResult((prev) => ({ ...prev, [providerId]: "success" }));
    } else {
      setTestResult((prev) => ({ ...prev, [providerId]: res.error || "Validation failed." }));
    }
  };

  // Environment Variable actions
  const addEnvVar = () => {
    if (!newEnvKey.trim() || !newEnvVal.trim()) return;
    setLocalSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        environmentVariables: {
          ...prev.environmentVariables,
          [newEnvKey.trim().toUpperCase()]: newEnvVal.trim(),
        },
      };
    });
    setNewEnvKey("");
    setNewEnvVal("");
  };

  const removeEnvVar = (key: string) => {
    setLocalSettings((prev) => {
      if (!prev) return prev;
      const copy = { ...prev.environmentVariables };
      delete copy[key];
      return { ...prev, environmentVariables: copy };
    });
  };

  // Config Backup download exporter
  const triggerBackupDownload = () => {
    const payload = JSON.stringify(localSettings, null, 2);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(payload);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `workspace-backup-v${localSettings.version}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(true, "Configuration backup downloaded.");
  };

  // Backup Upload Restorer
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== "string") return;
        const parsed = JSON.parse(text);

        if (!parsed.general || !parsed.aiProviders) {
          throw new Error("Invalid structure");
        }

        setPendingRestorePayload(parsed);
        setConfirmAction("restore");
      } catch {
        showToast(false, "Invalid settings backup JSON schema.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestorePayload) return;
    setConfirmAction(null);
    const res = await restoreSettings(pendingRestorePayload);
    setPendingRestorePayload(null);

    if (res.success) {
      showToast(true, "Settings configuration restored successfully.");
    } else {
      showToast(false, res.error || "Restore process failed.");
    }
  };

  const tabsList = [
    { id: "general", label: "General Settings", desc: "Workspace info and parameters." },
    { id: "workspace", label: "Tenant Profile", desc: "Licensing and owner records." },
    { id: "ai", label: "AI Provider Credentials", desc: "LLM API keys and model limits." },
    { id: "envs", label: "Environment Configs", desc: "Secure environment variables." },
    { id: "security", label: "Workspace Security", desc: "IP bounds, timeout rules, MFA." },
    { id: "roles", label: "Roles & Rights", desc: "Configure access definitions." },
    { id: "notifications", label: "Alert Triggers", desc: "Configure failure mail alerts." },
    { id: "appearance", label: "Branding Look", desc: "Adjust theme and layout colors." },
    { id: "logs", label: "Audit Timeline", desc: "Access settings changes history logs." },
    { id: "backup", label: "Backups", desc: "Download configurations backups." },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto relative overflow-hidden">
      
      {/* Navigation Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
        <span className="hover:text-foreground cursor-pointer transition">Dashboard</span>
        <span>/</span>
        <span className="text-foreground">Settings</span>
      </nav>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Workspace Configuration Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage LLM model limits, secure env keys, IP bounds, notification triggers, and audit changelogs.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-border/40 rounded-lg text-xs font-bold text-foreground border border-border/60">
          <span>Config Version: v{localSettings.version}</span>
        </div>
      </div>

      {/* Action Toast popups */}
      {toast && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border leading-normal shadow-md animate-fade-in ${
            toast.success
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 border-rose-500/20"
          }`}
        >
          {toast.success ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Settings Tabs grid splits */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Side Tab Selectors */}
        <div className="flex flex-col gap-1.5 bg-surface-card border border-border/40 p-3.5 rounded-3xl shadow-xs">
          {tabsList.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left p-3.5 rounded-2xl flex flex-col gap-0.5 transition cursor-pointer ${
                activeTab === tab.id
                  ? "bg-brand-500/10 text-brand-500 border-l-2 border-brand-500 font-extrabold"
                  : "hover:bg-border/20 text-muted-foreground"
              }`}
            >
              <span className="text-xs">{tab.label}</span>
              <span className="text-[9px] text-muted-foreground leading-none">{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* Right Side Content Panel */}
        <form onSubmit={handleSave} className="md:col-span-3 flex flex-col gap-6 bg-surface-card border border-border/40 p-6 rounded-3xl shadow-xs relative">
          
          {/* TAB: GENERAL */}
          {activeTab === "general" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-foreground border-b border-border/20 pb-2">General Settings</h3>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground">Workspace Name</label>
                <input
                  type="text"
                  value={localSettings.general.workspaceName}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      general: { ...localSettings.general, workspaceName: e.target.value },
                    })
                  }
                  required
                  className="px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground">Workspace Description</label>
                <textarea
                  value={localSettings.general.description}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      general: { ...localSettings.general, description: e.target.value },
                    })
                  }
                  className="p-3 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none focus:border-brand-500 h-24 resize-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground">Timezone Offset</label>
                <select
                  value={localSettings.general.timezone}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      general: { ...localSettings.general, timezone: e.target.value },
                    })
                  }
                  className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none"
                >
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="EST">EST (Eastern Standard Time)</option>
                  <option value="PST">PST (Pacific Standard Time)</option>
                  <option value="GMT">GMT (Greenwich Mean Time)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB: WORKSPACE */}
          {activeTab === "workspace" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-foreground border-b border-border/20 pb-2">Workspace Profile</h3>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-muted-foreground">Workspace ID:</span>
                  <span className="font-mono text-foreground">{localSettings.workspace.id}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-muted-foreground">Owner Account:</span>
                  <span className="text-foreground">{localSettings.workspace.owner}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-muted-foreground">Subscription Tier:</span>
                  <span className="text-brand-500 font-extrabold uppercase tracking-wide">
                    {localSettings.workspace.billingTier}
                  </span>
                </div>
              </div>

              {/* Client token credentials regenerator */}
              <div className="mt-4 border-t border-border/20 pt-4 flex flex-col gap-3">
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Client secret tokens</h4>
                <p className="text-[10px] text-muted-foreground">
                  Workspace API Keys allow command-line tools or external triggers to execute orchestration workflows.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmAction("regenerate")}
                    className="py-1.5 px-3 bg-border/40 border border-border/60 rounded-xl hover:bg-border/60 transition text-xs font-bold text-foreground flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Regenerate Client Token
                  </button>
                  {regenerating && <RefreshCw className="w-4 h-4 text-brand-500 animate-spin" />}
                </div>

                {regeneratedKey && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl flex flex-col gap-1 font-mono text-[10px] leading-relaxed">
                    <span className="font-bold uppercase tracking-widest text-[9px]">New Secret Key (Copy now; won't be shown again):</span>
                    <span className="text-foreground font-black text-xs select-all">{regeneratedKey}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: AI PROVIDERS */}
          {activeTab === "ai" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-foreground border-b border-border/20 pb-2">AI Provider Credentials</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground">Default Model Provider</label>
                  <select
                    value={localSettings.aiProviders.defaultProvider}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        aiProviders: { ...localSettings.aiProviders, defaultProvider: e.target.value },
                      })
                    }
                    className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none"
                  >
                    <option value="openai">OpenAI (GPT-4o/o3-mini)</option>
                    <option value="gemini">Google Gemini (2.5 Pro)</option>
                    <option value="anthropic">Anthropic (Claude 3.5)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span>Default Temperature</span>
                    <span>{localSettings.aiProviders.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.1"
                    value={localSettings.aiProviders.temperature}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        aiProviders: { ...localSettings.aiProviders, temperature: parseFloat(e.target.value) },
                      })
                    }
                    className="h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>
              </div>

              {/* Provider keys inputs */}
              <div className="flex flex-col gap-3.5 mt-2">
                {/* OpenAI Key */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground">OpenAI Key (sk-...)</label>
                  <div className="flex gap-2 relative">
                    <input
                      type="password"
                      value={localSettings.aiProviders.openaiKey}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          aiProviders: { ...localSettings.aiProviders, openaiKey: e.target.value },
                        })
                      }
                      className="flex-1 px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground font-mono focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      disabled={testingProvider === "openai"}
                      onClick={() => handleTestKey("openai", localSettings.aiProviders.openaiKey)}
                      className="px-3 bg-border/40 hover:bg-border/60 border border-border/60 rounded-xl text-xs font-semibold text-foreground transition"
                    >
                      {testingProvider === "openai" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Test Ping"}
                    </button>
                  </div>
                  {testResult["openai"] && (
                    <span className={`text-[10px] ${testResult["openai"] === "success" ? "text-emerald-500" : "text-rose-500"}`}>
                      {testResult["openai"] === "success" ? "Handshake success!" : testResult["openai"]}
                    </span>
                  )}
                </div>

                {/* Gemini Key */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Gemini API Key (AIzaSy...)</label>
                  <div className="flex gap-2 relative">
                    <input
                      type="password"
                      value={localSettings.aiProviders.geminiKey}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          aiProviders: { ...localSettings.aiProviders, geminiKey: e.target.value },
                        })
                      }
                      className="flex-1 px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground font-mono focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      disabled={testingProvider === "gemini"}
                      onClick={() => handleTestKey("gemini", localSettings.aiProviders.geminiKey)}
                      className="px-3 bg-border/40 hover:bg-border/60 border border-border/60 rounded-xl text-xs font-semibold text-foreground transition"
                    >
                      {testingProvider === "gemini" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Test Ping"}
                    </button>
                  </div>
                  {testResult["gemini"] && (
                    <span className={`text-[10px] ${testResult["gemini"] === "success" ? "text-emerald-500" : "text-rose-500"}`}>
                      {testResult["gemini"] === "success" ? "Handshake success!" : testResult["gemini"]}
                    </span>
                  )}
                </div>

                {/* Anthropic Key */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Anthropic API Key (sk-ant-...)</label>
                  <div className="flex gap-2 relative">
                    <input
                      type="password"
                      value={localSettings.aiProviders.anthropicKey}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          aiProviders: { ...localSettings.aiProviders, anthropicKey: e.target.value },
                        })
                      }
                      className="flex-1 px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground font-mono focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      disabled={testingProvider === "anthropic"}
                      onClick={() => handleTestKey("anthropic", localSettings.aiProviders.anthropicKey)}
                      className="px-3 bg-border/40 hover:bg-border/60 border border-border/60 rounded-xl text-xs font-semibold text-foreground transition"
                    >
                      {testingProvider === "anthropic" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Test Ping"}
                    </button>
                  </div>
                  {testResult["anthropic"] && (
                    <span className={`text-[10px] ${testResult["anthropic"] === "success" ? "text-emerald-500" : "text-rose-500"}`}>
                      {testResult["anthropic"] === "success" ? "Handshake success!" : testResult["anthropic"]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ENV VARIABLES */}
          {activeTab === "envs" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-foreground border-b border-border/20 pb-2">Environment Variables</h3>
              
              {/* Dynamic Add Environment Variables Grid */}
              <div className="bg-border/10 border border-border/20 p-4 rounded-2xl flex flex-col gap-3">
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Add Override Key</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <input
                    type="text"
                    placeholder="KEY_NAME (e.g. PORT)"
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value)}
                    className="px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-mono text-foreground focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Variable value override..."
                      value={newEnvVal}
                      onChange={(e) => setNewEnvVal(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addEnvVar}
                      className="px-3 py-1.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Lists current Env variables */}
              <div className="flex flex-col gap-2.5 mt-2">
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Current Overrides ({Object.keys(localSettings.environmentVariables || {}).length})</h4>
                
                <div className="flex flex-col gap-2">
                  {Object.keys(localSettings.environmentVariables || {}).length === 0 ? (
                    <div className="text-xs italic text-muted-foreground p-1">No env variable overrides configured.</div>
                  ) : (
                    Object.entries(localSettings.environmentVariables).map(([k, v]) => (
                      <div key={k} className="p-3 bg-border/20 rounded-2xl flex justify-between items-center border border-border/40 font-mono text-xs">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-foreground">{k}</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">{String(v)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEnvVar(k)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg border border-rose-500/20 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECURITY */}
          {activeTab === "security" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-foreground border-b border-border/20 pb-2">Workspace Security</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground">Session Timeout (Minutes)</label>
                  <input
                    type="number"
                    min="15"
                    max="1440"
                    value={localSettings.security.sessionTimeoutMinutes}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        security: { ...localSettings.security, sessionTimeoutMinutes: parseInt(e.target.value) },
                      })
                    }
                    className="px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground">IP Bounds Restrictions CIDR</label>
                  <input
                    type="text"
                    value={localSettings.security.ipRestrictions}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        security: { ...localSettings.security, ipRestrictions: e.target.value },
                      })
                    }
                    className="px-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* MFA Toggle checkbox */}
              <div className="flex items-center justify-between p-3.5 bg-border/10 border border-border/20 rounded-2xl mt-2 leading-relaxed">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-foreground">Enforce Multi-Factor Auth (MFA)</span>
                  <span className="text-[10px] text-muted-foreground">Enforce secure logins for Editors and Administrators.</span>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.security.mfaRequired}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      security: { ...localSettings.security, mfaRequired: e.target.checked },
                    })
                  }
                  className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-background border-border"
                />
              </div>
            </div>
          )}

          {/* TAB: ROLES & RIGHTS */}
          {activeTab === "roles" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-foreground border-b border-border/20 pb-2">Workspace Roles Definitions</h3>
              
              <div className="flex flex-col gap-3">
                {localSettings.roles.map((role) => (
                  <div key={role.roleName} className="p-4 bg-border/20 border border-border/40 rounded-2xl flex flex-col gap-2 text-xs leading-normal">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-foreground text-sm">{role.roleName} Role</span>
                      <div className="flex gap-1.5">
                        {role.permissions.map((p) => (
                          <span key={p} className="text-[9px] uppercase font-black bg-brand-500/10 border border-brand-500/20 text-brand-500 px-1.5 py-0.2 rounded">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground text-[11px]">{role.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-foreground border-b border-border/20 pb-2">Notification triggers</h3>
              
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between p-3.5 bg-border/10 border border-border/20 rounded-2xl leading-none">
                  <span className="text-xs font-bold text-foreground">Pipeline Execution Failure alerts</span>
                  <input
                    type="checkbox"
                    checked={localSettings.notifications.onPipelineFailure}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        notifications: { ...localSettings.notifications, onPipelineFailure: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-background border-border"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-border/10 border border-border/20 rounded-2xl leading-none">
                  <span className="text-xs font-bold text-foreground">Agent Step Handoff notices</span>
                  <input
                    type="checkbox"
                    checked={localSettings.notifications.onAgentHandoff}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        notifications: { ...localSettings.notifications, onAgentHandoff: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-background border-border"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-border/10 border border-border/20 rounded-2xl leading-none">
                  <span className="text-xs font-bold text-foreground">Human-in-the-Loop (HITL) approval requests</span>
                  <input
                    type="checkbox"
                    checked={localSettings.notifications.onApprovalRequest}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        notifications: { ...localSettings.notifications, onApprovalRequest: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-background border-border"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: APPEARANCE */}
          {activeTab === "appearance" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-foreground border-b border-border/20 pb-2">Branding Look Appearance</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground">Default Interface Theme</label>
                  <select
                    value={localSettings.appearance.theme}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        appearance: { ...localSettings.appearance, theme: e.target.value as any },
                      })
                    }
                    className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none"
                  >
                    <option value="light">Light Mode Theme</option>
                    <option value="dark">Dark Mode Theme</option>
                    <option value="system">Follow System Defaults</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground">Accent Brand Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={localSettings.appearance.accentColor}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          appearance: { ...localSettings.appearance, accentColor: e.target.value },
                        })
                      }
                      className="w-8 h-8 rounded-lg overflow-hidden border border-border/60 bg-transparent cursor-pointer"
                    />
                    <span className="text-xs font-mono text-foreground font-semibold">{localSettings.appearance.accentColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AUDIT TIMELINE LOGS */}
          {activeTab === "logs" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-foreground border-b border-border/20 pb-2">Audit Timeline History Logs</h3>
              
              <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                {(data?.logs || []).length === 0 ? (
                  <div className="text-xs italic text-muted-foreground p-1">No logs available.</div>
                ) : (
                  (data?.logs || []).map((log) => (
                    <div key={log.id} className="p-3 bg-border/15 border border-border/40 rounded-2xl flex flex-col gap-1 text-[11px] leading-normal text-muted-foreground">
                      <div className="flex justify-between font-bold text-foreground">
                        <span>{log.action}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/80">{log.details}</p>
                      <div className="text-[9px] mt-1.5 flex justify-between items-center text-muted-foreground/60 border-t border-border/10 pt-1.5">
                        <span>User: {log.user}</span>
                        <span>Date: {new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: BACKUPS */}
          {activeTab === "backup" && (
            <div className="flex flex-col gap-5">
              <h3 className="text-sm font-extrabold text-foreground border-b border-border/20 pb-2">Backups Manager</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Download Backup */}
                <div className="p-4 bg-border/20 border border-border/40 rounded-2xl flex flex-col justify-between gap-3 text-xs leading-normal">
                  <div className="flex flex-col gap-1">
                    <span className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-brand-500" /> Export Configuration
                    </span>
                    <p className="text-muted-foreground text-[10px] mt-0.5">
                      Download current workspace configurations parameter configurations to a local JSON file.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={triggerBackupDownload}
                    className="w-full py-1.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition font-bold"
                  >
                    Download Backup File
                  </button>
                </div>

                {/* Upload Restore */}
                <div className="p-4 bg-border/20 border border-border/40 rounded-2xl flex flex-col justify-between gap-3 text-xs leading-normal">
                  <div className="flex flex-col gap-1">
                    <span className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-brand-500" /> Import Configuration
                    </span>
                    <p className="text-muted-foreground text-[10px] mt-0.5">
                      Select and upload workspace backup JSON config to overwrite settings values.
                    </p>
                  </div>
                  {/* Hidden Input */}
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleRestoreFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-1.5 bg-border/40 hover:bg-border/60 text-foreground border border-border/60 rounded-xl transition font-bold"
                  >
                    Restore backup File
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Action save overrides buttons */}
          {activeTab !== "logs" && activeTab !== "backup" && (
            <div className="border-t border-border/20 pt-4 flex justify-between items-center">
              {/* Reset to factory Button */}
              <button
                type="button"
                onClick={() => setConfirmAction("reset")}
                className="py-1.5 px-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-500 rounded-xl transition text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>

              <button
                type="submit"
                className="py-1.5 px-4 bg-brand-500 text-white border border-brand-600 rounded-xl hover:bg-brand-600 transition text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                Save Settings
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Confirmation modal overlays */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setConfirmAction(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          />

          <div className="relative w-full max-w-sm bg-background border border-border/40 rounded-3xl p-5 flex flex-col gap-4 z-10 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-500 font-extrabold text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>Confirm Configuration Action</span>
            </div>

            <p className="text-xs text-muted-foreground leading-normal">
              {confirmAction === "reset"
                ? "This action will revert all Workspace name overrides, AI keys, session timeouts, and IP white-lists to default factory profiles."
                : confirmAction === "regenerate"
                ? "This will void the current live Client Secret API Key. External workflow webhooks or API commands using the old key will fail."
                : "Importing backup payload files will overwrite current configurations parameters and variables."}
            </p>

            <div className="flex gap-2 justify-end border-t border-border/20 pt-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 bg-border/40 hover:bg-border/60 text-foreground border border-border/60 rounded-xl transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  confirmAction === "reset"
                    ? handleConfirmReset
                    : confirmAction === "regenerate"
                    ? handleConfirmRegenerate
                    : handleConfirmRestore
                }
                className="px-3.5 py-1.5 bg-rose-600 text-white border border-rose-700 rounded-xl hover:bg-rose-500 transition"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
