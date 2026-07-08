"use client";

import React from "react";
import Link from "next/link";
import { Agent } from "@/lib/agents-data";
import { useRouter } from "next/navigation";
import { ProviderBadge, ModelBadge, AgentStatusBadge } from "./agent-badges";
import { CustomCard, CustomCardHeader, CustomCardContent, CustomCardFooter } from "@/components/ui/custom-card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, ExternalLink, Copy, Trash2, Archive, User, Zap, Percent, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agent: Agent;
  viewMode?: "grid" | "list";
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
}

export function AgentCard({
  agent,
  viewMode = "grid",
  onDuplicate,
  onDelete,
  onArchive,
}: AgentCardProps) {
  const router = useRouter();

  const formattedDate = new Date(agent.lastRun).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const actionMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground focus-visible:outline-ring"
        )}
        aria-label="Agent options"
      >
        <MoreVertical className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => router.push(`/agents/${agent.id}`)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open</span>
        </DropdownMenuItem>
        {onDuplicate && (
          <DropdownMenuItem onClick={() => onDuplicate(agent.id)} className="flex items-center gap-2">
            <Copy className="w-4 h-4" />
            <span>Duplicate</span>
          </DropdownMenuItem>
        )}
        {onArchive && agent.status !== "archived" && (
          <DropdownMenuItem onClick={() => onArchive(agent.id)} className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            <span>Archive</span>
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            onClick={() => onDelete(agent.id)}
            variant="destructive"
            className="flex items-center gap-2 text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (viewMode === "list") {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/10 hover:border-brand-500/20 transition-all duration-200">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg shrink-0 font-medium text-lg", agent.color || "bg-muted")}>
            {agent.avatar || "🤖"}
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Link href={`/agents/${agent.id}`} className="font-semibold text-foreground hover:text-brand-500 transition-colors truncate">
                {agent.name}
              </Link>
              <span className="text-[10px] text-muted-foreground font-mono">({agent.version})</span>
              <AgentStatusBadge status={agent.status} />
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              {agent.description}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <ProviderBadge providerId={agent.providerId} />
              <ModelBadge modelId={agent.modelId} />
              {agent.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted/65 text-muted-foreground font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Info Column */}
        <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between sm:justify-end shrink-0 w-full sm:w-auto text-xs text-muted-foreground border-t sm:border-t-0 border-border/30 pt-3 sm:pt-0">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Success Rate</p>
              <div className="flex items-center gap-0.5 font-medium text-foreground">
                <Percent className="w-3.5 h-3.5 text-success/80" />
                <span>{agent.successRate}%</span>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Total Runs</p>
              <div className="flex items-center gap-0.5 font-medium text-foreground">
                <Zap className="w-3.5 h-3.5 text-brand-500/80" />
                <span>{agent.runCount}</span>
              </div>
            </div>

            <div className="text-right hidden md:block">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Last Active</p>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-2">
            <Link
              href={`/agents/${agent.id}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "hidden sm:inline-flex h-8"
              )}
            >
              Configure
            </Link>
            {actionMenu}
          </div>
        </div>
      </div>
    );
  }

  // Grid View Mode (Default)
  return (
    <CustomCard variant="default" className="flex flex-col h-full hover:shadow-md hover:border-brand-500/20 transition-all duration-200">
      <CustomCardHeader className="flex-row items-start justify-between gap-4 p-5 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("flex items-center justify-center w-11 h-11 rounded-xl shrink-0 font-medium text-xl shadow-inner", agent.color || "bg-muted")}>
            {agent.avatar || "🤖"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Link href={`/agents/${agent.id}`} className="font-semibold text-foreground hover:text-brand-500 transition-colors truncate block">
                {agent.name}
              </Link>
              <span className="text-[10px] text-muted-foreground font-mono">({agent.version})</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <ProviderBadge providerId={agent.providerId} />
              <AgentStatusBadge status={agent.status} />
            </div>
          </div>
        </div>
        {actionMenu}
      </CustomCardHeader>

      <CustomCardContent className="flex-1 px-5 py-0 pb-3 flex flex-col justify-between">
        <div>
          <p className="text-xs text-muted-foreground line-clamp-3 mb-4 min-h-[48px] leading-relaxed">
            {agent.description}
          </p>

          <div className="mb-4">
            <ModelBadge modelId={agent.modelId} className="w-full justify-start py-1" />
          </div>

          {agent.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {agent.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted/65 text-muted-foreground font-medium"
                >
                  {tag}
                </span>
              ))}
              {agent.tags.length > 3 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted/40 text-muted-foreground font-medium">
                  +{agent.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 py-3 border-t border-border/40 text-xs">
          <div>
            <span className="text-[10px] uppercase text-muted-foreground/60 block tracking-wider">Success Rate</span>
            <div className="flex items-center gap-1 mt-0.5 font-semibold text-foreground">
              <Percent className="w-3.5 h-3.5 text-success shrink-0" />
              <span>{agent.successRate}%</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground/60 block tracking-wider">Run Count</span>
            <div className="flex items-center gap-1 mt-0.5 font-semibold text-foreground">
              <Zap className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              <span>{agent.runCount}</span>
            </div>
          </div>
        </div>
      </CustomCardContent>

      <CustomCardFooter className="flex items-center justify-between gap-2 p-5 pt-3 bg-muted/20 border-t border-border/30 rounded-b-xl text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1 truncate max-w-[60%]">
          <User className="w-3 h-3 text-muted-foreground/60 shrink-0" />
          <span className="truncate">{agent.createdBy}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-right">
          <Clock className="w-3 h-3 text-muted-foreground/60 shrink-0" />
          <span>{new Date(agent.lastRun).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>
      </CustomCardFooter>
    </CustomCard>
  );
}
