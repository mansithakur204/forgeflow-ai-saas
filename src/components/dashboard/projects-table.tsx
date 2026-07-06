"use client";

import React, { useState } from "react";
import { FolderOpen, ArrowUpRight, Calendar, Workflow, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CustomCard,
  CustomCardHeader,
  CustomCardTitle,
  CustomCardContent,
} from "@/components/ui/custom-card";
import {
  type RecentProject,
  type ProjectStatus,
  formatRelativeTime,
} from "@/lib/dashboard-data";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Recent Projects Table
// Responsive table showing projects with status, owner, and last updated.
// Includes loading skeleton, empty state, and row hover effects.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Status badge config ───────────────────────────────────────────────────────

type BadgeVariant = "success" | "warning" | "secondary" | "outline";

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; variant: BadgeVariant }
> = {
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  draft: { label: "Draft", variant: "secondary" },
  archived: { label: "Archived", variant: "outline" },
};

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function ProjectsTableSkeleton() {
  return (
    <CustomCard>
      <CustomCardHeader>
        <Skeleton className="h-4 w-32" />
      </CustomCardHeader>
      <CustomCardContent className="pt-0 overflow-x-auto">
        <table className="w-full text-sm" aria-label="Loading projects">
          <thead>
            <tr className="border-b border-border/50">
              {["Project Name", "Status", "Last Updated", "Owner", ""].map(
                (col) => (
                  <th
                    key={col}
                    className="text-left py-2.5 pr-4 text-xs font-medium text-muted-foreground whitespace-nowrap"
                  >
                    <Skeleton className="h-3 w-16" />
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-36" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <Skeleton className="h-4 w-16 rounded-full" />
                </td>
                <td className="py-3 pr-4">
                  <Skeleton className="h-3 w-20" />
                </td>
                <td className="py-3 pr-4">
                  <Skeleton className="h-3 w-24" />
                </td>
                <td className="py-3">
                  <Skeleton className="h-6 w-6 rounded-md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CustomCardContent>
    </CustomCard>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function ProjectsTableEmpty() {
  return (
    <CustomCard>
      <CustomCardHeader>
        <CustomCardTitle>Recent Projects</CustomCardTitle>
      </CustomCardHeader>
      <CustomCardContent className="pt-0">
        <EmptyState
          size="sm"
          icon={<FolderOpen />}
          iconVariant="brand"
          title="No projects yet"
          description="Create your first project to start building AI workflows."
          action={
            <Button variant="brand" size="sm" className="cursor-pointer gap-2">
              <Plus className="w-4 h-4" aria-hidden="true" />
              New Project
            </Button>
          }
        />
      </CustomCardContent>
    </CustomCard>
  );
}

// ─── Project Row ───────────────────────────────────────────────────────────────

function ProjectRow({ project }: { project: RecentProject }) {
  const [hovered, setHovered] = useState(false);
  const { label, variant } = STATUS_CONFIG[project.status];
  const relTime = formatRelativeTime(project.lastUpdated);

  return (
    <tr
      className={cn(
        "border-b border-border/40 last:border-0",
        "transition-colors duration-150 cursor-pointer",
        "hover:bg-muted/40"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      tabIndex={0}
      role="row"
      aria-label={`Project: ${project.name}`}
    >
      {/* Project Name + workflows count */}
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
              "bg-brand-500/10 text-brand-500 transition-colors duration-150",
              hovered && "bg-brand-500 text-white"
            )}
            aria-hidden="true"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className={cn(
              "text-sm font-medium leading-tight truncate",
              "transition-colors duration-150",
              hovered ? "text-brand-500" : "text-foreground"
            )}>
              {project.name}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Workflow className="w-3 h-3" aria-hidden="true" />
              {project.workflows} workflow{project.workflows !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="py-3 pr-4 whitespace-nowrap">
        <Badge variant={variant}>{label}</Badge>
      </td>

      {/* Last Updated */}
      <td className="py-3 pr-4 whitespace-nowrap">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
          {relTime}
        </span>
      </td>

      {/* Owner */}
      <td className="py-3 pr-4">
        <span className="text-xs text-foreground font-medium truncate block max-w-[120px]">
          {project.owner}
        </span>
      </td>

      {/* Open action */}
      <td className="py-3">
        <button
          className={cn(
            "p-1.5 rounded-md transition-all duration-150 cursor-pointer",
            "text-muted-foreground hover:text-brand-500 hover:bg-brand-500/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            hovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          aria-label={`Open ${project.name}`}
          tabIndex={0}
        >
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface ProjectsTableProps {
  projects: RecentProject[];
  loading?: boolean;
}

export function ProjectsTable({ projects, loading = false }: ProjectsTableProps) {
  if (loading) return <ProjectsTableSkeleton />;
  if (projects.length === 0) return <ProjectsTableEmpty />;

  return (
    <CustomCard>
      <CustomCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CustomCardTitle>Recent Projects</CustomCardTitle>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            New Project
          </Button>
        </div>
      </CustomCardHeader>
      <CustomCardContent className="pt-0 overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border/50">
              {[
                { label: "Project Name", cls: "" },
                { label: "Status", cls: "" },
                { label: "Last Updated", cls: "hidden sm:table-cell" },
                { label: "Owner", cls: "hidden md:table-cell" },
                { label: "", cls: "w-8" },
              ].map((col) => (
                <th
                  key={col.label}
                  scope="col"
                  className={cn(
                    "text-left py-2.5 pr-4 text-xs font-medium text-muted-foreground whitespace-nowrap",
                    col.cls
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </tbody>
        </table>
      </CustomCardContent>
    </CustomCard>
  );
}
