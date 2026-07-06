import React from "react";
import {
  Workflow,
  Bot,
  Play,
  BarChart3,
  CheckCircle,
  Zap,
} from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { type DashboardMetric } from "@/lib/dashboard-data";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Dashboard Metric Cards
// 6-column responsive KPI grid.
// Each card uses the existing StatCard component with icon + delta + trend.
// Supports a loading skeleton and an empty state.
// ─────────────────────────────────────────────────────────────────────────────

/** Map metric ID → Lucide icon */
const METRIC_ICONS: Record<string, React.ReactNode> = {
  total_workflows: <Workflow aria-hidden="true" />,
  active_agents: <Bot aria-hidden="true" />,
  running_pipelines: <Play aria-hidden="true" />,
  api_requests: <BarChart3 aria-hidden="true" />,
  success_rate: <CheckCircle aria-hidden="true" />,
  total_executions: <Zap aria-hidden="true" />,
};

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

export function MetricCardsSkeleton() {
  return (
    <StatCardGrid columns={3} className="lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <StatCard
          key={i}
          label=""
          value=""
          loading={true}
          aria-label="Loading metric"
        />
      ))}
    </StatCardGrid>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

export function MetricCardsEmpty() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-8">
      <EmptyState
        size="sm"
        icon={<BarChart3 />}
        iconVariant="brand"
        title="No metrics available"
        description="Metrics will appear here once your first workflow runs."
      />
    </div>
  );
}

// ─── Metric Cards ─────────────────────────────────────────────────────────────

interface MetricCardsProps {
  metrics: DashboardMetric[];
  loading?: boolean;
}

export function MetricCards({ metrics, loading = false }: MetricCardsProps) {
  if (loading) return <MetricCardsSkeleton />;
  if (metrics.length === 0) return <MetricCardsEmpty />;

  return (
    <StatCardGrid columns={3} className="lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((m) => (
        <StatCard
          key={m.id}
          label={m.label}
          value={m.value}
          delta={m.delta}
          trend={m.trend}
          deltaLabel={m.deltaLabel}
          icon={METRIC_ICONS[m.id]}
          iconVariant={m.iconVariant}
          variant="default"
          className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        />
      ))}
    </StatCardGrid>
  );
}
