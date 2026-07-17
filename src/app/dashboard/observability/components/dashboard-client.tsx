"use client";

import React, { useState } from "react";
import { useObservability } from "../hooks/useObservability";
import type { DashboardFilters } from "../types";
import {
  SuccessVsFailureChart,
  TrendChart,
  TokenUsageChart,
  ExecutionTimelineChart,
} from "./observability-charts";
import {
  Activity,
  Cpu,
  Clock,
  Coins,
  Database,
  Brain,
  ShieldAlert,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Search,
  RefreshCw,
  Layers,
  GitBranch,
  X,
  ArrowUpRight,
} from "lucide-react";

export function ObservabilityDashboardClient() {
  // Filters State (Task 7)
  const [filters, setFilters] = useState<DashboardFilters>({
    workflowId: "",
    agentId: "",
    provider: "",
    status: "",
    dateRange: "24h",
  });

  // Selected execution run to inspect in Drawer (Task 5 / Task 8)
  const [selectedInspectId, setSelectedInspectId] = useState<string | null>(null);

  // Live Refresh Toggle (Task 9)
  const [isLiveRefresh, setIsLiveRefresh] = useState(true);

  // Fetch telemetry data from AgentAnalyticsService via Observability API (Task 8)
  const { data, loading, error } = useObservability(filters, selectedInspectId, isLiveRefresh);

  // Reset filters
  const resetFilters = () => {
    setFilters({
      workflowId: "",
      agentId: "",
      provider: "",
      status: "",
      dateRange: "24h",
    });
    setSelectedInspectId(null);
  };

  // Helper to render health status indicators (Task 6)
  const renderStatusIndicator = (status: string) => {
    switch (status.toLowerCase()) {
      case "healthy":
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Completed
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 border border-sky-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            Running
          </span>
        );
      case "waiting":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Waiting
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
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-500 border border-gray-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Cancelled
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

  // Mock static labels for curves
  const mockLabels = ["12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"];

  // ─── Render Error State ───
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto bg-rose-500/10 border border-rose-500/20 rounded-2xl shadow-sm text-center gap-4 mt-12">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-bold text-foreground">Failed to Load Telemetry Metrics</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-500 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // ─── Render Loading State (Skeletons) ───
  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto animate-pulse">
        <div className="h-8 bg-border/40 rounded-lg w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 bg-border/40 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-44 bg-border/40 rounded-2xl" />
          <div className="h-44 bg-border/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Extract workflow IDs and runs
  const uniqueWorkflowRuns = data?.rawMetrics
    .map((m) => m.executionId)
    .filter((v, i, self) => self.indexOf(v) === i) || [];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto relative overflow-hidden">
      
      {/* Navigation Breadcrumbs (Task 6) */}
      <nav aria-label="Breadcrumb" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
        <span className="hover:text-foreground cursor-pointer transition">Dashboard</span>
        <span>/</span>
        <span className="text-foreground">Analytics</span>
      </nav>

      {/* Dashboard Top Header & Status (Task 6 / Task 9) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Observability &amp; Analytics Dashboard
            {loading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time telemetry and resource usage tracking of active Multi-Agent execution states.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Refresh Toggle Switch (Task 9) */}
          <label className="inline-flex items-center gap-2 cursor-pointer bg-border/30 px-3 py-1.5 rounded-lg border border-border/40 text-xs font-semibold select-none text-muted-foreground hover:text-foreground transition">
            <input
              type="checkbox"
              checked={isLiveRefresh}
              onChange={(e) => setIsLiveRefresh(e.target.checked)}
              className="sr-only peer"
            />
            <span className={`w-2 h-2 rounded-full ${isLiveRefresh ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`} />
            <span>Live Sync</span>
            <div className="w-7 h-4 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-500 relative flex items-center" />
          </label>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Healthy
          </div>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-border/40 border border-border/60 rounded-lg hover:bg-border/60 transition"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Filters Form Panel (Task 7) */}
      <div className="bg-surface-card border border-border/40 p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <Filter className="w-4 h-4 text-brand-500" />
          <span>FILTERS</span>
        </div>
        
        {/* Workflow filter */}
        <div className="flex flex-col text-xs gap-1">
          <label className="font-semibold text-muted-foreground">Workflow ID</label>
          <select
            value={filters.workflowId}
            onChange={(e) => setFilters({ ...filters, workflowId: e.target.value })}
            className="px-2.5 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-medium focus:outline-none focus:border-brand-500 text-foreground"
          >
            <option value="">All Workflows</option>
            {data?.rawMetrics
              .map((m) => m.workflowId)
              .filter((v, i, self) => self.indexOf(v) === i)
              .map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
          </select>
        </div>

        {/* Agent filter */}
        <div className="flex flex-col text-xs gap-1">
          <label className="font-semibold text-muted-foreground">Active Agent</label>
          <select
            value={filters.agentId}
            onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}
            className="px-2.5 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-medium focus:outline-none focus:border-brand-500 text-foreground"
          >
            <option value="">All Agents</option>
            {data?.agentsAnalytics.map((a) => (
              <option key={a.agentId} value={a.agentId}>
                {a.agentName}
              </option>
            ))}
          </select>
        </div>

        {/* Provider filter */}
        <div className="flex flex-col text-xs gap-1">
          <label className="font-semibold text-muted-foreground">Provider</label>
          <select
            value={filters.provider}
            onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
            className="px-2.5 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-medium focus:outline-none focus:border-brand-500 text-foreground"
          >
            <option value="">All Providers</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
            <option value="anthropic">Anthropic</option>
            <option value="azure_openai">Azure OpenAI</option>
            <option value="groq">Groq</option>
            <option value="local">Local Model</option>
          </select>
        </div>

        {/* Status filter */}
        <div className="flex flex-col text-xs gap-1">
          <label className="font-semibold text-muted-foreground">State Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-2.5 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-medium focus:outline-none focus:border-brand-500 text-foreground"
          >
            <option value="">All States</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="waiting">Waiting</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Render Empty State if no telemetry exists (Task 5) */}
      {data?.rawMetrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface-card border border-border/40 rounded-3xl shadow-sm text-center gap-3">
          <Layers className="w-12 h-12 text-border" />
          <h3 className="text-md font-bold text-foreground">No Telemetry Recorded Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Launch agent sequences or run workspace workflows to observe live latency traces, token counters, and provider operations.
          </p>
        </div>
      ) : (
        <>
          {/* Execution Overview Cards Grid — 10 KPIs (Task 2) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* 1. Active Agents */}
            <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-brand-500/10 rounded-xl text-brand-500">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Active Agents</div>
                <div className="text-lg font-extrabold text-foreground">{data?.overview.activeAgents ?? 0}</div>
              </div>
            </div>

            {/* 2. Running Workflows */}
            <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/10 rounded-xl text-sky-500">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Running Workflows</div>
                <div className="text-lg font-extrabold text-foreground">{data?.overview.runningWorkflows ?? 0}</div>
              </div>
            </div>

            {/* 3. Success Rate */}
            <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Success Rate</div>
                <div className="text-lg font-extrabold text-foreground text-emerald-600 font-black">
                  {data ? Math.round(data.overview.successRate * 100) : 0}%
                </div>
              </div>
            </div>

            {/* 4. Failure Rate */}
            <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-500">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Failure Rate</div>
                <div className="text-lg font-extrabold text-foreground text-rose-600">
                  {data ? Math.round(data.overview.failureRate * 100) : 0}%
                </div>
              </div>
            </div>

            {/* 5. Total Executions */}
            <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Total Runs</div>
                <div className="text-lg font-extrabold text-foreground">{data?.overview.totalExecutions ?? 0}</div>
              </div>
            </div>

            {/* 6. Queue Length */}
            <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-500">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Queue Length</div>
                <div className="text-lg font-extrabold text-purple-600">{data?.overview.queueLength ?? 0}</div>
              </div>
            </div>

            {/* 7. Average Latency */}
            <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Avg Latency</div>
                <div className="text-lg font-extrabold text-foreground">
                  {data?.overview.averageLatency ? `${data.overview.averageLatency.toFixed(1)}ms` : "0ms"}
                </div>
              </div>
            </div>

            {/* 8. Daily Cost */}
            <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Daily Cost</div>
                <div className="text-lg font-extrabold text-amber-600">
                  ${data?.overview.dailyCost ? data.overview.dailyCost.toFixed(5) : "0.00000"}
                </div>
              </div>
            </div>

            {/* 9. Monthly Cost */}
            <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/15 rounded-xl text-amber-600">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Monthly Cost</div>
                <div className="text-lg font-extrabold text-amber-600">
                  ${data?.overview.monthlyCost ? data.overview.monthlyCost.toFixed(4) : "0.0000"}
                </div>
              </div>
            </div>

            {/* 10. Total Tokens */}
            <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-teal-500/10 rounded-xl text-teal-600">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Total Tokens</div>
                <div className="text-lg font-extrabold text-foreground">
                  {data?.overview.totalTokens ? data.overview.totalTokens.toLocaleString() : "0"}
                </div>
              </div>
            </div>
          </div>

          {/* Observability Visual Charts Section (Task 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Latency Trend Area curve */}
            <div className="md:col-span-2">
              <TrendChart
                title="Execution Latency Curve (ms)"
                data={data?.rawLatencies.map((l) => l.overallWorkflowLatency) || [100, 200, 150, 250, 180, 290, 210]}
                labels={mockLabels}
                color="#0ea5e9" 
                unit="ms"
              />
            </div>

            {/* Success vs Failure Donut */}
            <div>
              <SuccessVsFailureChart
                successRate={data?.overview.successRate ?? 1.0}
                failureRate={data?.overview.failureRate ?? 0.0}
                total={data?.overview.totalExecutions ?? 0}
              />
            </div>

            {/* Cost Trend Area curve */}
            <div className="md:col-span-2">
              <TrendChart
                title="Accumulated Cost Trend ($)"
                data={data?.rawCosts.map((c) => c.cost) || [0.002, 0.005, 0.004, 0.008, 0.006, 0.012, 0.009]}
                labels={mockLabels}
                color="#f59e0b" 
                unit="$"
              />
            </div>

            {/* Token Usage breakdown bar charts */}
            <div>
              <TokenUsageChart usages={data?.rawUsages || []} />
            </div>
          </div>

          {/* Agent Analytics Summary Table (Task 4) */}
          <div className="bg-surface-card border border-border/40 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Agent Execution Summary Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-muted-foreground border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground font-bold text-[10px] uppercase">
                    <th className="py-3 px-4">Agent Name</th>
                    <th className="py-3 px-4">Executions</th>
                    <th className="py-3 px-4">Avg Latency</th>
                    <th className="py-3 px-4">Avg Tokens</th>
                    <th className="py-3 px-4">Avg Cost</th>
                    <th className="py-3 px-4">Success %</th>
                    <th className="py-3 px-4">Retries</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.agentsAnalytics.map((row) => (
                    <tr key={row.agentId} className="border-b border-border/20 hover:bg-border/5 transition">
                      <td className="py-3.5 px-4 font-semibold text-foreground">{row.agentName}</td>
                      <td className="py-3.5 px-4 font-medium text-foreground">{row.executions}</td>
                      <td className="py-3.5 px-4 font-medium">{row.averageLatency.toFixed(1)}ms</td>
                      <td className="py-3.5 px-4 font-medium">{row.averageTokens.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-medium">${row.averageCost.toFixed(6)}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-emerald-600">
                          {Math.round(row.successRate * 100)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">{row.retries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Executions List Table (Task 8 - Click to Inspect Drawer) */}
          <div className="bg-surface-card border border-border/40 rounded-2xl shadow-sm p-5 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Recent Executions Run Logs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-muted-foreground border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground font-bold text-[10px] uppercase">
                    <th className="py-3 px-4">Execution ID</th>
                    <th className="py-3 px-4">Steps Executed</th>
                    <th className="py-3 px-4">Workflow Goal</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueWorkflowRuns.map((execId) => {
                    const steps = data?.rawMetrics.filter((m) => m.executionId === execId) || [];
                    const firstStep = steps[0];
                    const goalDesc = firstStep?.workflowId || "Agent Sequence Run";
                    const finalStatus = steps[steps.length - 1]?.status || "completed";

                    return (
                      <tr
                        key={execId}
                        onClick={() => setSelectedInspectId(execId)}
                        className="border-b border-border/20 hover:bg-border/5 cursor-pointer transition"
                      >
                        <td className="py-3.5 px-4 font-bold text-brand-600 truncate max-w-[140px]" title={execId}>
                          {execId}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground">{steps.length} steps</td>
                        <td className="py-3.5 px-4 truncate max-w-xs text-foreground font-medium">{goalDesc}</td>
                        <td className="py-3.5 px-4">{renderStatusIndicator(finalStatus)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInspectId(execId);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-500 hover:text-brand-600 transition"
                          >
                            Inspect <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Execution Detail Slide-Out Drawer (Task 8 / Task 5) */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg md:max-w-xl bg-background border-l border-border/40 shadow-2xl transition-transform duration-300 ease-in-out transform flex flex-col ${
          selectedInspectId ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-border/40 flex items-center justify-between bg-surface-card">
          <div>
            <h3 className="font-extrabold text-foreground text-sm">Execution Detail Traces</h3>
            <p className="text-[11px] text-muted-foreground truncate max-w-md">{selectedInspectId}</p>
          </div>
          <button
            onClick={() => setSelectedInspectId(null)}
            className="p-1.5 rounded-lg hover:bg-border/40 text-muted-foreground hover:text-foreground transition"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {selectedInspectId && data?.inspectorDetails ? (
            <div className="flex flex-col gap-6">
              {/* Operations Breakdown grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Latency Breakdown */}
                <div className="p-3 bg-border/10 rounded-xl border border-border/20 text-xs">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Latency</div>
                  <div className="flex flex-col gap-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>Provider:</span>
                      <span className="font-semibold text-foreground">
                        {data.inspectorDetails.latency.providerLatency}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>RAG:</span>
                      <span className="font-semibold text-foreground">
                        {data.inspectorDetails.latency.ragLatency}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory:</span>
                      <span className="font-semibold text-foreground">
                        {data.inspectorDetails.latency.memoryRetrievalLatency}ms
                      </span>
                    </div>
                    <div className="flex justify-between text-brand-600 font-bold border-t border-border/20 pt-1 mt-1">
                      <span>Overall:</span>
                      <span>{data.inspectorDetails.latency.overallWorkflowLatency}ms</span>
                    </div>
                  </div>
                </div>

                {/* Token Breakdown */}
                <div className="p-3 bg-border/10 rounded-xl border border-border/20 text-xs">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Tokens</div>
                  <div className="flex flex-col gap-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>Prompt:</span>
                      <span className="font-semibold text-foreground">
                        {data.inspectorDetails.tokenUsage.promptTokens.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completion:</span>
                      <span className="font-semibold text-foreground">
                        {data.inspectorDetails.tokenUsage.completionTokens.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cached:</span>
                      <span className="font-semibold text-foreground">
                        {data.inspectorDetails.tokenUsage.cachedTokens.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sky-600 font-bold border-t border-border/20 pt-1 mt-1">
                      <span>Total:</span>
                      <span>{data.inspectorDetails.tokenUsage.totalTokens.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Cost / Resource Usage */}
                <div className="p-3 bg-border/10 rounded-xl border border-border/20 text-xs">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Costs &amp; Queue</div>
                  <div className="flex flex-col gap-1 text-[11px]">
                    <div className="flex justify-between font-extrabold text-amber-600">
                      <span>Total Cost:</span>
                      <span>${data.inspectorDetails.cost.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Queue Wait:</span>
                      <span className="font-semibold text-foreground">
                        {data.inspectorDetails.queueWait}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Retries:</span>
                      <span className="font-semibold text-foreground">
                        {data.inspectorDetails.retries}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border/20 pt-1 mt-1">
                      <span>Max RAM:</span>
                      <span className="font-semibold text-foreground">
                        {Math.round(data.inspectorDetails.memoryUsage / 1024 / 1024)} MB
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gantt Timeline Curve (Task 3 / Task 5) */}
              <ExecutionTimelineChart metrics={data.inspectorDetails.agentMetrics} />

              {/* Timeline Event Traces List (Task 5 / Task 6) */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-muted-foreground">Timeline Log Details</h4>
                <div className="flex flex-col gap-2.5 pr-1">
                  {data.inspectorDetails.agentMetrics.map((step: any, idx: number) => (
                    <div key={idx} className="p-3.5 bg-surface-card border border-border/40 rounded-xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-black text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-foreground">{step.agentName}</div>
                          <div className="text-[9px] text-muted-foreground">
                            Start: {new Date(step.executionStart).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3.5">
                        <span className="text-[10px] font-medium text-muted-foreground bg-border/20 px-2 py-0.5 rounded">
                          {step.totalDuration || 0}ms
                        </span>
                        {renderStatusIndicator(step.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Drawer Background Dimming Overlay */}
      {selectedInspectId && (
        <div
          onClick={() => setSelectedInspectId(null)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        />
      )}
    </div>
  );
}
