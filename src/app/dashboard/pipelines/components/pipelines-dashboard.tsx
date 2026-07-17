"use client";

import React, { useState, useEffect } from "react";
import type { PipelineFilters, PipelineItem } from "../types";
import { usePipelines } from "../hooks/usePipelines";
import {
  Activity,
  Cpu,
  Clock,
  Layers,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Search,
  Filter,
  X,
  ArrowUpRight,
  RefreshCw,
  Zap,
} from "lucide-react";

export function PipelinesDashboard() {
  const [filters, setFilters] = useState<PipelineFilters>({
    search: "",
    status: "",
    agentId: "",
    sortBy: "startedAt",
    sortOrder: "desc",
    page: 1,
    limit: 10,
  });

  const [isLiveRefresh, setIsLiveRefresh] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineItem | null>(null);
  
  // Traces/details state for the drawer
  const [inspectorDetails, setInspectorDetails] = useState<any>(null);
  const [loadingInspector, setLoadingInspector] = useState(false);

  // Custom hook to query pipeline records from real backend API
  const {
    data,
    loading,
    error,
    refetch,
    cancelPipeline,
    retryPipeline,
    replayPipeline,
  } = usePipelines(filters, isLiveRefresh);

  // Fetch execution inspector traces when selectedPipeline changes
  useEffect(() => {
    if (!selectedPipeline) {
      setInspectorDetails(null);
      return;
    }

    let active = true;
    async function fetchInspector() {
      setLoadingInspector(true);
      try {
        const res = await fetch(`/api/observability?inspectId=${selectedPipeline?.id}`);
        if (res.ok) {
          const json = await res.json();
          if (active && json.inspectorDetails) {
            setInspectorDetails(json.inspectorDetails);
          }
        }
      } catch {
        // Fallback silently if no trace details exists yet for this run
      } finally {
        if (active) setLoadingInspector(false);
      }
    }

    fetchInspector();
    return () => {
      active = false;
    };
  }, [selectedPipeline]);

  // Handle action buttons
  const handleCancel = async (id: string) => {
    const ok = await cancelPipeline(id);
    if (ok) {
      refetch();
      if (selectedPipeline && selectedPipeline.id === id) {
        setSelectedPipeline((prev) => prev ? { ...prev, status: "cancelled" } : null);
      }
    }
  };

  const handleRetry = async (id: string) => {
    const ok = await retryPipeline(id);
    if (ok) {
      refetch();
      setSelectedPipeline(null);
    }
  };

  const handleReplay = async (id: string) => {
    const ok = await replayPipeline(id);
    if (ok) {
      refetch();
      setSelectedPipeline(null);
    }
  };

  // Launch simulated trigger pipeline to demonstrate live state transitions
  const handleTriggerTest = async () => {
    try {
      await fetch("/api/workflows/wf-demo/run", { method: "POST" });
      refetch();
    } catch {
      // Handle fallback
    }
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "",
      agentId: "",
      sortBy: "startedAt",
      sortOrder: "desc",
      page: 1,
      limit: 10,
    });
    setSelectedPipeline(null);
  };

  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            Completed
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-600 border border-sky-500/20">
            Running
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            Queued
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            Failed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-500/10 text-gray-500 border border-gray-500/20">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-500/10 text-neutral-600 border border-neutral-500/20">
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
        <span className="text-foreground">Pipelines</span>
      </nav>

      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Production Pipelines Engine
            {loading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor, inspect execution timelines, and interactively queue or cancel workflow jobs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Refresh Switch */}
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

          {/* Seed Run Trigger Button */}
          <button
            onClick={handleTriggerTest}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-500 text-white border border-brand-600 rounded-lg hover:bg-brand-600 transition"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            Trigger Run
          </button>
        </div>
      </div>

      {/* error state block */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto bg-rose-500/10 border border-rose-500/20 rounded-2xl shadow-sm text-center gap-4 mt-6">
          <AlertTriangle className="w-12 h-12 text-rose-500" />
          <h2 className="text-lg font-bold text-foreground">Fail Connection to Pipeline Service</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-500 transition"
          >
            Retry Fetching
          </button>
        </div>
      )}

      {/* metrics counters cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 rounded-xl text-sky-500">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Running</div>
              <div className="text-lg font-extrabold text-foreground">{data.metrics.running}</div>
            </div>
          </div>

          <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Queued</div>
              <div className="text-lg font-extrabold text-foreground">{data.metrics.queued}</div>
            </div>
          </div>

          <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Completed</div>
              <div className="text-lg font-extrabold text-foreground">{data.metrics.completed}</div>
            </div>
          </div>

          <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-500">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Failed</div>
              <div className="text-lg font-extrabold text-foreground text-rose-600">{data.metrics.failed}</div>
            </div>
          </div>

          <div className="p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-neutral-500/10 rounded-xl text-neutral-500">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Cancelled</div>
              <div className="text-lg font-extrabold text-foreground">{data.metrics.cancelled}</div>
            </div>
          </div>
        </div>
      )}

      {/* Control Filters and Search panel */}
      <div className="bg-surface-card border border-border/40 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full md:w-64 text-xs">
            <input
              type="text"
              placeholder="Search execution/goal..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs focus:outline-none focus:border-brand-500 text-foreground"
            />
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
          </div>

          {/* Status filter */}
          <div className="flex flex-col text-[10px] gap-0.5">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-semibold focus:outline-none text-foreground"
            >
              <option value="">All Statuses</option>
              <option value="running">Running</option>
              <option value="queued">Queued</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Agent filter */}
          <div className="flex flex-col text-[10px] gap-0.5">
            <select
              value={filters.agentId}
              onChange={(e) => setFilters({ ...filters, agentId: e.target.value, page: 1 })}
              className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-semibold focus:outline-none text-foreground"
            >
              <option value="">All Agents</option>
              <option value="planner-agent">Planner Agent</option>
              <option value="research-agent">Research Agent</option>
              <option value="tool-agent">Tool Agent</option>
              <option value="memory-agent">Memory Agent</option>
              <option value="reviewer-agent">Reviewer Agent</option>
            </select>
          </div>

          {/* Sort selection */}
          <div className="flex flex-col text-[10px] gap-0.5">
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value, page: 1 })}
              className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-semibold focus:outline-none text-foreground"
            >
              <option value="startedAt">Sort by Date</option>
              <option value="durationMs">Sort by Duration</option>
              <option value="workflowName">Sort by Workflow</option>
            </select>
          </div>

          {/* Sort order */}
          <button
            onClick={() => setFilters((f) => ({ ...f, sortOrder: f.sortOrder === "asc" ? "desc" : "asc", page: 1 }))}
            className="px-3 py-1.5 text-xs font-semibold bg-background border border-border/60 rounded-xl hover:bg-border/20 text-foreground"
          >
            {filters.sortOrder.toUpperCase()}
          </button>
        </div>

        <button
          onClick={resetFilters}
          className="text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
        >
          Reset Filters
        </button>
      </div>

      {/* loading indicator skeletons */}
      {loading && !data && (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-border/40 rounded-xl" />
          ))}
        </div>
      )}

      {/* empty list block */}
      {data && data.pipelines.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-surface-card border border-border/40 rounded-3xl shadow-sm text-center gap-3">
          <Layers className="w-12 h-12 text-border" />
          <h3 className="text-md font-bold text-foreground">No Pipelines Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Try adjusting search key words or status filtering to locate runs in execution queue records.
          </p>
        </div>
      )}

      {/* Main Pipelines Table */}
      {data && data.pipelines.length > 0 && (
        <div className="bg-surface-card border border-border/40 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-muted-foreground border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground font-bold text-[10px] uppercase bg-border/5">
                  <th className="py-3 px-4">Workflow</th>
                  <th className="py-3 px-4">Execution ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Active Agent / Node</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.pipelines.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedPipeline(item)}
                    className="border-b border-border/20 hover:bg-border/5 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-bold text-foreground">{item.workflowName}</td>
                    <td className="py-3.5 px-4 font-semibold text-brand-600 truncate max-w-[120px]" title={item.id}>
                      {item.id}
                    </td>
                    <td className="py-3.5 px-4">{renderStatusBadge(item.status)}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(item.startedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {item.durationMs ? `${(item.durationMs / 1000).toFixed(1)}s` : "Pending"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-border/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="font-bold text-[10px] text-foreground">{item.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">{item.activeAgent}</span>
                        <span className="text-[9px] text-muted-foreground italic uppercase">[{item.currentNode}]</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {item.status === "running" || item.status === "queued" ? (
                          <button
                            onClick={() => handleCancel(item.id)}
                            className="px-2.5 py-1 text-[10px] font-bold border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 rounded-md transition"
                          >
                            Cancel
                          </button>
                        ) : null}

                        {item.status === "failed" ? (
                          <button
                            onClick={() => handleRetry(item.id)}
                            className="px-2.5 py-1 text-[10px] font-bold border border-brand-500/20 text-brand-500 hover:bg-brand-500/10 rounded-md flex items-center gap-1 transition"
                          >
                            <RotateCcw className="w-3 h-3" /> Retry
                          </button>
                        ) : null}

                        {item.status === "completed" || item.status === "cancelled" ? (
                          <button
                            onClick={() => handleReplay(item.id)}
                            className="px-2.5 py-1 text-[10px] font-bold border border-sky-500/20 text-sky-500 hover:bg-sky-500/10 rounded-md flex items-center gap-1 transition"
                          >
                            <Play className="w-3 h-3 fill-current" /> Replay
                          </button>
                        ) : null}

                        <button
                          onClick={() => setSelectedPipeline(item)}
                          className="p-1 text-muted-foreground hover:text-foreground transition"
                          title="Inspect pipeline"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="p-4 border-t border-border/40 bg-border/5 flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <div>
              Showing {Math.min(data.pagination.total, (filters.page - 1) * filters.limit + 1)} to{" "}
              {Math.min(data.pagination.total, filters.page * filters.limit)} of {data.pagination.total} pipelines
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                className="px-3 py-1 bg-background border border-border/60 rounded-lg hover:bg-border/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <span className="font-bold text-foreground">
                Page {filters.page} of {data.pagination.totalPages}
              </span>
              <button
                disabled={filters.page >= data.pagination.totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                className="px-3 py-1 bg-background border border-border/60 rounded-lg hover:bg-border/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Detail Slide-Out Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg md:max-w-xl bg-background border-l border-l-border/40 shadow-2xl transition-transform duration-300 ease-in-out transform flex flex-col ${
          selectedPipeline ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-border/40 flex items-center justify-between bg-surface-card">
          <div>
            <h3 className="font-extrabold text-foreground text-sm">Pipeline Execution Details</h3>
            <p className="text-[11px] text-muted-foreground truncate max-w-md">{selectedPipeline?.id}</p>
          </div>
          <button
            onClick={() => setSelectedPipeline(null)}
            className="p-1.5 rounded-lg hover:bg-border/40 text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer scrollable content details */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {selectedPipeline && (
            <div className="flex flex-col gap-5">
              {/* Properties Grid */}
              <div className="p-4 bg-border/10 border border-border/20 rounded-2xl flex flex-col gap-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Workflow Goal:</span>
                  <span className="text-foreground font-black text-right max-w-xs">{selectedPipeline.workflowName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Status State:</span>
                  <span>{renderStatusBadge(selectedPipeline.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Current node:</span>
                  <span className="text-foreground uppercase font-bold">{selectedPipeline.currentNode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Retry count:</span>
                  <span className="text-foreground font-medium">
                    {selectedPipeline.retryCount} / {selectedPipeline.maxRetries} attempts
                  </span>
                </div>
                {selectedPipeline.status === "queued" && (
                  <div className="flex justify-between text-amber-600 font-bold border-t border-border/20 pt-2 mt-1">
                    <span>Queue Position:</span>
                    <span>#{selectedPipeline.queuePosition}</span>
                  </div>
                )}
              </div>

              {/* Input description goal text */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-muted-foreground">Input Goal Prompt</span>
                <div className="p-3.5 bg-surface-card border border-border/40 rounded-xl text-xs text-foreground font-mono whitespace-pre-wrap leading-relaxed">
                  {selectedPipeline.input}
                </div>
              </div>

              {/* Fail Error banner */}
              {selectedPipeline.error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-700">Database Runtime Failure</h4>
                    <p className="text-[11px] text-rose-600 mt-1 leading-relaxed">{selectedPipeline.error}</p>
                  </div>
                </div>
              )}

              {/* Dynamic Telemetry traces (Task 5 / Task 8) */}
              <div className="border-t border-border/40 pt-5 flex flex-col gap-4">
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Advanced Execution Traces</h4>
                
                {loadingInspector ? (
                  <div className="flex items-center justify-center p-6 text-xs text-muted-foreground gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-brand-500" /> Resolving latency traces...
                  </div>
                ) : inspectorDetails ? (
                  <div className="flex flex-col gap-4">
                    {/* Latencies breakdown */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 bg-border/5 rounded-xl border border-border/10">
                        <div className="text-[9px] text-muted-foreground uppercase">RAG</div>
                        <div className="text-xs font-extrabold text-foreground mt-1">
                          {inspectorDetails.latency.ragLatency}ms
                        </div>
                      </div>
                      <div className="p-2.5 bg-border/5 rounded-xl border border-border/10">
                        <div className="text-[9px] text-muted-foreground uppercase">Memory</div>
                        <div className="text-xs font-extrabold text-foreground mt-1">
                          {inspectorDetails.latency.memoryRetrievalLatency}ms
                        </div>
                      </div>
                      <div className="p-2.5 bg-border/5 rounded-xl border border-border/10">
                        <div className="text-[9px] text-muted-foreground uppercase">LLM</div>
                        <div className="text-xs font-extrabold text-foreground mt-1">
                          {inspectorDetails.latency.providerLatency}ms
                        </div>
                      </div>
                    </div>

                    {/* Timeline List log traces */}
                    <div className="flex flex-col gap-2">
                      {inspectorDetails.agentMetrics.map((step: any, idx: number) => (
                        <div key={idx} className="p-3 bg-surface-card border border-border/30 rounded-xl flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-[9px]">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-foreground">{step.agentName}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-muted-foreground bg-border/20 px-1.5 py-0.5 rounded">
                            {step.totalDuration}ms
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic text-center p-4 bg-border/5 rounded-xl border border-border/10">
                    No timeline traces generated yet for this pending run.
                  </div>
                )}
              </div>

              {/* Action commands */}
              <div className="border-t border-border/40 pt-5 flex flex-col gap-2.5">
                <span className="text-xs font-bold text-muted-foreground">Execution Actions</span>
                
                <div className="flex flex-wrap gap-2.5">
                  {selectedPipeline.status === "running" || selectedPipeline.status === "queued" ? (
                    <button
                      onClick={() => handleCancel(selectedPipeline.id)}
                      className="flex-1 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-500 transition shadow-sm text-center"
                    >
                      Cancel Execution
                    </button>
                  ) : null}

                  {selectedPipeline.status === "failed" ? (
                    <button
                      onClick={() => handleRetry(selectedPipeline.id)}
                      className="flex-1 py-2 text-xs font-bold bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retry Run
                    </button>
                  ) : null}

                  {selectedPipeline.status === "completed" || selectedPipeline.status === "cancelled" ? (
                    <button
                      onClick={() => handleReplay(selectedPipeline.id)}
                      className="flex-1 py-2 text-xs font-bold bg-sky-600 text-white rounded-xl hover:bg-sky-500 transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Replay Run
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawer Overlay backdrop */}
      {selectedPipeline && (
        <div
          onClick={() => setSelectedPipeline(null)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        />
      )}
    </div>
  );
}
