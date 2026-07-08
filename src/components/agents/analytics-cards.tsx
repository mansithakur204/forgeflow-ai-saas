"use client";

import React, { useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { mockAnalytics } from "@/lib/agents-data";
import { Activity, Cpu, Clock, DollarSign, CheckCircle2, AlertTriangle, Play, BarChart3, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AnalyticsCards() {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");
  const [activeChart, setActiveChart] = useState<"requests" | "cost" | "latency">("requests");

  // Sum calculations for metrics
  const totalRequests = mockAnalytics.reduce((acc, curr) => acc + curr.requests, 0);
  const totalTokens = mockAnalytics.reduce((acc, curr) => acc + curr.tokensUsed, 0);
  const avgLatency = Math.round(mockAnalytics.reduce((acc, curr) => acc + curr.latency, 0) / mockAnalytics.length);
  const totalCost = mockAnalytics.reduce((acc, curr) => acc + curr.cost, 0);
  const totalErrors = mockAnalytics.reduce((acc, curr) => acc + curr.errors, 0);
  const successRate = 96.4; // Average summary rate

  // Custom SVG Chart calculations
  const chartHeight = 140;
  const chartWidth = 520;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 10;
  const paddingBottom = 20;

  const dataPoints = mockAnalytics;
  const maxVal = Math.max(...dataPoints.map((d) => 
    activeChart === "requests" ? d.requests : activeChart === "cost" ? d.cost : d.latency
  )) * 1.15; // 15% headroom

  // Calculate coordinates for SVG path
  const coords = dataPoints.map((d, index) => {
    const val = activeChart === "requests" ? d.requests : activeChart === "cost" ? d.cost : d.latency;
    const x = paddingLeft + (index / (dataPoints.length - 1)) * (chartWidth - paddingLeft - paddingRight);
    const y = chartHeight - paddingBottom - (val / maxVal) * (chartHeight - paddingTop - paddingBottom);
    return { x, y, ...d };
  });

  const pathD = coords.length > 0 
    ? `M ${coords[0].x} ${coords[0].y} ` + coords.slice(1).map((c) => `L ${c.x} ${c.y}`).join(" ")
    : "";

  const areaD = coords.length > 0
    ? `${pathD} L ${coords[coords.length - 1].x} ${chartHeight - paddingBottom} L ${coords[0].x} ${chartHeight - paddingBottom} Z`
    : "";

  return (
    <div className="flex flex-col gap-6">
      {/* 6 Metric Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          label="Requests"
          value={totalRequests.toLocaleString()}
          delta="+14.2%"
          trend="up"
          deltaLabel="vs last hour"
          icon={<Activity className="w-4 h-4" />}
          iconVariant="brand"
        />
        <StatCard
          label="Tokens Used"
          value={`${(totalTokens / 1000000).toFixed(2)}M`}
          delta="+8.5%"
          trend="up"
          deltaLabel="vs last hour"
          icon={<Cpu className="w-4 h-4" />}
          iconVariant="default"
        />
        <StatCard
          label="Avg Latency"
          value={`${avgLatency}ms`}
          delta="-42ms"
          trend="up" // improvement
          deltaLabel="vs last hour"
          icon={<Clock className="w-4 h-4" />}
          iconVariant="warning"
        />
        <StatCard
          label="Total Cost"
          value={`$${totalCost.toFixed(2)}`}
          delta="+11.0%"
          trend="down" // cost went up
          deltaLabel="vs last hour"
          icon={<DollarSign className="w-4 h-4" />}
          iconVariant="success"
        />
        <StatCard
          label="Success Rate"
          value={`${successRate}%`}
          delta="+0.8%"
          trend="up"
          deltaLabel="vs last hour"
          icon={<CheckCircle2 className="w-4 h-4" />}
          iconVariant="success"
        />
        <StatCard
          label="Errors Logged"
          value={totalErrors}
          delta="-12%"
          trend="up" // error went down
          deltaLabel="vs last hour"
          icon={<AlertTriangle className="w-4 h-4" />}
          iconVariant="destructive"
        />
      </div>

      {/* Interactive Chart Section */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-sm font-semibold">Usage & Performance Trends</CardTitle>
            <p className="text-xs text-muted-foreground">Historical charts mapping resource consumption and throughput.</p>
          </div>
          
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 shrink-0">
            <Button
              variant={activeChart === "requests" ? "secondary" : "ghost"}
              onClick={() => setActiveChart("requests")}
              className="h-7 text-xs px-2.5 rounded-md"
            >
              Requests
            </Button>
            <Button
              variant={activeChart === "cost" ? "secondary" : "ghost"}
              onClick={() => setActiveChart("cost")}
              className="h-7 text-xs px-2.5 rounded-md"
            >
              Cost
            </Button>
            <Button
              variant={activeChart === "latency" ? "secondary" : "ghost"}
              onClick={() => setActiveChart("latency")}
              className="h-7 text-xs px-2.5 rounded-md"
            >
              Latency
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto pr-1">
            <div className="min-w-[540px] h-[170px] relative">
              <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                {/* Horizontal gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                  const y = paddingTop + p * (chartHeight - paddingTop - paddingBottom);
                  const displayVal = Math.round(maxVal * (1 - p));
                  return (
                    <g key={i} className="opacity-40">
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke="oklch(var(--border))"
                        strokeWidth="0.5"
                        strokeDasharray="3 3"
                      />
                      <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[9px] fill-muted-foreground font-mono">
                        {activeChart === "cost" ? `$${displayVal.toFixed(1)}` : displayVal}
                      </text>
                    </g>
                  );
                })}

                {/* Area Gradient */}
                <defs>
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(var(--brand-500))" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="oklch(var(--brand-500))" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Path Area */}
                {coords.length > 0 && (
                  <>
                    <path d={areaD} fill="url(#chartGlow)" />
                    <path d={pathD} fill="none" stroke="oklch(var(--brand-500))" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}

                {/* Vertical timestamp ticks */}
                {coords.map((c, index) => {
                  if (index % 2 !== 0) return null; // skip half for label clarity
                  return (
                    <text
                      key={index}
                      x={c.x}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      className="text-[9px] fill-muted-foreground font-mono"
                    >
                      {c.timestamp}
                    </text>
                  );
                })}

                {/* Active circle dots on hover */}
                {coords.map((c, index) => (
                  <g key={index} className="group/dot cursor-pointer">
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="3.5"
                      className="fill-brand-500 stroke-background stroke-2 transition-all duration-150 group-hover/dot:r-5 group-hover/dot:fill-foreground"
                    />
                    {/* Tooltip on dot hover */}
                    <g className="opacity-0 pointer-events-none group-hover/dot:opacity-100 transition-opacity duration-150 z-20">
                      <rect
                        x={c.x - 35}
                        y={c.y - 28}
                        width="70"
                        height="20"
                        rx="4"
                        className="fill-popover stroke-border stroke-[0.5] shadow-sm"
                      />
                      <text
                        x={c.x}
                        y={c.y - 15}
                        textAnchor="middle"
                        className="text-[9px] font-bold fill-popover-foreground font-mono"
                      >
                        {activeChart === "cost" 
                          ? `$${c.cost.toFixed(2)}` 
                          : activeChart === "requests" 
                          ? `${c.requests} reqs` 
                          : `${c.latency}ms`}
                      </text>
                    </g>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/40 pt-4 mt-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
              <span className="font-semibold text-foreground capitalize">{activeChart}</span>
            </span>
            <span>•</span>
            <span>Usage tracks real-time intervals. Hourly totals map dynamically.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
