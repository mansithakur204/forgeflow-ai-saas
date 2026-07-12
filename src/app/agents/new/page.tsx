"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SelectField, CheckboxField, SwitchField } from "@/components/ui/form-controls";
import { mockProviders, mockModels, mockTools, Agent } from "@/lib/agents-data";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  User,
  Cpu,
  Brain,
  Wrench,
  Eye,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Development", "Support", "Marketing", "HR", "Translation", "Finance", "Legal", "General"];
const EMOJIS = ["🤖", "💻", "🧠", "🔍", "🤝", "📈", "🛡️", "📅", "⚙️", "🌍", "📝", "💬"];
const COLORS = [
  { name: "Blue", class: "bg-blue-500" },
  { name: "Emerald", class: "bg-emerald-500" },
  { name: "Purple", class: "bg-purple-500" },
  { name: "Amber", class: "bg-amber-500" },
  { name: "Red", class: "bg-red-500" },
  { name: "Cyan", class: "bg-cyan-500" },
];

export default function CreateAgentWizard() {
  const router = useRouter();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isAuthLoaded && !isSignedIn) {
      router.push("/login");
    }
  }, [isAuthLoaded, isSignedIn, router]);

  if (!isAuthLoaded || !isSignedIn) {
    return (
      <RootLayoutShell>
        <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto h-full">
          <div className="flex flex-col gap-2 animate-pulse">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-8 w-64 bg-muted rounded mt-2" />
          </div>
          <div className="h-96 bg-muted rounded-xl mt-6 animate-pulse" />
        </div>
      </RootLayoutShell>
    );
  }

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [icon, setIcon] = useState("🤖");
  const [color, setColor] = useState("bg-blue-500");
  const [visibility, setVisibility] = useState("private");

  // LLM Config State
  const [providerId, setProviderId] = useState("openai");
  const [modelId, setModelId] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [streaming, setStreaming] = useState(true);
  const [jsonMode, setJsonMode] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful assistant. Provide clear and structured answers."
  );

  // Memory State
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [memoryType, setMemoryType] = useState<"conversation" | "vector" | "both">("both");
  const [memoryWindow, setMemoryWindow] = useState(10);
  const [retentionDays, setRetentionDays] = useState(30);

  // Tools State
  const [toolsEnabled, setToolsEnabled] = useState(true);
  const [selectedTools, setSelectedTools] = useState<string[]>(["tool-calc", "tool-file"]);
  const [permissionInternet, setPermissionInternet] = useState(true);
  const [permissionFiles, setPermissionFiles] = useState(true);
  const [permissionWebhooks, setPermissionWebhooks] = useState(false);

  // Filter models based on selected provider
  const filteredModels = mockModels.filter((m) => m.providerId === providerId);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prov = e.target.value;
    setProviderId(prov);
    const relatedModels = mockModels.filter((m) => m.providerId === prov);
    if (relatedModels.length > 0) {
      setModelId(relatedModels[0].id);
    }
  };

  const handleToolToggle = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(selectedTools.filter((t) => t !== toolId));
    } else {
      setSelectedTools([...selectedTools, toolId]);
    }
  };

  // Validations
  const validateStep = (s: number) => {
    if (s === 1) {
      if (!name.trim()) {
        toast.error("Please provide an Agent Name.");
        return false;
      }
      if (!description.trim()) {
        toast.error("Please provide a short description.");
        return false;
      }
    }
    if (s === 2) {
      if (!systemPrompt.trim()) {
        toast.error("Please declare a System Prompt.");
        return false;
      }
      if (maxTokens <= 0) {
        toast.error("Max tokens must be a positive integer.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    setStep((s) => s - 1);
  };

  const handleCreateAgent = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      setStep(1);
      return;
    }

    toast.success("Creating agent configuration...");
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: name.toLowerCase().replace(/\s+/g, "-"),
          name,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register agent");
      }
      toast.success(`Agent "${name}" successfully deployed!`);
      router.push("/agents");
    } catch (err: any) {
      toast.error(`Failed to deploy agent: ${err.message}`);
    }
  };

  const wizardSteps = [
    { num: 1, label: "Basic Info", icon: <User className="w-4 h-4" /> },
    { num: 2, label: "LLM Config", icon: <Cpu className="w-4 h-4" /> },
    { num: 3, label: "Memory Settings", icon: <Brain className="w-4 h-4" /> },
    { num: 4, label: "Tools & Scopes", icon: <Wrench className="w-4 h-4" /> },
    { num: 5, label: "Review & Deploy", icon: <Eye className="w-4 h-4" /> },
  ];

  return (
    <RootLayoutShell>
      <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto h-full">
        {/* Header */}
        <PageHeader
          title="Create New Agent"
          description="Build and deploy a custom AI agent tailored to your workflow by configuring memory, models, and third-party integrations."
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Step Navigator */}
          <div className="lg:col-span-1 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-3 lg:pb-0 border-b lg:border-b-0 border-border/40">
            {wizardSteps.map((s) => {
              const isActive = step === s.num;
              const isCompleted = step > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    // Jump to previous steps, but only go forward if active step validates
                    if (s.num < step) {
                      setStep(s.num);
                    } else if (s.num > step && validateStep(step)) {
                      setStep(s.num);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-left text-xs font-semibold shrink-0 transition-all duration-200",
                    isActive
                      ? "border-brand-500/25 bg-brand-500/10 text-brand-500 shadow-sm"
                      : isCompleted
                      ? "border-success/20 bg-success/5 text-success-foreground"
                      : "border-border/60 bg-card hover:bg-muted/10 text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border text-[10px] font-bold",
                      isActive
                        ? "bg-brand-500 text-white border-brand-500"
                        : isCompleted
                        ? "bg-success text-white border-success"
                        : "bg-muted text-muted-foreground border-border/80"
                    )}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span className="hidden sm:inline-block leading-none">{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Forms Content Panel */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6">
                {/* ─── STEP 1: Basic Information ───────────────────────────── */}
                {step === 1 && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <h3 className="text-base font-semibold mb-1">Basic Information</h3>
                      <p className="text-xs text-muted-foreground">Name your agent and declare its category classification.</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="agent-name" className="text-xs font-semibold text-foreground">Agent Name</label>
                      <Input
                        id="agent-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Financial Anomaly Detector"
                        className="h-9 focus-visible:ring-brand-500/20 border-border/60"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="agent-desc" className="text-xs font-semibold text-foreground">Description</label>
                      <Textarea
                        id="agent-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Explain what workflow operations this agent solves..."
                        className="min-h-[70px] border-border/60 focus-visible:ring-brand-500/20 text-sm leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="agent-category" className="text-xs font-semibold text-foreground">Category</label>
                        <SelectField
                          id="agent-category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="Select category"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </SelectField>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="agent-visibility" className="text-xs font-semibold text-foreground">Visibility Mode</label>
                        <SelectField
                          id="agent-visibility"
                          value={visibility}
                          onChange={(e) => setVisibility(e.target.value)}
                        >
                          <option value="private">Private (Only Workspace)</option>
                          <option value="public">Shared (Public Domain)</option>
                        </SelectField>
                      </div>
                    </div>

                    {/* Icon Selection Grid */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-foreground">Select Agent Avatar Emoji</span>
                      <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border/40 bg-muted/10">
                        {EMOJIS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setIcon(em)}
                            className={cn(
                              "w-9 h-9 rounded-lg flex items-center justify-center text-lg border transition-all duration-150",
                              icon === em
                                ? "border-brand-500 bg-brand-500/10 font-bold scale-110 shadow-sm"
                                : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color selection Grid */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-foreground">Select Visual Theme Accent</span>
                      <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border/40 bg-muted/10">
                        {COLORS.map((col) => (
                          <button
                            key={col.class}
                            type="button"
                            onClick={() => setColor(col.class)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all duration-150",
                              color === col.class
                                ? "border-brand-500/50 bg-brand-500/10 text-foreground ring-1 ring-brand-500/30"
                                : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span className={cn("w-3 h-3 rounded-full shrink-0", col.class)} />
                            <span>{col.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── STEP 2: LLM Configuration ───────────────────────────── */}
                {step === 2 && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <h3 className="text-base font-semibold mb-1">LLM Model Configuration</h3>
                      <p className="text-xs text-muted-foreground">Configure the foundational parameters of the large language model.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="agent-provider" className="text-xs font-semibold text-foreground">Provider</label>
                        <SelectField
                          id="agent-provider"
                          value={providerId}
                          onChange={handleProviderChange}
                        >
                          {mockProviders.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </SelectField>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="agent-model" className="text-xs font-semibold text-foreground">Model Name</label>
                        <SelectField
                          id="agent-model"
                          value={modelId}
                          onChange={(e) => setModelId(e.target.value)}
                        >
                          {filteredModels.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </SelectField>
                      </div>
                    </div>

                    {/* Parameters sliders */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/30 pt-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label htmlFor="temp-slider" className="text-xs font-semibold text-foreground">Temperature</label>
                          <span className="text-xs font-mono font-medium text-brand-500">{temperature}</span>
                        </div>
                        <input
                          id="temp-slider"
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="w-full accent-brand-500"
                        />
                        <span className="text-[10px] text-muted-foreground leading-normal">Lower temperature yields deterministic outputs.</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label htmlFor="top-p-slider" className="text-xs font-semibold text-foreground">Top P</label>
                          <span className="text-xs font-mono font-medium text-brand-500">{topP}</span>
                        </div>
                        <input
                          id="top-p-slider"
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={topP}
                          onChange={(e) => setTopP(parseFloat(e.target.value))}
                          className="w-full accent-brand-500"
                        />
                        <span className="text-[10px] text-muted-foreground leading-normal">Nucleus sampling controls word diversity.</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="max-tokens-input" className="text-xs font-semibold text-foreground">Max Output Tokens</label>
                        <Input
                          id="max-tokens-input"
                          type="number"
                          value={maxTokens}
                          onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
                          className="h-9 focus-visible:ring-brand-500/20"
                        />
                        <span className="text-[10px] text-muted-foreground leading-normal">Hard limit for the generation response length.</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-border/30 pt-4">
                      <span className="text-xs font-semibold text-foreground mb-1">Additional Flags</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SwitchField
                          label="Streaming Responses"
                          description="Returns token blocks progressively as they generate."
                          checked={streaming}
                          onCheckedChange={setStreaming}
                        />
                        <SwitchField
                          label="Strict JSON Output"
                          description="Enforces schema compliance for JSON response strings."
                          checked={jsonMode}
                          onCheckedChange={setJsonMode}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 border-t border-border/30 pt-4">
                      <label htmlFor="wizard-sys" className="text-xs font-semibold text-foreground">System Prompt Instructions</label>
                      <Textarea
                        id="wizard-sys"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder="Establish the baseline context and instructions for the agent..."
                        className="min-h-[120px] border-border/60 focus-visible:ring-brand-500/20 text-sm leading-relaxed font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* ─── STEP 3: Memory ──────────────────────────────────────── */}
                {step === 3 && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <h3 className="text-base font-semibold mb-1">Memory Configuration</h3>
                      <p className="text-xs text-muted-foreground">Manage context caching mechanisms and storage parameters.</p>
                    </div>

                    <SwitchField
                      label="Enable Memory"
                      description="Allows the agent to retain past prompt interactions across turns."
                      checked={memoryEnabled}
                      onCheckedChange={setMemoryEnabled}
                    />

                    {memoryEnabled && (
                      <div className="flex flex-col gap-5 border-t border-border/30 pt-4 mt-2">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="memory-type" className="text-xs font-semibold text-foreground">Memory Strategy Type</label>
                          <SelectField
                            id="memory-type"
                            value={memoryType}
                            onChange={(e) => setMemoryType(e.target.value as any)}
                          >
                            <option value="conversation">Conversation Buffer Memory (Short-term)</option>
                            <option value="vector">Vector Index Memory (Long-term Episodic)</option>
                            <option value="both">Hybrid Memory (Both Buffer & Vector Index)</option>
                          </SelectField>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="mem-window-input" className="text-xs font-semibold text-foreground">Conversation Turn Window</label>
                            <Input
                              id="mem-window-input"
                              type="number"
                              value={memoryWindow}
                              onChange={(e) => setMemoryWindow(parseInt(e.target.value) || 0)}
                              className="h-9 focus-visible:ring-brand-500/20"
                            />
                            <span className="text-[10px] text-muted-foreground">Number of past interactions stored directly in LLM buffer.</span>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="mem-retention-input" className="text-xs font-semibold text-foreground">Retention Threshold (Days)</label>
                            <Input
                              id="mem-retention-input"
                              type="number"
                              value={retentionDays}
                              onChange={(e) => setRetentionDays(parseInt(e.target.value) || 0)}
                              className="h-9 focus-visible:ring-brand-500/20"
                            />
                            <span className="text-[10px] text-muted-foreground">Days vector indices are persisted before automatic garbage collection.</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── STEP 4: Tools & Scopes ─────────────────────────────── */}
                {step === 4 && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <h3 className="text-base font-semibold mb-1">Tools and Integrations</h3>
                      <p className="text-xs text-muted-foreground">Attach utility functions and define security access permission layers.</p>
                    </div>

                    <SwitchField
                      label="Attach Tools to Agent"
                      description="Empowers the model to trigger APIs or perform calculations during execution runs."
                      checked={toolsEnabled}
                      onCheckedChange={setToolsEnabled}
                    />

                    {toolsEnabled && (
                      <div className="flex flex-col gap-4 border-t border-border/30 pt-4 mt-2">
                        <span className="text-xs font-semibold text-foreground block">Select Available Library Integrations</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-1">
                          {mockTools.map((tool) => (
                            <label
                              key={tool.id}
                              className={cn(
                                "flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer text-xs transition-colors",
                                selectedTools.includes(tool.id)
                                  ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/10 text-foreground"
                                  : "border-border/60 bg-transparent hover:border-border hover:bg-muted/15 text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={selectedTools.includes(tool.id)}
                                onChange={() => handleToolToggle(tool.id)}
                                className="mt-0.5 rounded border-border text-brand-500 focus:ring-brand-500"
                              />
                              <div className="min-w-0">
                                <span className="font-semibold block truncate leading-tight">{tool.name}</span>
                                <span className="text-[9px] block truncate text-muted-foreground">{tool.category}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3.5 border-t border-border/30 pt-4">
                      <span className="text-xs font-semibold text-foreground block">Required Access Scopes</span>
                      <div className="flex flex-col gap-2.5">
                        <CheckboxField
                          label="Outbound Internet Access"
                          description="Permits tool API triggers to hit outside domain endpoints."
                          checked={permissionInternet}
                          onChange={(e) => setPermissionInternet(e.target.checked)}
                        />
                        <CheckboxField
                          label="File System Access"
                          description="Allows sandbox execution scripts to read or write local data file vectors."
                          checked={permissionFiles}
                          onChange={(e) => setPermissionFiles(e.target.checked)}
                        />
                        <CheckboxField
                          label="Incoming Webhooks"
                          description="Listens to external triggers and fires pipeline callbacks."
                          checked={permissionWebhooks}
                          onChange={(e) => setPermissionWebhooks(e.target.checked)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── STEP 5: Review & Deploy ───────────────────────────── */}
                {step === 5 && (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="text-base font-semibold mb-1">Configuration Review</h3>
                      <p className="text-xs text-muted-foreground">Verify parameter maps and validation indicators before deployment.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-b border-border/30 pb-5 text-xs">
                      {/* Visual summary card */}
                      <div className="flex flex-col gap-3 p-4 rounded-xl border border-border/60 bg-muted/10">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center font-medium text-lg", color)}>
                            {icon}
                          </div>
                          <div>
                            <span className="font-bold text-foreground text-sm block">{name || "Untitled Agent"}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{category} • {visibility}</span>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed mt-1 italic">
                          "{description || "No description provided."}"
                        </p>
                      </div>

                      {/* Params Checklist recap */}
                      <div className="flex flex-col gap-2 p-1.5">
                        <div className="flex justify-between py-1 border-b border-border/30">
                          <span className="text-muted-foreground">Model selected</span>
                          <span className="font-semibold text-foreground font-mono">{modelId} ({providerId})</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                          <span className="text-muted-foreground">Temperature</span>
                          <span className="font-semibold text-foreground font-mono">{temperature}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                          <span className="text-muted-foreground">Short-term Memory</span>
                          <span className="font-semibold text-foreground">
                            {memoryEnabled ? `${memoryType} (${memoryWindow} turns)` : "Disabled"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">Integrations Enabled</span>
                          <span className="font-semibold text-foreground font-mono">
                            {toolsEnabled ? `${selectedTools.length} tools` : "None"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Form Validations */}
                    <div className="flex flex-col gap-2.5">
                      <span className="text-xs font-semibold text-foreground block">System Deployment Integrity Checks</span>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          {name.trim() ? (
                            <Check className="w-4 h-4 text-success shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                          )}
                          <span className={name.trim() ? "text-foreground" : "text-destructive font-medium"}>
                            Agent name declared.
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          {systemPrompt.trim() ? (
                            <Check className="w-4 h-4 text-success shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                          )}
                          <span className={systemPrompt.trim() ? "text-foreground" : "text-destructive font-medium"}>
                            System prompt instructions provided.
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          {selectedTools.length > 0 || !toolsEnabled ? (
                            <Check className="w-4 h-4 text-success shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                          )}
                          <span className="text-foreground">
                            {selectedTools.length > 0 || !toolsEnabled 
                              ? "Agent integration checklist populated." 
                              : "Warning: Tools are enabled but no specific tools are selected."}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bottom Actions Navigator bar */}
            <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={step === 1 ? () => router.push("/agents") : handlePrev}
                className="h-9 gap-1 text-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{step === 1 ? "Cancel" : "Previous Step"}</span>
              </Button>

              {step < 5 ? (
                <Button
                  onClick={handleNext}
                  className="h-9 gap-1 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateAgent}
                  className="h-9 gap-1.5 bg-success hover:bg-success/90 text-white text-xs font-semibold"
                >
                  <Sparkles className="w-4 h-4 fill-current shrink-0 animate-pulse" />
                  <span>Deploy Agent</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </RootLayoutShell>
  );
}
