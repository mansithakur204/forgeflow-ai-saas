"use client";

import React from "react";
import type { AgentExecutionMetrics, DetailedTokenUsage, CostRecord, LatencyMetrics } from "@/agents";

// ─────────────────────────────────────────────────────────────────────────────
// Donut Chart: Success vs Failure (Task 3)
// ─────────────────────────────────────────────────────────────────────────────
interface SuccessVsFailureProps {
  successRate: number;
  failureRate: number;
  total: number;
}

export function SuccessVsFailureChart({ successRate, failureRate, total }: SuccessVsFailureProps) {
  const successPercent = Math.round(successRate * 100);
  const failurePercent = Math.round(failureRate * 100);
  const otherPercent = Math.max(0, 100 - successPercent - failurePercent);

  // SVG parameters
  const size = 160;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute dash offsets
  const successOffset = circumference - (successPercent / 100) * circumference;
  const failureOffset = circumference - (failurePercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-surface-card border border-border/40 rounded-2xl shadow-sm">
      <h4 className="text-sm font-medium text-muted-foreground mb-4">Success vs Failure Rate</h4>
      <div className="relative w-40 h-40">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-border, #e5e7eb)"
            strokeWidth={strokeWidth}
            className="opacity-20"
          />
          {/* Success circle */}
          {successPercent > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#10b981" // Success Green
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={successOffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          )}
          {/* Failure circle */}
          {failurePercent > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#ef4444" // Failure Red
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={failureOffset}
              strokeLinecap="round"
              style={{ transform: `rotate(${(successPercent / 100) * 360}deg)`, transformOrigin: "center" }}
              className="transition-all duration-1000 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{total}</span>
          <span className="text-xs text-muted-foreground">Executions</span>
        </div>
      </div>
      <div className="flex justify-around w-full mt-4 text-xs font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Success ({successPercent}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Failure ({failurePercent}%)</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Line Chart: Latency Trend & Cost Trend (Task 3)
// ─────────────────────────────────────────────────────────────────────────────
interface TrendChartProps {
  title: string;
  data: number[];
  labels: string[];
  color: string;
  unit: string;
}

export function TrendChart({ title, data, labels, color, unit }: TrendChartProps) {
  const maxVal = Math.max(...data, 1);
  const width = 500;
  const height = 150;
  const padding = 20;

  // Convert points to coordinates
  const points = data.map((val, idx) => {
    const x = padding + (idx / Math.max(data.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - (val / maxVal) * (height - 2 * padding);
    return { x, y };
  });

  const pathD = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : "";

  return (
    <div className="flex flex-col p-5 bg-surface-card border border-border/40 rounded-2xl shadow-sm w-full">
      <h4 className="text-sm font-medium text-muted-foreground mb-3">{title}</h4>
      <div className="relative w-full h-40">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`grad-${title.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--color-border, #e5e7eb)" strokeOpacity="0.1" strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--color-border, #e5e7eb)" strokeOpacity="0.1" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--color-border, #e5e7eb)" strokeOpacity="0.2" />

          {/* Area fill */}
          {areaD && <path d={areaD} fill={`url(#grad-${title.replace(/\s+/g, "")})`} />}

          {/* Line path */}
          {pathD && <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Dots */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="#ffffff"
              stroke={color}
              strokeWidth="2.5"
              className="cursor-pointer hover:r-6 transition-all"
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium px-4">
        <span>{labels[0] || ""}</span>
        <span>{labels[labels.length - 1] || ""}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bar Chart: Token Usage per Agent (Task 3)
// ─────────────────────────────────────────────────────────────────────────────
interface TokenUsageChartProps {
  usages: DetailedTokenUsage[];
}

export function TokenUsageChart({ usages }: TokenUsageChartProps) {
  // Aggregate tokens per Agent
  const agentMap: Record<string, { prompt: number; completion: number; reasoning: number }> = {};
  usages.forEach((u) => {
    if (!agentMap[u.agentId]) {
      agentMap[u.agentId] = { prompt: 0, completion: 0, reasoning: 0 };
    }
    agentMap[u.agentId].prompt += u.usage.promptTokens;
    agentMap[u.agentId].completion += u.usage.completionTokens;
    agentMap[u.agentId].reasoning += u.usage.reasoningTokens;
  });

  const agentIds = Object.keys(agentMap).slice(0, 5); // top 5
  const maxTokens = Math.max(...agentIds.map((id) => agentMap[id].prompt + agentMap[id].completion), 100);

  return (
    <div className="flex flex-col p-5 bg-surface-card border border-border/40 rounded-2xl shadow-sm w-full">
      <h4 className="text-sm font-medium text-muted-foreground mb-4">Token Usage per Agent</h4>
      <div className="flex flex-col gap-4">
        {agentIds.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">No token tracking logged yet.</div>
        ) : (
          agentIds.map((aid) => {
            const val = agentMap[aid];
            const total = val.prompt + val.completion;
            const promptPct = (val.prompt / maxTokens) * 100;
            const completionPct = (val.completion / maxTokens) * 100;

            return (
              <div key={aid} className="flex flex-col text-xs font-medium">
                <div className="flex justify-between text-foreground mb-1.5">
                  <span className="font-semibold">{aid}</span>
                  <span className="text-muted-foreground">{total.toLocaleString()} tokens</span>
                </div>
                <div className="h-6 w-full bg-border/20 rounded-lg overflow-hidden flex">
                  {/* Prompt tokens */}
                  <div
                    style={{ width: `${promptPct}%` }}
                    className="bg-brand-500 h-full flex items-center justify-center text-[9px] text-white font-bold transition-all duration-500"
                    title={`Prompt: ${val.prompt}`}
                  >
                    {val.prompt > 100 && "Prompt"}
                  </div>
                  {/* Completion tokens */}
                  <div
                    style={{ width: `${completionPct}%` }}
                    className="bg-sky-500 h-full flex items-center justify-center text-[9px] text-white font-bold transition-all duration-500"
                    title={`Completion: ${val.completion}`}
                  >
                    {val.completion > 100 && "Comp"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex justify-center gap-4 mt-4 text-[10px] font-semibold text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-brand-500" />
          <span>Prompt Tokens</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-sky-500" />
          <span>Completion Tokens</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gantt Timeline Chart: Agent Execution Sequence Timeline (Task 3 / Task 6)
// ─────────────────────────────────────────────────────────────────────────────
interface TimelineProps {
  metrics: AgentExecutionMetrics[];
}

export function ExecutionTimelineChart({ metrics }: TimelineProps) {
  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 bg-surface-card border border-border/40 rounded-2xl shadow-sm text-xs text-muted-foreground">
        No execution timeline data available.
      </div>
    );
  }

  // Find min start and max end
  const startTimes = metrics.map((m) => new Date(m.executionStart).getTime());
  const endTimes = metrics.map((m) => (m.executionEnd ? new Date(m.executionEnd).getTime() : Date.now()));
  
  const absoluteMin = Math.min(...startTimes);
  const absoluteMax = Math.max(...endTimes);
  const totalScope = Math.max(absoluteMax - absoluteMin, 1);

  return (
    <div className="flex flex-col p-5 bg-surface-card border border-border/40 rounded-2xl shadow-sm w-full">
      <h4 className="text-sm font-medium text-muted-foreground mb-4">Sequence Execution Timeline</h4>
      <div className="flex flex-col gap-3.5">
        {metrics.map((m) => {
          const itemStart = new Date(m.executionStart).getTime();
          const itemEnd = m.executionEnd ? new Date(m.executionEnd).getTime() : Date.now();
          const duration = itemEnd - itemStart;

          const leftPct = ((itemStart - absoluteMin) / totalScope) * 100;
          const widthPct = (duration / totalScope) * 100;

          return (
            <div key={m.agentId} className="flex flex-col md:flex-row md:items-center text-xs">
              <span className="w-32 font-bold text-foreground truncate mb-1 md:mb-0">{m.agentName}</span>
              <div className="flex-1 h-7 bg-border/20 rounded-xl relative overflow-visible">
                <div
                  style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
                  className="absolute top-1 bottom-1 bg-brand-500/20 border border-brand-500/50 rounded-lg flex items-center px-2 text-[10px] text-brand-600 font-bold overflow-hidden whitespace-nowrap transition-all"
                  title={`${m.agentName} duration: ${duration}ms`}
                >
                  {duration}ms
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
