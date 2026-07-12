"use client";

import React, { use, useState } from "react";
import { useRouter } from "next/navigation";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { AgentHeader, AgentSidebar } from "@/components/agents/agent-layout";
import { PromptEditor } from "@/components/agents/prompt-editor";
import { KnowledgeTable } from "@/components/agents/knowledge-table";
import { MemoryGraph } from "@/components/agents/memory-graph";
import { AnalyticsCards } from "@/components/agents/analytics-cards";
import { ToolCard } from "@/components/agents/tool-card";
import { ProviderBadge, ModelBadge, AgentStatusBadge } from "@/components/agents/agent-badges";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField, SwitchField } from "@/components/ui/form-controls";
import { mockAgents, mockTools, mockRuns, mockFiles, Agent } from "@/lib/agents-data";
import {
  Sparkles,
  Play,
  Settings,
  Code,
  Terminal,
  Activity,
  Calendar,
  AlertCircle,
  Database,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  History,
  Archive,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TabId = "overview" | "prompt" | "memory" | "tools" | "runs" | "analytics" | "settings";

export default function AgentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Tab details layout
  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "prompt", label: "Prompt Editor" },
    { id: "memory", label: "Memory Graph" },
    { id: "tools", label: "Tools Library" },
    { id: "runs", label: "Run Logs" },
    { id: "analytics", label: "Analytics" },
    { id: "settings", label: "Settings" },
  ];

  // Runs logs expanded state
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // Settings State variables
  const [settingsName, setSettingsName] = useState("");
  const [settingsDesc, setSettingsDesc] = useState("");
  const [settingsTemp, setSettingsTemp] = useState(0.2);
  const [settingsTopP, setSettingsTopP] = useState(0.95);

  React.useEffect(() => {
    if (isAuthLoaded && !isSignedIn) {
      router.push("/login");
      return;
    }
    if (!isSignedIn) return;

    fetch("/api/agents")
      .then((res) => res.json())
      .then((data: Agent[]) => {
        const found = data.find((a) => a.id === id);
        if (found) {
          setAgent(found);
          setSettingsName(found.name);
          setSettingsDesc(found.description);
          setSettingsTemp(found.temperature);
          setSettingsTopP(found.topP);
        } else {
          // Fallback to mock if not found in registered agents
          const fallback = mockAgents.find((a) => a.id === id) || mockAgents[0];
          setAgent(fallback);
          setSettingsName(fallback.name);
          setSettingsDesc(fallback.description);
          setSettingsTemp(fallback.temperature);
          setSettingsTopP(fallback.topP);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load agent details", err);
        // Fallback to mock on error
        const fallback = mockAgents.find((a) => a.id === id) || mockAgents[0];
        setAgent(fallback);
        setSettingsName(fallback.name);
        setSettingsDesc(fallback.description);
        setSettingsTemp(fallback.temperature);
        setSettingsTopP(fallback.topP);
        setLoading(false);
      });
  }, [id, isAuthLoaded, isSignedIn, router]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;
    try {
      const res = await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: agent.id,
          name: settingsName,
          description: settingsDesc,
          temperature: settingsTemp,
          topP: settingsTopP,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update settings");
      }
      setAgent((prev) => prev ? {
        ...prev,
        name: settingsName,
        description: settingsDesc,
        temperature: settingsTemp,
        topP: settingsTopP,
      } : null);
      toast.success("Agent settings successfully saved.");
    } catch (err: any) {
      toast.error(`Failed to update settings: ${err.message}`);
    }
  };

  const handleArchiveAgent = async () => {
    if (!agent) return;
    try {
      const res = await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: agent.id,
          status: "archived",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to archive agent");
      }
      setAgent((prev) => prev ? {
        ...prev,
        status: "archived" as const,
      } : null);
      toast.warning(`Agent "${settingsName || agent.name}" has been archived.`);
    } catch (err: any) {
      toast.error(`Failed to archive agent: ${err.message}`);
    }
  };

  const handleDeleteAgent = async () => {
    if (!agent) return;
    if (!confirm(`Are you sure you want to delete agent "${agent.name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/agents?id=${agent.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete agent");
      }
      toast.error(`Deleted agent: ${settingsName || agent.name}`);
      setTimeout(() => {
        router.push("/agents");
      }, 800);
    } catch (err: any) {
      toast.error(`Failed to delete agent: ${err.message}`);
    }
  };

  if (loading || !agent) {
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

  return (
    <RootLayoutShell>
      <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto h-full">
        {/* Agent Header Controls */}
        <AgentHeader
          agent={agent}
          onDelete={handleDeleteAgent}
          onStatusChange={(status) => setAgent((prev) => prev ? { ...prev, status } : null)}
        />

        {/* Horizontal Navigation Tabs */}
        <div className="border-b border-border/40 overflow-x-auto shrink-0 pb-px">
          <div className="flex gap-6 min-w-max" role="tablist" aria-label="Agent options tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tab-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "py-2.5 text-xs font-semibold border-b-2 tracking-wide transition-all leading-none outline-none focus-visible:text-brand-500",
                  activeTab === tab.id
                    ? "border-brand-500 text-brand-500 font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid: Content Area & Details Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Main Content Pane */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {/* ─── TAB 1: Overview ─────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="flex flex-col gap-6">
                {/* Brief & Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="md:col-span-2 border-border/60 shadow-sm flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">About {agent.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {agent.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {agent.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-muted/65 text-muted-foreground font-semibold"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-border/30 pt-3 bg-muted/5 text-[10px] text-muted-foreground">
                      Deployed version: <span className="font-mono text-foreground font-medium ml-1">{agent.version}</span>
                    </CardFooter>
                  </Card>

                  <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 flex flex-col gap-4">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block">Run Success Rate</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-2xl font-bold font-mono text-foreground">{agent.successRate}%</span>
                          <span className="text-[10px] text-success font-semibold">▲ Stable</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block">Total Executions</span>
                        <span className="text-2xl font-bold font-mono text-foreground">{agent.runCount}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Knowledge base section (mock) */}
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Connected Knowledge Bases</CardTitle>
                    <CardDescription className="text-xs">Context files referenced by the vector embeddings index.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <KnowledgeTable />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ─── TAB 2: Prompt Editor ────────────────────────────────────── */}
            {activeTab === "prompt" && (
              <PromptEditor
                initialSystemPrompt={agent.systemPrompt}
                initialDeveloperPrompt={agent.developerPrompt || "Keep answers highly formatted."}
                initialVariables={["user_query", "context", ...agent.tags]}
              />
            )}

            {/* ─── TAB 3: Memory Graph ─────────────────────────────────────── */}
            {activeTab === "memory" && (
              <MemoryGraph />
            )}

            {/* ─── TAB 4: Tools Library ────────────────────────────────────── */}
            {activeTab === "tools" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-base font-semibold mb-1">Attached Developer Tools</h3>
                  <p className="text-xs text-muted-foreground">Select library actions enabled for model function calls.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {mockTools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={{
                        ...tool,
                        enabled: agent.tools.includes(tool.id)
                      }}
                      onToggle={async (toolId, checked) => {
                        const updatedTools = checked 
                          ? [...agent.tools, toolId] 
                          : agent.tools.filter((t) => t !== toolId);
                        try {
                          const res = await fetch("/api/agents", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: agent.id,
                              tools: updatedTools,
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok || !data.success) {
                            throw new Error(data.error || "Failed to update tools");
                          }
                          setAgent((prev) => {
                            if (!prev) return null;
                            return { ...prev, tools: updatedTools };
                          });
                          toast.success(checked ? `Attached tool: ${toolId}` : `Detached tool: ${toolId}`);
                        } catch (err: any) {
                          toast.error(`Failed to update tools: ${err.message}`);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ─── TAB 5: Run Logs ─────────────────────────────────────────── */}
            {activeTab === "runs" && (
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Agent Execution Runs</CardTitle>
                  <CardDescription className="text-xs">Logs and latency analytics compiled from recent agent invokes.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse" role="table" aria-label="Execution run history">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          <th className="px-5 py-3">Run ID</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Duration</th>
                          <th className="px-5 py-3">Tokens</th>
                          <th className="px-5 py-3">Cost</th>
                          <th className="px-5 py-3">Executed At</th>
                          <th className="px-5 py-3 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {mockRuns.map((run) => {
                          const isExpanded = expandedRunId === run.id;
                          return (
                            <React.Fragment key={run.id}>
                              <tr className="hover:bg-muted/5 transition-colors">
                                <td className="px-5 py-3 font-semibold font-mono text-foreground">{run.id}</td>
                                <td className="px-5 py-3">
                                  {run.status === "success" ? (
                                    <span className="inline-flex items-center gap-1 font-semibold text-success">
                                      <CheckCircle className="w-3.5 h-3.5 fill-current" />
                                      <span>Success</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 font-semibold text-destructive">
                                      <AlertCircle className="w-3.5 h-3.5 fill-current" />
                                      <span>Error</span>
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-muted-foreground font-mono">{run.duration}</td>
                                <td className="px-5 py-3 text-muted-foreground font-mono">{run.tokens}</td>
                                <td className="px-5 py-3 text-muted-foreground font-mono">{run.cost}</td>
                                <td className="px-5 py-3 text-muted-foreground">
                                  {new Date(run.timestamp).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                                    className="h-8 w-8 p-0"
                                    aria-label={`Toggle details for run ${run.id}`}
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </Button>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-muted/10">
                                  <td colSpan={7} className="px-5 py-4 border-t border-border/30">
                                    <div className="flex flex-col gap-4 font-sans text-xs">
                                      <div>
                                        <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block mb-1">Execution Prompt</span>
                                        <div className="p-3 bg-card border rounded-lg font-mono leading-relaxed max-h-[120px] overflow-y-auto">
                                          {run.prompt}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block mb-1">Response Output</span>
                                        <div className="p-3 bg-card border rounded-lg font-mono leading-relaxed max-h-[220px] overflow-y-auto whitespace-pre-wrap">
                                          {run.response}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── TAB 6: Analytics ────────────────────────────────────────── */}
            {activeTab === "analytics" && (
              <AnalyticsCards />
            )}

            {/* ─── TAB 7: Settings ─────────────────────────────────────────── */}
            {activeTab === "settings" && (
              <div className="flex flex-col gap-6">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">General Settings</CardTitle>
                    <CardDescription className="text-xs">Edit metadata parameters and threshold specifications.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateSettings} className="flex flex-col gap-4 text-xs">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="settings-name-input" className="text-xs font-semibold text-foreground">Agent Name</label>
                        <Input
                          id="settings-name-input"
                          value={settingsName}
                          onChange={(e) => setSettingsName(e.target.value)}
                          className="h-9 focus-visible:ring-brand-500/20"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="settings-desc-input" className="text-xs font-semibold text-foreground">Description</label>
                        <Textarea
                          id="settings-desc-input"
                          value={settingsDesc}
                          onChange={(e) => setSettingsDesc(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/30 pt-4 mt-2">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label htmlFor="settings-temp-slider" className="text-xs font-semibold text-foreground">Temperature</label>
                            <span className="text-xs font-mono font-medium text-brand-500">{settingsTemp}</span>
                          </div>
                          <input
                            id="settings-temp-slider"
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={settingsTemp}
                            onChange={(e) => setSettingsTemp(parseFloat(e.target.value))}
                            className="w-full accent-brand-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label htmlFor="settings-top-p-slider" className="text-xs font-semibold text-foreground">Top P</label>
                            <span className="text-xs font-mono font-medium text-brand-500">{settingsTopP}</span>
                          </div>
                          <input
                            id="settings-top-p-slider"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={settingsTopP}
                            onChange={(e) => setSettingsTopP(parseFloat(e.target.value))}
                            className="w-full accent-brand-500"
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-fit h-9 text-xs font-semibold mt-2">
                        Save Adjustments
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Destructive zone */}
                <Card className="border-destructive/20 dark:border-destructive/30 bg-destructive/5 text-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-destructive flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Danger Zone</span>
                    </CardTitle>
                    <CardDescription className="text-destructive/80 text-[11px]">Actions below are permanent. Archive pause state prevents workflow loops.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-0 pb-4">
                    <div>
                      <span className="font-semibold text-foreground leading-normal block">Archive This Agent</span>
                      <span className="text-[11px] text-muted-foreground leading-snug">Disables outbound triggers. Can be reactivated from settings.</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleArchiveAgent} className="shrink-0 h-9 gap-1 hover:bg-warning/10 hover:text-warning border-warning/30">
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive Agent</span>
                    </Button>
                  </CardContent>
                  
                  <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-destructive/10 pt-4 pb-4">
                    <div>
                      <span className="font-semibold text-foreground leading-normal block">Delete Agent Configuration</span>
                      <span className="text-[11px] text-muted-foreground leading-snug text-destructive/80">Purges configuration files. All memory caches will be removed.</span>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleDeleteAgent} className="shrink-0 h-9 gap-1.5 bg-destructive text-white hover:bg-destructive/90">
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Agent</span>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

          </div>

          {/* Right Layout Sidebar Panel */}
          <div className="lg:col-span-1 shrink-0">
            <AgentSidebar agent={agent} />
          </div>
        </div>

      </div>
    </RootLayoutShell>
  );
}
