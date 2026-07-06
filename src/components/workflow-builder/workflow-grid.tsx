"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  type Workflow,
  type WorkflowStatus,
  formatWorkflowTime,
} from "@/lib/workflow-data";
import {
  Play,
  Pause,
  FileEdit,
  Archive,
  AlertCircle,
  GitBranch,
  Clock,
  Zap,
  MoreHorizontal,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Grid
// Responsive card grid for the /workflows list page.
// ─────────────────────────────────────────────────────────────────────────────

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  WorkflowStatus,
  { label: string; icon: React.ElementType; badgeCls: string; dotCls: string }
> = {
  active: {
    label: "Active",
    icon: Play,
    badgeCls: "bg-success/10 text-success border-success/20",
    dotCls: "bg-success animate-pulse",
  },
  paused: {
    label: "Paused",
    icon: Pause,
    badgeCls: "bg-warning/10 text-warning border-warning/20",
    dotCls: "bg-warning",
  },
  draft: {
    label: "Draft",
    icon: FileEdit,
    badgeCls: "bg-muted text-muted-foreground border-border/50",
    dotCls: "bg-muted-foreground/50",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    badgeCls: "bg-muted text-muted-foreground/60 border-border/40",
    dotCls: "bg-muted-foreground/30",
  },
  error: {
    label: "Error",
    icon: AlertCircle,
    badgeCls: "bg-destructive/10 text-destructive border-destructive/20",
    dotCls: "bg-destructive",
  },
};

// ── Workflow Card ─────────────────────────────────────────────────────────────

interface WorkflowCardProps {
  workflow: Workflow;
  index: number;
}

function WorkflowCard({ workflow, index }: WorkflowCardProps) {
  const status = STATUS_CONFIG[workflow.status];
  const StatusIcon = status.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card",
        "shadow-xs hover:shadow-md",
        "transition-all duration-200 hover:-translate-y-0.5",
        workflow.status === "error"
          ? "border-destructive/30 hover:border-destructive/50"
          : "border-border/60 hover:border-border"
      )}
      aria-label={`Workflow: ${workflow.name}`}
    >
      {/* ── Card header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        {/* Icon + name */}
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "w-9 h-9 rounded-lg shrink-0 flex items-center justify-center mt-0.5",
              workflow.status === "error"
                ? "bg-destructive/10"
                : workflow.status === "active"
                ? "bg-brand-500/10"
                : "bg-muted"
            )}
            aria-hidden="true"
          >
            <GitBranch
              className={cn(
                "w-4 h-4",
                workflow.status === "error"
                  ? "text-destructive"
                  : workflow.status === "active"
                  ? "text-brand-500"
                  : "text-muted-foreground"
              )}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate leading-snug">
              {workflow.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
              {workflow.description}
            </p>
          </div>
        </div>

        {/* Context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            id={`workflow-menu-${workflow.id}`}
            className={cn(
              "shrink-0 p-1.5 rounded-md text-muted-foreground",
              "hover:text-foreground hover:bg-muted transition-colors",
              "opacity-0 group-hover:opacity-100 focus:opacity-100",
              "focus-visible:outline-2 focus-visible:outline-ring"
            )}
            aria-label={`Options for ${workflow.name}`}
          >
            <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem className="gap-2 cursor-pointer text-xs">
              <Play className="w-3.5 h-3.5" /> Run now
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer text-xs">
              <FileEdit className="w-3.5 h-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer text-xs">
              <GitBranch className="w-3.5 h-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="gap-2 cursor-pointer text-xs"
            >
              <Archive className="w-3.5 h-3.5" /> Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Tags ──────────────────────────────────────────────────────── */}
      {workflow.tags.length > 0 && (
        <div className="px-4 flex flex-wrap gap-1.5">
          {workflow.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-4 py-3 mt-auto text-xs text-muted-foreground">
        {/* Node count */}
        <span className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{workflow.nodeCount} nodes</span>
        </span>

        {/* Run count */}
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{workflow.runCount.toLocaleString()} runs</span>
        </span>

        {/* Last run */}
        <span className="flex items-center gap-1.5 ml-auto">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{formatWorkflowTime(workflow.lastRun)}</span>
        </span>
      </div>

      {/* ── Footer: status + open button ──────────────────────────────── */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-2.5",
          "border-t border-border/40 rounded-b-xl"
        )}
      >
        {/* Status badge */}
        <Badge
          variant="outline"
          className={cn("gap-1.5 text-[11px] font-medium", status.badgeCls)}
        >
          <span
            className={cn("w-1.5 h-1.5 rounded-full", status.dotCls)}
            aria-hidden="true"
          />
          {status.label}
        </Badge>

        {/* Open in builder */}
        <Link
          href={`/workflows/${workflow.id}`}
          className={cn(
            "flex items-center gap-1 text-xs font-medium text-muted-foreground",
            "hover:text-brand-500 transition-colors group/link",
            "focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
          )}
          aria-label={`Open ${workflow.name} in builder`}
        >
          Open
          <ArrowRight
            className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </motion.article>
  );
}

// ── Workflow Grid ─────────────────────────────────────────────────────────────

interface WorkflowGridProps {
  workflows: Workflow[];
}

export function WorkflowGrid({ workflows }: WorkflowGridProps) {
  if (workflows.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-12">
        <EmptyState
          size="lg"
          icon={<GitBranch />}
          iconVariant="brand"
          title="No workflows yet"
          description="Create your first workflow to start automating with AI. Drag nodes, connect them, and run in seconds."
          action={
            <Link href="/workflows/new">
              <Button variant="glow" size="sm" className="gap-2">
                <Plus className="w-4 h-4" aria-hidden="true" />
                Create Workflow
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      aria-label="Workflows"
    >
      {workflows.map((workflow, i) => (
        <WorkflowCard key={workflow.id} workflow={workflow} index={i} />
      ))}

      {/* "New workflow" card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          delay: workflows.length * 0.04,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <Link
          href="/workflows/new"
          className={cn(
            "group flex flex-col items-center justify-center gap-3 rounded-xl border",
            "border-dashed border-border/60 bg-card/50",
            "min-h-[200px] p-6 text-center",
            "hover:border-brand-500/40 hover:bg-brand-500/[0.02]",
            "transition-all duration-200",
            "focus-visible:outline-2 focus-visible:outline-ring"
          )}
          aria-label="Create new workflow"
        >
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border",
              "border-dashed border-border/60 text-muted-foreground/50",
              "group-hover:border-brand-500/40 group-hover:text-brand-500/70",
              "transition-all duration-200"
            )}
            aria-hidden="true"
          >
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              New Workflow
            </p>
            <p className="text-xs text-muted-foreground/50 mt-0.5">
              Start from scratch or a template
            </p>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
