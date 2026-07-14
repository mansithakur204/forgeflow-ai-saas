"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Info,
  Clock,
  Play,
  ArrowRight,
  AlertOctagon,
  Terminal,
  Activity,
  ChevronDown,
  ChevronRight,
  Search,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowRunSnapshot } from "@/engine";
import type { TimelineEntry, TimelineLogLevel } from "@/engine/types/timeline-types";
import { getNodeType } from "@/lib/workflow-data";
import { toast } from "sonner";

interface ExecutionInspectorPanelProps {
  selectedNodeId: string | null;
  selectedNodeLabel: string | null;
  selectedNodeTypeId: string | null;
  snapshot: WorkflowRunSnapshot | null;
  timelineEntries?: readonly TimelineEntry[];
  onJumpToEvent?: (entry: TimelineEntry) => void;
  onClose: () => void;
}

// ── Timeline helpers ─────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<TimelineLogLevel, string> = {
  TRACE: "text-muted-foreground",
  DEBUG: "text-muted-foreground",
  INFO: "text-info",
  SUCCESS: "text-success",
  WARNING: "text-warning",
  ERROR: "text-destructive",
  CRITICAL: "text-destructive",
};

const LEVEL_BG: Record<TimelineLogLevel, string> = {
  TRACE: "bg-muted/20",
  DEBUG: "bg-muted/20",
  INFO: "bg-info/10",
  SUCCESS: "bg-success/10",
  WARNING: "bg-warning/10",
  ERROR: "bg-destructive/10",
  CRITICAL: "bg-destructive/15",
};

function formatTimelineTimestamp(iso: string): string {
  const d = new Date(iso);
  const hrs = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const secs = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hrs}:${mins}:${secs}.${ms}`;
}

function formatEventType(eventType: string): string {
  return eventType.replace(/_/g, " ");
}

export function ExecutionInspectorPanel({
  selectedNodeId,
  selectedNodeLabel,
  selectedNodeTypeId,
  snapshot,
  timelineEntries = [],
  onJumpToEvent,
  onClose,
}: ExecutionInspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<"inspector" | "console">("inspector");
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // ── Console State ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<TimelineLogLevel | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "AI" | "HTTP" | "DATABASE" | "WEBHOOK" | "CUSTOM_EVENT">("ALL");
  const [currentNodeOnly, setCurrentNodeOnly] = useState(false);
  const [renderLimit, setRenderLimit] = useState(50);

  // Filter timeline entries for the selected node (used in inspector preview)
  const nodeTimeline = useMemo(() => {
    if (!timelineEntries || !selectedNodeId) return [];
    return timelineEntries.filter((e) => e.nodeId === selectedNodeId);
  }, [timelineEntries, selectedNodeId]);

  // ── Console Filter & Search ────────────────────────────────────────────────
  const filteredConsoleEntries = useMemo(() => {
    let result = [...timelineEntries];

    // Filter by selected node if toggled
    if (currentNodeOnly && selectedNodeId) {
      result = result.filter((e) => e.nodeId === selectedNodeId);
    }

    // Filter by level
    if (levelFilter !== "ALL") {
      result = result.filter((e) => e.level === levelFilter);
    }

    // Filter by category
    if (categoryFilter !== "ALL") {
      if (categoryFilter === "AI") {
        result = result.filter((e) => e.eventType.startsWith("AI_"));
      } else if (categoryFilter === "HTTP") {
        result = result.filter((e) => e.eventType.startsWith("HTTP_"));
      } else if (categoryFilter === "DATABASE") {
        result = result.filter((e) => e.eventType.includes("DATABASE"));
      } else if (categoryFilter === "WEBHOOK") {
        result = result.filter((e) => e.eventType.startsWith("WEBHOOK_"));
      } else {
        result = result.filter((e) => e.eventType === "CUSTOM_EVENT");
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.message.toLowerCase().includes(query) ||
          e.eventType.toLowerCase().includes(query) ||
          e.nodeId?.toLowerCase().includes(query) ||
          JSON.stringify(e.metadata).toLowerCase().includes(query)
      );
    }

    // Sort: newest last (chronological terminal style)
    return result.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }, [timelineEntries, levelFilter, categoryFilter, currentNodeOnly, selectedNodeId, searchQuery]);

  // Render sliced entries for performance (incremental loading)
  const renderedConsoleEntries = useMemo(() => {
    return filteredConsoleEntries.slice(0, renderLimit);
  }, [filteredConsoleEntries, renderLimit]);

  const hasMore = filteredConsoleEntries.length > renderLimit;

  // ── Exports ────────────────────────────────────────────────────────────────
  const handleExportJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredConsoleEntries, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `timeline_export_${snapshot?.run.id || "run"}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Timeline exported as JSON successfully!");
    } catch (err) {
      toast.error("Failed to export JSON");
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ["Sequence", "Timestamp", "Level", "Event Type", "Node ID", "Message", "Duration(ms)", "Metadata"];
      const rows = filteredConsoleEntries.map((e) => [
        e.sequenceNumber,
        e.timestamp,
        e.level,
        e.eventType,
        e.nodeId || "Workflow",
        `"${e.message.replace(/"/g, '""')}"`,
        e.durationMs !== null ? e.durationMs : "",
        `"${JSON.stringify(e.metadata).replace(/"/g, '""')}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", encodeURI(csvContent));
      downloadAnchor.setAttribute("download", `timeline_export_${snapshot?.run.id || "run"}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Timeline exported as CSV successfully!");
    } catch (err) {
      toast.error("Failed to export CSV");
    }
  };

  if (!selectedNodeId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-6 bg-sidebar select-none">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center" aria-hidden="true">
          <Terminal className="w-5 h-5 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-semibold text-foreground/70">
          Select a node to inspect execution.
        </p>
        <p className="text-xs text-muted-foreground/40 max-w-[200px]">
          Click on any node in the graph during or after a run to inspect its inputs, outputs, and runtime metrics.
        </p>
      </div>
    );
  }

  // Resolve node definition
  const nodeDef = selectedNodeTypeId ? getNodeType(selectedNodeTypeId as import("@/lib/workflow-data").NodeTypeId) : null;

  // Resolve execution records
  const execution = snapshot?.nodeExecutions.find((e) => e.nodeId === selectedNodeId);

  // Helper for status styling
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border-success/30";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "running":
        return "bg-brand-500/10 text-brand-500 border-brand-500/30 animate-pulse";
      case "queued":
        return "bg-warning/10 text-warning border-warning/30";
      case "retry_scheduled":
        return "bg-warning/10 text-warning border-warning/30 animate-pulse";
      case "skipped":
      case "cancelled":
        return "bg-muted/10 text-muted-foreground border-muted/30";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/30";
    }
  };

  // Duration computation
  let duration = 0;
  if (execution?.startedAt) {
    const end = execution.completedAt ? new Date(execution.completedAt).getTime() : Date.now();
    duration = end - new Date(execution.startedAt).getTime();
  }

  // Formatting timestamp
  const formatTimestamp = (isoString: string | null | undefined) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    const hrs = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    const secs = String(date.getSeconds()).padStart(2, "0");
    const ms = String(date.getMilliseconds()).padStart(3, "0");
    return `${hrs}:${mins}:${secs}.${ms}`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-sidebar select-none border-l border-sidebar-border">
      {/* ── Tabs Header ──────────────────────────────────────────────────────── */}
      <div className="flex border-b border-sidebar-border shrink-0 bg-sidebar-accent/10 h-9">
        <button
          onClick={() => setActiveTab("inspector")}
          className={cn(
            "flex-1 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
            activeTab === "inspector"
              ? "border-b-2 border-brand-500 text-brand-500 bg-sidebar"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Inspector
        </button>
        <button
          onClick={() => setActiveTab("console")}
          className={cn(
            "flex-1 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
            activeTab === "console"
              ? "border-b-2 border-brand-500 text-brand-500 bg-sidebar"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Console
        </button>
      </div>

      {activeTab === "inspector" ? (
        /* ── INSPECTOR TAB CONTENT ─────────────────────────────────────────── */
        <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-border/40 scrollbar-thin">
          {/* Node overview */}
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                Execution Info
              </h3>
              {execution && (
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    getStatusBadgeClass(execution.status)
                  )}
                >
                  {execution.status.toUpperCase().replace(/_/g, " ")}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-1 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground">Node Label</span>
                <span className="font-semibold text-foreground truncate">{selectedNodeLabel}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground">Node Type</span>
                <span className="font-semibold text-foreground truncate">{nodeDef?.label ?? "Trigger"}</span>
              </div>
              <div className="flex flex-col col-span-2">
                <span className="text-[10px] text-muted-foreground">Execution Node ID</span>
                <span className="font-mono text-[10px] text-foreground bg-muted-accent/10 px-1.5 py-0.5 rounded border border-border/40 truncate">
                  {selectedNodeId}
                </span>
              </div>
            </div>
          </div>

          {/* Runtime Performance */}
          <div className="p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
              Performance Metrics
            </h3>
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Start Time</span>
                <span className="font-mono font-medium text-foreground">
                  {execution ? formatTimestamp(execution.startedAt) : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">End Time</span>
                <span className="font-mono font-medium text-foreground">
                  {execution ? formatTimestamp(execution.completedAt) : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Elapsed Duration</span>
                <span className="font-semibold text-foreground">
                  {execution ? `${duration}ms` : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Retry Attempts</span>
                <span className="font-semibold text-foreground">
                  {execution ? `${execution.attempt} attempts` : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Failure message (if failed) */}
          {execution?.errorMessage && (
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-destructive uppercase tracking-wider">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>Error Details</span>
              </div>
              <div className="p-2.5 rounded border border-destructive/20 bg-destructive/10 text-destructive text-xs font-semibold leading-relaxed break-words">
                {execution.errorMessage}
              </div>
            </div>
          )}

          {/* Input Data */}
          <div className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                Input Payload
              </h3>
            </div>
            <pre className="p-2.5 rounded bg-black/10 dark:bg-black/30 font-mono text-[10px] leading-relaxed text-foreground/80 overflow-x-auto break-all max-h-[140px] border border-border/40 scrollbar-thin">
              {execution?.inputs ? JSON.stringify(execution.inputs, null, 2) : "{}"}
            </pre>
          </div>

          {/* Output Data */}
          <div className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                Output Payload
              </h3>
            </div>
            <pre className="p-2.5 rounded bg-black/10 dark:bg-black/30 font-mono text-[10px] leading-relaxed text-foreground/80 overflow-x-auto break-all max-h-[140px] border border-border/40 scrollbar-thin">
              {execution?.outputs ? JSON.stringify(execution.outputs, null, 2) : "{}"}
            </pre>
          </div>

          {/* Metadata section */}
          {execution && (
            <div className="p-4 flex flex-col gap-2">
              <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                Execution Metadata
              </h3>
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Run Identifier</span>
                  <span className="font-mono text-[10px] truncate max-w-[120px]">{execution.runId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Execution ID</span>
                  <span className="font-mono text-[10px] truncate max-w-[120px]">{execution.id}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Mini Timeline for selected node ───────────────────────────── */}
          {nodeTimeline.length > 0 && (
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                  Node Event History
                </h3>
              </div>

              <div className="flex flex-col gap-1 mt-1">
                {nodeTimeline.map((entry) => {
                  const isExpanded = expandedEntryId === entry.id;
                  const levelColor = LEVEL_COLORS[entry.level];
                  const levelBg = LEVEL_BG[entry.level];
                  const hasMetadata = Object.keys(entry.metadata).length > 0;

                  return (
                    <div key={entry.id} className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedEntryId(isExpanded ? null : entry.id);
                          onJumpToEvent?.(entry);
                        }}
                        className={cn(
                          "flex items-start gap-1.5 text-left rounded px-2 py-1 transition-colors hover:bg-sidebar-accent/15",
                          levelBg
                        )}
                      >
                        <span className="text-[9px] font-mono text-muted-foreground/50 shrink-0 pt-0.5 w-4 text-right">
                          {entry.sequenceNumber}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/50 shrink-0 pt-0.5">
                          [{formatTimelineTimestamp(entry.timestamp)}]
                        </span>
                        <span className={cn("text-[9px] font-bold shrink-0 uppercase pt-0.5 w-[52px]", levelColor)}>
                          {entry.level}
                        </span>
                        <span className="text-[9px] font-semibold text-foreground/70 shrink-0 pt-0.5 truncate max-w-[100px] border-r border-border/40 pr-1.5 mr-1">
                          {formatEventType(entry.eventType)}
                        </span>
                        <span className="text-[9px] text-foreground/80 pt-0.5 truncate flex-1 min-w-0 pr-2">
                          {entry.message}
                        </span>
                        {entry.durationMs !== null && (
                          <span className="text-[9px] font-mono text-muted-foreground/60 shrink-0 pt-0.5">
                            {entry.durationMs}ms
                          </span>
                        )}
                      </button>
                      {isExpanded && hasMetadata && (
                        <div className="ml-6 px-2 py-1">
                          <pre className="text-[9px] font-mono text-foreground/60 bg-black/5 dark:bg-black/20 rounded p-2 overflow-x-auto max-h-[80px] break-all border border-border/30">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── CONSOLE TAB CONTENT (TERMINAL VIEW WITH FILTERS) ────────────────── */
        <div className="flex-1 flex flex-col overflow-hidden bg-black/5 dark:bg-black/25">
          {/* Controls & Filter Bar */}
          <div className="p-2 border-b border-border/40 bg-sidebar flex flex-col gap-2 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search console logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-sidebar-accent/15 pl-8 pr-2 py-1 text-xs border border-border/60 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Level Filter Dropdown */}
            <div className="flex gap-1.5 items-center">
              <div className="flex-1 flex items-center gap-1 border border-border/40 bg-sidebar-accent/5 px-2 py-0.5 rounded-md text-[10px]">
                <span className="text-muted-foreground">Level:</span>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value as any)}
                  className="bg-transparent text-foreground font-semibold outline-none w-full"
                >
                  <option value="ALL">ALL LEVELS</option>
                  <option value="TRACE">TRACE</option>
                  <option value="DEBUG">DEBUG</option>
                  <option value="INFO">INFO</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="WARNING">WARNING</option>
                  <option value="ERROR">ERROR</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              {/* Type Category Filter */}
              <div className="flex-1 flex items-center gap-1 border border-border/40 bg-sidebar-accent/5 px-2 py-0.5 rounded-md text-[10px]">
                <span className="text-muted-foreground">Type:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="bg-transparent text-foreground font-semibold outline-none w-full"
                >
                  <option value="ALL">ALL TYPES</option>
                  <option value="AI">AI ACTIONS</option>
                  <option value="HTTP">HTTP CALLS</option>
                  <option value="DATABASE">DATABASE</option>
                  <option value="WEBHOOK">WEBHOOKS</option>
                  <option value="CUSTOM_EVENT">CUSTOM</option>
                </select>
              </div>
            </div>

            {/* Checkbox and Export actions */}
            <div className="flex items-center justify-between text-[10px]">
              <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={currentNodeOnly}
                  onChange={(e) => setCurrentNodeOnly(e.target.checked)}
                  className="accent-brand-500 rounded border-border/40 cursor-pointer"
                />
                Selected Node Only
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 px-1.5 py-0.5 border border-border/40 rounded hover:bg-sidebar-accent cursor-pointer font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-1 px-1.5 py-0.5 border border-border/40 rounded hover:bg-sidebar-accent cursor-pointer font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* Terminal Console Log list */}
          <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] leading-relaxed scrollbar-thin flex flex-col gap-1">
            {renderedConsoleEntries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground italic">
                No logs match the current filters.
              </div>
            ) : (
              <>
                {renderedConsoleEntries.map((entry) => {
                  const isExpanded = expandedEntryId === entry.id;
                  const levelColor = LEVEL_COLORS[entry.level];
                  const levelBg = LEVEL_BG[entry.level];
                  const hasMetadata = Object.keys(entry.metadata).length > 0;

                  return (
                    <div
                      key={entry.id}
                      onClick={() => onJumpToEvent?.(entry)}
                      className={cn(
                        "flex flex-col border-b border-border/20 py-1 hover:bg-sidebar-accent/10 px-1 rounded transition-colors cursor-pointer",
                        levelBg
                      )}
                    >
                      <div className="flex items-start gap-1">
                        {/* Seq */}
                        <span className="text-muted-foreground/40 shrink-0 select-none w-5 text-right mr-1">
                          {entry.sequenceNumber}
                        </span>

                        {/* Timestamp */}
                        <span className="text-muted-foreground/60 shrink-0 select-none">
                          [{formatTimelineTimestamp(entry.timestamp)}]
                        </span>

                        {/* Level */}
                        <span className={cn("font-bold shrink-0 uppercase w-[52px] select-none", levelColor)}>
                          {entry.level}
                        </span>

                        {/* Node identifier */}
                        {entry.nodeId && (
                          <span className="text-muted-foreground/80 font-semibold shrink-0 select-none">
                            [{entry.nodeId}]
                          </span>
                        )}

                        {/* Message body */}
                        <span className="text-foreground/90 break-all flex-1">
                          {entry.message}
                        </span>

                        {/* Duration */}
                        {entry.durationMs !== null && (
                          <span className="text-muted-foreground/60 shrink-0 font-mono select-none">
                            {entry.durationMs}ms
                          </span>
                        )}

                        {/* Expand Button */}
                        {hasMetadata && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedEntryId(isExpanded ? null : entry.id);
                            }}
                            className="p-0.5 rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground cursor-pointer"
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                        )}
                      </div>

                      {/* Expandable JSON details */}
                      {isExpanded && hasMetadata && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="ml-7 mt-1 p-2 bg-black/20 rounded border border-border/30 overflow-x-auto max-h-[140px] scrollbar-thin"
                        >
                          <pre className="text-foreground/65 break-all">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Incremental Rendering Load More trigger */}
                {hasMore && (
                  <button
                    onClick={() => setRenderLimit((prev) => prev + 50)}
                    className="w-full text-center py-2 text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors hover:bg-sidebar-accent/15 cursor-pointer mt-1"
                  >
                    Load More Logs ({filteredConsoleEntries.length - renderLimit} remaining)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
