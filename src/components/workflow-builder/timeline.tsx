"use client";

import React, { useRef, useEffect } from "react";
import {
  ChevronUp,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban,
  Activity,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowRunSnapshot } from "@/engine";

interface ExecutionTimelineProps {
  snapshot: WorkflowRunSnapshot | null;
  isOpen?: boolean;
  onToggle?: () => void;
  hideHeader?: boolean;
}

export function ExecutionTimeline({
  snapshot,
  isOpen = false,
  onToggle,
  hideHeader = false,
}: ExecutionTimelineProps) {
  const listEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when the snapshot's node executions update
  useEffect(() => {
    const shouldScroll = hideHeader || isOpen;
    if (shouldScroll && listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [snapshot?.nodeExecutions.length, isOpen, hideHeader]);

  if (!snapshot) {
    if (hideHeader) {
      return (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic select-none">
          No execution data. Run the workflow to begin.
        </div>
      );
    }
    return (
      <div className="h-10 bg-sidebar border-t border-sidebar-border flex items-center justify-between px-4 text-xs text-muted-foreground select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" />
          <span>Execution Timeline (No active run)</span>
        </div>
      </div>
    );
  }

  const { run, nodeExecutions } = snapshot;

  // Calculate metrics
  const totalNodes = nodeExecutions.length;
  const successNodes = nodeExecutions.filter((n) => n.status === "completed").length;
  const failedNodes = nodeExecutions.filter((n) => n.status === "failed").length;
  const cancelledNodes = nodeExecutions.filter((n) => n.status === "skipped").length;

  // Calculate Workflow duration
  let workflowDuration = 0;
  if (run.startedAt) {
    const end = run.completedAt ? new Date(run.completedAt).getTime() : Date.now();
    workflowDuration = end - new Date(run.startedAt).getTime();
  }

  // Helper to format timestamp
  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    const hrs = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    const secs = String(date.getSeconds()).padStart(2, "0");
    const ms = String(date.getMilliseconds()).padStart(3, "0");
    return `${hrs}:${mins}:${secs}.${ms}`;
  };

  // Helper to get status styling and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle2,
          colorClass: "text-success",
          bgClass: "bg-success/10 border-success/30",
          labelText: "Completed",
        };
      case "failed":
        return {
          icon: XCircle,
          colorClass: "text-destructive",
          bgClass: "bg-destructive/10 border-destructive/30",
          labelText: "Failed",
        };
      case "running":
        return {
          icon: Activity,
          colorClass: "text-brand-500 animate-pulse",
          bgClass: "bg-brand-500/10 border-brand-500/30",
          labelText: "Running",
        };
      case "queued":
        return {
          icon: Clock,
          colorClass: "text-warning",
          bgClass: "bg-warning/10 border-warning/30",
          labelText: "Queued",
        };
      case "cancelled":
      case "skipped":
        return {
          icon: Ban,
          colorClass: "text-muted-foreground",
          bgClass: "bg-muted/10 border-muted/30",
          labelText: status === "cancelled" ? "Cancelled" : "Skipped",
        };
      case "retry_scheduled":
        return {
          icon: AlertCircle,
          colorClass: "text-warning animate-pulse",
          bgClass: "bg-warning/10 border-warning/30 animate-pulse",
          labelText: "Retry Scheduled",
        };
      default:
        return {
          icon: Clock,
          colorClass: "text-muted-foreground",
          bgClass: "bg-muted/10 border-muted/30",
          labelText: "Pending",
        };
    }
  };

  const workflowStatus = getStatusInfo(run.status);

  const content = (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-sidebar">
          {/* Summary dashboard (left) */}
          <div className="w-full md:w-[220px] shrink-0 border-b md:border-b-0 md:border-r border-sidebar-border p-4 flex flex-col gap-3.5 bg-sidebar-accent/20">
            <h3 className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
              Workflow Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground">Total Duration</span>
                <span className="text-sm font-semibold text-foreground">{workflowDuration}ms</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground">Total Nodes</span>
                <span className="text-sm font-semibold text-foreground">{totalNodes}</span>
              </div>
            </div>
            <div className="flex flex-wrap md:flex-col gap-2 mt-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                <span className="text-muted-foreground truncate">Successful:</span>
                <span className="font-semibold ml-auto">{successNodes}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                <span className="text-muted-foreground truncate">Failed:</span>
                <span className="font-semibold ml-auto">{failedNodes}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
                <span className="text-muted-foreground truncate">Stopped/Skipped:</span>
                <span className="font-semibold ml-auto">{cancelledNodes}</span>
              </div>
            </div>
          </div>

          {/* Chronological List of Events (right/main) */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 scrollbar-thin">
            {nodeExecutions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic">
                Waiting for node execution...
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 min-w-[500px]">
                {/* Header row */}
                <div className="grid grid-cols-12 text-[10px] font-semibold text-muted-foreground pb-1 border-b border-sidebar-border px-2">
                  <div className="col-span-4">Node Name</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Started At</div>
                  <div className="col-span-2">Finished At</div>
                  <div className="col-span-2 text-right">Duration</div>
                </div>

                {/* Event rows */}
                {nodeExecutions.map((execution) => {
                  const nodeStatus = getStatusInfo(execution.status);
                  const StatusIcon = nodeStatus.icon;

                  // Node duration
                  let nodeDuration = 0;
                  if (execution.startedAt) {
                    const end = execution.completedAt ? new Date(execution.completedAt).getTime() : Date.now();
                    nodeDuration = end - new Date(execution.startedAt).getTime();
                  }

                  return (
                    <div
                      key={execution.id}
                      className={cn(
                        "grid grid-cols-12 items-center text-xs px-2 py-1.5 rounded-lg border bg-card transition-colors hover:bg-sidebar-accent/30",
                        execution.status === "failed" ? "border-destructive/20 bg-destructive/5" : "border-border/50"
                      )}
                    >
                      {/* Node Name */}
                      <div className="col-span-4 font-medium text-foreground truncate pr-2">
                        {execution.nodeId}
                      </div>

                      {/* Status badge */}
                      <div className="col-span-2 flex items-center gap-1.5">
                        <StatusIcon className={cn("w-3.5 h-3.5 shrink-0", nodeStatus.colorClass)} />
                        <span className={cn("text-[10px] font-medium", nodeStatus.colorClass)}>
                          {nodeStatus.labelText}
                        </span>
                      </div>

                      {/* Started At */}
                      <div className="col-span-2 font-mono text-[10px] text-muted-foreground">
                        {formatTime(execution.startedAt)}
                      </div>

                      {/* Finished At */}
                      <div className="col-span-2 font-mono text-[10px] text-muted-foreground">
                        {formatTime(execution.completedAt)}
                      </div>

                      {/* Duration */}
                      <div className="col-span-2 text-right font-semibold text-foreground pr-1">
                        {nodeDuration}ms
                      </div>
                    </div>
                  );
                })}
                <div ref={listEndRef} />
              </div>
            )}
          </div>
        </div>
  );

  if (hideHeader) {
    return content;
  }

  return (
    <div className="flex flex-col bg-sidebar border-t border-sidebar-border transition-all duration-200 select-none">
      {/* Header bar */}
      <button
        onClick={onToggle}
        className="h-10 px-4 flex items-center justify-between hover:bg-sidebar-accent/50 cursor-pointer outline-none focus-visible:bg-sidebar-accent"
        aria-expanded={isOpen}
        aria-controls="timeline-content-panel"
      >
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            Execution Timeline ({run.id})
          </span>
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border font-medium leading-none shrink-0",
              workflowStatus.bgClass,
              workflowStatus.colorClass
            )}
          >
            {workflowStatus.labelText}
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            Total Duration: {workflowDuration}ms
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content panel */}
      {isOpen && (
        <div
          id="timeline-content-panel"
          className="h-[200px] border-t border-sidebar-border flex flex-col"
        >
          {content}
        </div>
      )}
    </div>
  );
}
