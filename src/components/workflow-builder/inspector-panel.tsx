"use client";

import React from "react";
import { X, Info, Clock, Play, ArrowRight, AlertOctagon, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowRunSnapshot } from "@/engine";
import { getNodeType } from "@/lib/workflow-data";

interface ExecutionInspectorPanelProps {
  selectedNodeId: string | null;
  selectedNodeLabel: string | null;
  selectedNodeTypeId: string | null;
  snapshot: WorkflowRunSnapshot | null;
  onClose: () => void;
}

export function ExecutionInspectorPanel({
  selectedNodeId,
  selectedNodeLabel,
  selectedNodeTypeId,
  snapshot,
  onClose,
}: ExecutionInspectorPanelProps) {
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
    <div className="flex-1 flex flex-col overflow-hidden bg-sidebar select-none">
      {/* Scrollable details */}
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
      </div>
    </div>
  );
}
