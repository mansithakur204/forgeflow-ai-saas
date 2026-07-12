"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Database, Network, MessageSquare, Brain, Eye, RotateCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MemoryNode {
  id: string;
  name: string;
  type: "working" | "conversation" | "knowledge" | "vector";
  size: string;
  recordsCount: number;
  description: string;
  color: string;
  icon: React.ReactNode;
  mockRecords: { key: string; val: string }[];
}

export function MemoryGraph() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("working");
  const [isResetting, setIsResetting] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemory = async () => {
    try {
      const res = await fetch("/api/memory");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error("Failed to fetch live memory graph data", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchMemory();
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    toast.success("Purging local memory cache...");
    try {
      const res = await fetch("/api/memory", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Memory cache successfully purged!");
        fetchMemory();
      } else {
        throw new Error(data.error || "Failed to purge memory");
      }
    } catch (err: any) {
      toast.error(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const workingEntries = entries.filter((e) => e.type === "working");
  const convEntries = entries.filter((e) => e.type === "conversation");
  const vectorEntries = entries.filter((e) => ["long-term", "semantic", "episodic"].includes(e.type));

  const nodes: MemoryNode[] = [
    {
      id: "working",
      name: "Working Memory",
      type: "working",
      size: stats ? `${((stats.bytesUsed * 0.1) / 1024).toFixed(2)} KB` : "0.12 KB",
      recordsCount: workingEntries.length,
      description: "Ephemeral short-term scratchpad holding local loop contexts, active variables, and script stack values.",
      color: "text-blue-500 fill-blue-500 bg-blue-500/10 border-blue-500/20",
      icon: <Brain className="w-4 h-4" />,
      mockRecords: workingEntries.length > 0
        ? workingEntries.map((e) => ({ key: e.key, val: typeof e.value === "object" ? JSON.stringify(e.value) : String(e.value) }))
        : [
            { key: "active_step", val: "compile_check_source_files" },
            { key: "temp_scratch_result", val: "{ success: true, count: 18 }" },
            { key: "iteration_count", val: "3" },
            { key: "last_tool_called", val: "tool-file" }
          ]
    },
    {
      id: "conversation",
      name: "Conversation Memory",
      type: "conversation",
      size: stats ? `${((stats.bytesUsed * 0.3) / 1024).toFixed(2)} KB` : "0.85 KB",
      recordsCount: convEntries.length,
      description: "Chat history buffer mapping turns, prompts, responses, and summarizations within the active session window.",
      color: "text-emerald-500 fill-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      icon: <MessageSquare className="w-4 h-4" />,
      mockRecords: convEntries.length > 0
        ? convEntries.map((e) => ({ key: e.key || "dialogue", val: typeof e.value === "object" ? JSON.stringify(e.value) : String(e.value) }))
        : [
            { key: "session_id", val: "conv_8f88a91b" },
            { key: "turn_count", val: "8" },
            { key: "user_first_name", val: "Devon" },
            { key: "last_summary", val: "User requested React code review..." }
          ]
    },
    {
      id: "knowledge",
      name: "Knowledge Memory",
      type: "knowledge",
      size: stats ? `${((stats.bytesUsed * 0.6) / 1024).toFixed(2)} KB` : "1.24 MB",
      recordsCount: stats ? stats.totalEntries : 8,
      description: "Structured files uploaded directly, including metadata maps, schemas, and rule references.",
      color: "text-amber-500 fill-amber-500 bg-amber-500/10 border-amber-500/20",
      icon: <Database className="w-4 h-4" />,
      mockRecords: [
        { key: "active_source", val: "company_handbook_2026.pdf" },
        { key: "index_dim", val: "1536" },
        { key: "chunk_overlap", val: "200 characters" },
        { key: "retrieval_strategy", val: "hybrid_search_bm25" }
      ]
    },
    {
      id: "vector",
      name: "Vector Memory",
      type: "vector",
      size: stats ? `${(stats.bytesUsed / 1024).toFixed(2)} KB` : "450 KB",
      recordsCount: vectorEntries.length,
      description: "Long-term episodic semantic embeddings index for matching queries against past session files.",
      color: "text-purple-500 fill-purple-500 bg-purple-500/10 border-purple-500/20",
      icon: <Network className="w-4 h-4" />,
      mockRecords: vectorEntries.length > 0
        ? vectorEntries.map((e) => ({ key: e.key, val: typeof e.value === "object" ? JSON.stringify(e.value) : String(e.value) }))
        : [
            { key: "project_info", val: "ForgeFlow AI Core version 1.0.0" },
            { key: "ep-1", val: "Processed 12,480 records successfully [SUCCESS]" },
            { key: "index_provider", val: "in_memory_vector_store" },
            { key: "metric_type", val: "cosine_similarity" }
          ]
    }
  ];

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Visual Memory Graph Block */}
      <div className="lg:col-span-2 border border-border/60 bg-card rounded-xl p-5 flex flex-col justify-between min-h-[380px] relative overflow-hidden">
        <div className="flex items-center justify-between z-10">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Interactive Memory Graph Map</h3>
            <p className="text-xs text-muted-foreground">Select a memory node to inspect state registers.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} className="h-8 gap-1.5" disabled={isResetting}>
            <RotateCw className={cn("w-3.5 h-3.5", isResetting && "animate-spin")} />
            <span>Reset Cache</span>
          </Button>
        </div>

        {/* Interactive SVG Network */}
        <div className="flex items-center justify-center flex-1 my-6 min-h-[260px]">
          <svg className="w-full max-w-[480px] h-[240px] overflow-visible" viewBox="0 0 500 240">
            {/* Connection Paths (Background arcs) */}
            {/* Center Central Core Coordinate: 250, 120 */}
            
            {/* Arcs linking nodes */}
            <path d="M 120,120 Q 250,40 380,120" stroke="oklch(var(--border) / 60%)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" className="animate-[pulse_4s_infinite]" />
            <path d="M 120,120 Q 250,200 380,120" stroke="oklch(var(--border) / 60%)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
            <path d="M 250,50 L 250,190" stroke="oklch(var(--border) / 50%)" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
            <path d="M 120,120 L 380,120" stroke="oklch(var(--border) / 50%)" strokeWidth="1.5" strokeDasharray="2 2" fill="none" />

            {/* Core Center hub indicator */}
            <circle cx="250" cy="120" r="14" fill="oklch(var(--muted))" stroke="oklch(var(--border))" strokeWidth="1" />
            <Brain className="w-4 h-4 text-muted-foreground/80 absolute" style={{ transform: "translate(242px, 112px)" }} />

            {/* Working Memory Node: (250, 50) */}
            <g className="cursor-pointer" onClick={() => setSelectedNodeId("working")}>
              <circle
                cx="250"
                cy="50"
                r="30"
                className={cn(
                  "transition-all duration-300 stroke-2",
                  selectedNodeId === "working" 
                    ? "fill-blue-500/20 stroke-blue-500 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]" 
                    : "fill-muted stroke-border hover:fill-blue-500/5 hover:stroke-blue-500/50"
                )}
              />
              <text x="250" y="54" textAnchor="middle" className="text-[9px] font-semibold font-sans pointer-events-none fill-foreground">Working</text>
            </g>

            {/* Conversation Memory Node: (120, 120) */}
            <g className="cursor-pointer" onClick={() => setSelectedNodeId("conversation")}>
              <circle
                cx="120"
                cy="120"
                r="30"
                className={cn(
                  "transition-all duration-300 stroke-2",
                  selectedNodeId === "conversation"
                    ? "fill-emerald-500/20 stroke-emerald-500 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    : "fill-muted stroke-border hover:fill-emerald-500/5 hover:stroke-emerald-500/50"
                )}
              />
              <text x="120" y="124" textAnchor="middle" className="text-[9px] font-semibold font-sans pointer-events-none fill-foreground">Conversation</text>
            </g>

            {/* Vector Memory Node: (380, 120) */}
            <g className="cursor-pointer" onClick={() => setSelectedNodeId("vector")}>
              <circle
                cx="380"
                cy="120"
                r="30"
                className={cn(
                  "transition-all duration-300 stroke-2",
                  selectedNodeId === "vector"
                    ? "fill-purple-500/20 stroke-purple-500 filter drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                    : "fill-muted stroke-border hover:fill-purple-500/5 hover:stroke-purple-500/50"
                )}
              />
              <text x="380" y="124" textAnchor="middle" className="text-[9px] font-semibold font-sans pointer-events-none fill-foreground">Vector</text>
            </g>

            {/* Knowledge Memory Node: (250, 190) */}
            <g className="cursor-pointer" onClick={() => setSelectedNodeId("knowledge")}>
              <circle
                cx="250"
                cy="190"
                r="30"
                className={cn(
                  "transition-all duration-300 stroke-2",
                  selectedNodeId === "knowledge"
                    ? "fill-amber-500/20 stroke-amber-500 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                    : "fill-muted stroke-border hover:fill-amber-500/5 hover:stroke-amber-500/50"
                )}
              />
              <text x="250" y="194" textAnchor="middle" className="text-[9px] font-semibold font-sans pointer-events-none fill-foreground">Knowledge</text>
            </g>
          </svg>
        </div>

        {/* Animated pulses representing data flow */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping" />
            <span>Real-time Sync Active</span>
          </span>
          <span>Indexed vectors update dynamically</span>
        </div>
      </div>

      {/* Selected Node Drawer */}
      <Card className="border-border/60 shadow-sm flex flex-col justify-between">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-md", selectedNode.color.split(" ").slice(-3).join(" "))}>
              {selectedNode.icon}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{selectedNode.name}</CardTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground font-mono">Allocation: {selectedNode.size}</span>
                <span className="text-muted-foreground/60">•</span>
                <span className="text-[10px] text-muted-foreground font-mono">{selectedNode.recordsCount} records</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 py-4 flex flex-col justify-between">
          <div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              {selectedNode.description}
            </p>

            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block mb-2">Memory Register Key-Values</span>
            <div className="flex flex-col gap-2 max-h-[190px] overflow-y-auto pr-1">
              {selectedNode.mockRecords.map((rec) => (
                <div key={rec.key} className="p-2 rounded border bg-muted/20 text-xs font-mono">
                  <span className="text-brand-500 font-semibold">{rec.key}:</span>
                  <span className="text-foreground ml-1.5 break-all">{rec.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border/40 pt-3 mt-4 text-[10px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>Register diagnostics</span>
            </span>
            <span className="font-semibold text-success font-mono">ONLINE</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
