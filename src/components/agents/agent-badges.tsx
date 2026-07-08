"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { mockProviders } from "@/lib/agents-data";
import { Cpu, CheckCircle, PauseCircle, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderBadgeProps {
  providerId: string;
  className?: string;
}

export function ProviderBadge({ providerId, className }: ProviderBadgeProps) {
  const provider = mockProviders.find((p) => p.id === providerId);
  
  if (!provider) {
    return (
      <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", className)}>
        {providerId}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium border-border/50",
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", provider.color)} />
      <span className="truncate">{provider.name}</span>
    </Badge>
  );
}

interface ModelBadgeProps {
  modelId: string;
  className?: string;
}

export function ModelBadge({ modelId, className }: ModelBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/20",
        className
      )}
    >
      <Cpu className="w-2.5 h-2.5 shrink-0 text-muted-foreground/75" />
      <span className="truncate max-w-[120px]">{modelId}</span>
    </Badge>
  );
}

interface AgentStatusBadgeProps {
  status: "active" | "paused" | "archived";
  className?: string;
}

export function AgentStatusBadge({ status, className }: AgentStatusBadgeProps) {
  if (status === "active") {
    return (
      <Badge
        variant="success"
        className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", className)}
      >
        <CheckCircle className="w-3 h-3 text-success shrink-0" />
        <span>Active</span>
      </Badge>
    );
  }

  if (status === "paused") {
    return (
      <Badge
        variant="warning"
        className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", className)}
      >
        <PauseCircle className="w-3 h-3 text-warning shrink-0" />
        <span>Paused</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="destructive"
      className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", className)}
    >
      <Archive className="w-3 h-3 text-destructive shrink-0" />
      <span>Archived</span>
    </Badge>
  );
}
