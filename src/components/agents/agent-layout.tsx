"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Agent } from "@/lib/agents-data";
import { ProviderBadge, ModelBadge, AgentStatusBadge } from "./agent-badges";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronRight, Play, Settings, Save, Trash2, Calendar, User, Eye, History } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AgentHeaderProps {
  agent: Agent;
  onRun?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: "active" | "paused" | "archived") => void;
}

export function AgentHeader({ agent, onRun, onDelete, onStatusChange }: AgentHeaderProps) {
  const [status, setStatus] = useState(agent.status);

  const handleStatusToggle = () => {
    const nextStatus = status === "active" ? "paused" : "active";
    setStatus(nextStatus);
    if (onStatusChange) {
      onStatusChange(nextStatus);
    }
    toast.success(`Agent status updated to: ${nextStatus === "active" ? "Active" : "Paused"}`);
  };

  const handleTriggerRun = () => {
    if (onRun) onRun();
    toast.success(`Triggered execution run for ${agent.name}!`);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5 mb-6">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/agents" className="hover:text-foreground transition-colors">
            Agents
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium truncate">{agent.name}</span>
        </nav>
        
        <div className="flex flex-wrap items-center gap-2.5 mt-1">
          <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight tracking-tight">{agent.name}</h1>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/30">
            {agent.version}
          </span>
          <AgentStatusBadge status={status} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
        <Button variant="outline" size="sm" onClick={handleStatusToggle} className="h-9 text-xs">
          {status === "active" ? "Pause Agent" : "Activate Agent"}
        </Button>

        {onDelete && (
          <Button variant="outline" size="sm" onClick={onDelete} className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}

        <Button onClick={handleTriggerRun} className="h-9 text-xs gap-1.5 bg-brand-500 hover:bg-brand-600 text-white">
          <Play className="w-3.5 h-3.5 fill-current shrink-0" />
          <span>Execute Run</span>
        </Button>
      </div>
    </div>
  );
}

interface AgentSidebarProps {
  agent: Agent;
}

export function AgentSidebar({ agent }: AgentSidebarProps) {
  const formattedDate = new Date(agent.lastRun).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-semibold">Agent Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent className="py-4 flex flex-col gap-4 text-xs">
          <div className="flex justify-between py-1.5 border-b border-border/35">
            <span className="text-muted-foreground">Provider</span>
            <ProviderBadge providerId={agent.providerId} />
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/35">
            <span className="text-muted-foreground">Model Name</span>
            <ModelBadge modelId={agent.modelId} />
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/35">
            <span className="text-muted-foreground">Temperature</span>
            <span className="font-mono font-medium text-foreground">{agent.temperature}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/35">
            <span className="text-muted-foreground">Top P Sampling</span>
            <span className="font-mono font-medium text-foreground">{agent.topP}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/35">
            <span className="text-muted-foreground">Max Output Tokens</span>
            <span className="font-mono font-medium text-foreground">{agent.maxTokens}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/35">
            <span className="text-muted-foreground">Streaming Enabled</span>
            <span className="font-medium text-foreground">{agent.streaming ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-muted-foreground">Strict JSON Mode</span>
            <span className="font-medium text-foreground">{agent.jsonMode ? "Enabled" : "Disabled"}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-semibold">Security & Access</CardTitle>
        </CardHeader>
        <CardContent className="py-4 flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Outbound Internet Access</span>
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase", agent.permissions.internet ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
              {agent.permissions.internet ? "Allowed" : "Blocked"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">File System Access</span>
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase", agent.permissions.fileAccess ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
              {agent.permissions.fileAccess ? "Allowed" : "Blocked"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Incoming Webhook Callbacks</span>
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase", agent.permissions.webhooks ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
              {agent.permissions.webhooks ? "Allowed" : "Blocked"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm text-xs text-muted-foreground">
        <CardContent className="py-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground/60 shrink-0" />
            <span>Created by: <span className="font-medium text-foreground">{agent.createdBy}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground/60 shrink-0" />
            <span>Last ran: <span className="font-medium text-foreground">{formattedDate}</span></span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
