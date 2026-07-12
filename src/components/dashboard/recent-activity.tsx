"use client";

import React from "react";
import {
  Workflow,
  Bot,
  Network,
  AlertCircle,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Inbox,
  FileText,
  Trash2,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomCard, CustomCardHeader, CustomCardTitle, CustomCardContent } from "@/components/ui/custom-card";
import { type ActivityItem, type ActivityStatus, type ActivityType, formatRelativeTime } from "@/lib/dashboard-data";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Recent Activity Timeline
// Vertical feed of chronological events with status badges and timestamps.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Icon mapping by activity type ────────────────────────────────────────────

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  workflow: <Workflow className="w-3.5 h-3.5" />,
  agent: <Bot className="w-3.5 h-3.5" />,
  pipeline: <Network className="w-3.5 h-3.5" />,
  error: <AlertCircle className="w-3.5 h-3.5" />,
  import: <Upload className="w-3.5 h-3.5" />,
  knowledge_upload: <FileText className="w-3.5 h-3.5" />,
  knowledge_delete: <Trash2 className="w-3.5 h-3.5" />,
  memory_cache_purge: <Brain className="w-3.5 h-3.5" />,
};

const ACTIVITY_ICON_BG: Record<ActivityType, string> = {
  workflow: "bg-brand-500/10 text-brand-500",
  agent: "bg-violet-500/10 text-violet-500",
  pipeline: "bg-chart-3/10 text-chart-3",
  error: "bg-destructive/10 text-destructive",
  import: "bg-chart-4/10 text-chart-4",
  knowledge_upload: "bg-success/10 text-success",
  knowledge_delete: "bg-destructive/10 text-destructive",
  memory_cache_purge: "bg-warning/10 text-warning",
};

// ─── Status badge mapping ──────────────────────────────────────────────────────

type BadgeVariant = "success" | "destructive" | "warning" | "secondary";

const STATUS_CONFIG: Record<
  ActivityStatus,
  { label: string; variant: BadgeVariant; icon: React.ReactNode }
> = {
  completed: {
    label: "Completed",
    variant: "success",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    icon: <XCircle className="w-3 h-3" />,
  },
  running: {
    label: "Running",
    variant: "warning",
    icon: <Activity className="w-3 h-3" />,
  },
  pending: {
    label: "Pending",
    variant: "secondary",
    icon: <Clock className="w-3 h-3" />,
  },
};

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <CustomCard>
      <CustomCardHeader>
        <Skeleton className="h-4 w-32" />
      </CustomCardHeader>
      <CustomCardContent className="pt-0">
        <div className="flex flex-col" role="list" aria-label="Loading activity">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3 py-3 border-b border-border/50 last:border-0"
              aria-hidden="true"
            >
              {/* Icon */}
              <div className="shrink-0 mt-0.5">
                <Skeleton className="w-7 h-7 rounded-lg" />
              </div>
              {/* Content */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-12 shrink-0" />
                </div>
                <Skeleton className="h-3 w-64 max-w-full" />
                <div className="flex items-center gap-2 mt-0.5">
                  <Skeleton className="h-4 w-20 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CustomCardContent>
    </CustomCard>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function ActivityEmpty() {
  return (
    <CustomCard>
      <CustomCardHeader>
        <CustomCardTitle>Recent Activity</CustomCardTitle>
      </CustomCardHeader>
      <CustomCardContent className="pt-0">
        <EmptyState
          size="sm"
          icon={<Inbox />}
          iconVariant="default"
          title="No recent activity"
          description="Activity from your workflows, agents, and pipelines will appear here."
        />
      </CustomCardContent>
    </CustomCard>
  );
}

// ─── Single Activity Row ───────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
  const { label, variant, icon: statusIcon } = STATUS_CONFIG[item.status];
  const activityIcon = ACTIVITY_ICONS[item.type];
  const iconBg = ACTIVITY_ICON_BG[item.type];
  const relTime = formatRelativeTime(item.timestamp);

  return (
    <div
      role="listitem"
      className={cn(
        "group flex gap-3 py-3 px-2 -mx-2 rounded-lg",
        "border-b border-border/50 last:border-0",
        "hover:bg-muted/40 transition-colors duration-150 cursor-pointer"
      )}
    >
      {/* Type icon */}
      <div
        className={cn(
          "shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center",
          iconBg
        )}
        aria-hidden="true"
      >
        {activityIcon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground leading-tight line-clamp-1 group-hover:text-brand-500 transition-colors">
            {item.title}
          </p>
          <span
            className="text-[11px] text-muted-foreground shrink-0 tabular-nums mt-0.5"
            title={new Date(item.timestamp).toLocaleString()}
          >
            {relTime}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
          {item.description}
        </p>

        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant={variant} className="gap-1 h-4 text-[10px] px-1.5">
            {statusIcon}
            {label}
          </Badge>
          <span className="text-[11px] text-muted-foreground/70">
            by {item.actor}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface RecentActivityProps {
  items: ActivityItem[];
  loading?: boolean;
}

export function RecentActivity({ items, loading = false }: RecentActivityProps) {
  if (loading) return <ActivitySkeleton />;
  if (items.length === 0) return <ActivityEmpty />;

  return (
    <CustomCard>
      <CustomCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CustomCardTitle>Recent Activity</CustomCardTitle>
          <button
            className={cn(
              "text-xs text-brand-500 hover:text-brand-600 transition-colors",
              "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            )}
          >
            View all
          </button>
        </div>
      </CustomCardHeader>
      <CustomCardContent className="pt-0">
        <div role="list" aria-label="Recent activity">
          {items.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </div>
      </CustomCardContent>
    </CustomCard>
  );
}
