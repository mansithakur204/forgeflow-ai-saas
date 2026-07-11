"use client";

import React from "react";
import { Clock, Play, AlertCircle, CheckCircle2, XCircle, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RunHistoryEntry } from "./run-history-service";

interface RunHistoryPanelProps {
  history: RunHistoryEntry[];
  activeRunId: string | null;
  onSelect: (entry: RunHistoryEntry) => void;
  onReplay: (entry: RunHistoryEntry) => void;
}

export function RunHistoryPanel({ history, activeRunId, onSelect, onReplay }: RunHistoryPanelProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle2,
          labelText: "Success",
          cls: "bg-success/10 text-success border-success/30",
        };
      case "failed":
        return {
          icon: XCircle,
          labelText: "Failed",
          cls: "bg-destructive/10 text-destructive border-destructive/30",
        };
      case "running":
        return {
          icon: Play,
          labelText: "Running",
          cls: "bg-brand-500/10 text-brand-500 border-brand-500/30 animate-pulse",
        };
      case "cancelled":
        return {
          icon: AlertCircle,
          labelText: "Stopped",
          cls: "bg-muted/10 text-muted-foreground border-muted/30",
        };
      default:
        return {
          icon: Clock,
          labelText: status,
          cls: "bg-muted/10 text-muted-foreground border-muted/30",
        };
    }
  };

  const formatTimestamp = (isoString: string | null) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    const hrs = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    const secs = String(date.getSeconds()).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-sidebar select-none overflow-hidden h-full">
      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 scrollbar-thin">
        {history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground italic text-xs">
            <History className="w-6 h-6 text-muted-foreground/30" />
            <span>No execution history yet. Run a workflow to start recording.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 min-w-[650px]">
            {/* Table headers */}
            <div className="grid grid-cols-12 text-[10px] font-semibold text-muted-foreground pb-1 border-b border-sidebar-border px-3">
              <div className="col-span-3">Run ID</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Started At</div>
              <div className="col-span-1.5 col-span-2">Duration</div>
              <div className="col-span-3 text-right">Node Execution Progress</div>
            </div>

            {/* Run rows */}
            {history.map((entry) => {
              const { run, nodeExecutions } = entry.snapshot;
              const statusBadge = getStatusBadge(run.status);
              const StatusIcon = statusBadge.icon;
              const isActive = activeRunId === run.id;

              // Calculate run duration
              let runDuration = 0;
              if (run.startedAt) {
                const end = run.completedAt ? new Date(run.completedAt).getTime() : Date.now();
                runDuration = end - new Date(run.startedAt).getTime();
              }

              // Node success/fail details
              const totalNodes = nodeExecutions.length;
              const successCount = nodeExecutions.filter((n) => n.status === "completed").length;
              const failedCount = nodeExecutions.filter((n) => n.status === "failed").length;

              return (
                <button
                  key={run.id}
                  onClick={() => onSelect(entry)}
                  className={cn(
                    "grid grid-cols-12 items-center text-xs text-left px-3 py-2 rounded-lg border transition-all cursor-pointer outline-none",
                    isActive
                      ? "border-brand-500/60 bg-brand-500/5 ring-1 ring-brand-500/30"
                      : "border-border/50 bg-card hover:bg-sidebar-accent/30"
                  )}
                  aria-pressed={isActive}
                  aria-label={`Run ID ${run.id}, Status: ${statusBadge.labelText}`}
                >
                  {/* Run ID */}
                  <div className="col-span-3 font-semibold text-foreground truncate pr-2">
                    {run.id}
                  </div>

                  {/* Status */}
                  <div className="col-span-2 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[9px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 leading-none shrink-0",
                        statusBadge.cls
                      )}
                    >
                      <StatusIcon className="w-2.5 h-2.5" />
                      {statusBadge.labelText}
                    </span>
                  </div>

                  {/* Started At */}
                  <div className="col-span-2 font-mono text-[10px] text-muted-foreground">
                    {formatTimestamp(run.startedAt)}
                  </div>

                  {/* Duration */}
                  <div className="col-span-2 font-semibold text-foreground">
                    {runDuration}ms
                  </div>

                  {/* Node progress counts */}
                  <div className="col-span-3 text-right text-[10px] text-muted-foreground flex items-center justify-end gap-2 pr-1" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <span className="text-foreground font-semibold">{successCount}</span>
                      <span>/</span>
                      <span>{totalNodes} success</span>
                      {failedCount > 0 && (
                        <span className="text-destructive font-bold ml-1">{failedCount} failed</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReplay(entry);
                      }}
                      className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-500 hover:bg-brand-500 hover:text-brand-foreground text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Replay
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
