"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Copy, Trash2, Terminal, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecutionLogEntry } from "@/engine/types/logs";
import { toast } from "sonner";

interface ExecutionLogsPanelProps {
  logs: ExecutionLogEntry[];
  onClear: () => void;
}

type FilterLevel = "ALL" | "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export function ExecutionLogsPanel({ logs, onClear }: ExecutionLogsPanelProps) {
  const [filter, setFilter] = useState<FilterLevel>("ALL");
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Map low-level logger levels + custom SUCCESS markers to UI categories
  const mappedLogs = useMemo(() => {
    return logs.map((log) => {
      let uiLevel: "INFO" | "SUCCESS" | "WARNING" | "ERROR" = "INFO";
      if (log.level === "error") {
        uiLevel = "ERROR";
      } else if (log.level === "warn") {
        uiLevel = "WARNING";
      } else if (log.data?.success) {
        uiLevel = "SUCCESS";
      }
      return { ...log, uiLevel };
    });
  }, [logs]);

  // Filter logs by level
  const filteredLogs = useMemo(() => {
    if (filter === "ALL") return mappedLogs;
    return mappedLogs.filter((log) => log.uiLevel === filter);
  }, [mappedLogs, filter]);

  // Auto-scroll to latest log entry
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredLogs.length]);

  const handleCopy = () => {
    if (filteredLogs.length === 0) {
      toast.error("No logs to copy!");
      return;
    }
    const logText = filteredLogs
      .map((log) => {
        const timestamp = new Date(log.timestamp).toLocaleTimeString(undefined, {
          hour12: false,
          fractionalSecondDigits: 3,
        });
        const nodePart = log.nodeId ? ` [Node: ${log.nodeId}]` : "";
        return `[${timestamp}] [${log.uiLevel}]${nodePart} ${log.message}`;
      })
      .join("\n");
    navigator.clipboard.writeText(logText);
    toast.success("Logs copied to clipboard!");
  };

  const getLevelColor = (level: "INFO" | "SUCCESS" | "WARNING" | "ERROR") => {
    switch (level) {
      case "SUCCESS":
        return "text-success";
      case "WARNING":
        return "text-warning";
      case "ERROR":
        return "text-destructive";
      default:
        return "text-info";
    }
  };

  const getLevelIcon = (level: "INFO" | "SUCCESS" | "WARNING" | "ERROR") => {
    switch (level) {
      case "SUCCESS":
        return CheckCircle2;
      case "WARNING":
        return AlertTriangle;
      case "ERROR":
        return XCircle;
      default:
        return Info;
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar select-none overflow-hidden">
      {/* Log toolbar */}
      <div className="h-9 px-4 border-b border-sidebar-border flex items-center justify-between shrink-0 bg-sidebar-accent/10">
        {/* Filters */}
        <div className="flex items-center gap-1">
          {(["ALL", "INFO", "SUCCESS", "WARNING", "ERROR"] as FilterLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded transition-colors",
                filter === level
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground cursor-pointer"
            aria-label="Copy logs to clipboard"
          >
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </button>
          <button
            onClick={onClear}
            className="text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded text-muted-foreground hover:bg-sidebar-accent hover:text-destructive cursor-pointer"
            aria-label="Clear all logs"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Log list terminal block */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed bg-black/5 dark:bg-black/20 text-foreground/95 scrollbar-thin">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">
            No log entries match the selected filter.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredLogs.map((log) => {
              const Icon = getLevelIcon(log.uiLevel);
              const color = getLevelColor(log.uiLevel);
              const timestamp = new Date(log.timestamp).toLocaleTimeString(undefined, {
                hour12: false,
                fractionalSecondDigits: 3,
              });

              return (
                <div key={log.id} className="flex items-start gap-2 hover:bg-sidebar-accent/15 py-0.5 px-1 rounded">
                  <span className="text-muted-foreground shrink-0 select-none">
                    [{timestamp}]
                  </span>
                  <span className={cn("font-bold flex items-center gap-1 shrink-0 select-none", color)}>
                    <Icon className="w-3 h-3 shrink-0" />
                    {log.uiLevel}
                  </span>
                  {log.nodeId && (
                    <span className="text-muted-foreground/80 font-semibold shrink-0 select-none">
                      [{log.nodeId}]
                    </span>
                  )}
                  <span className="text-foreground/90 break-all">{log.message}</span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
