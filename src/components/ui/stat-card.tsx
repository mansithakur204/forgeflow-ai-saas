import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Stat Card Component
// KPI / metric display with delta indicators
// ─────────────────────────────────────────────────────────────────────────────

const statCardVariants = cva(
  "relative flex flex-col gap-3 rounded-xl border p-4 overflow-hidden transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card border-border/60 hover:border-border",
        glass: [
          "border-border/40 hover:border-border/60",
          "bg-white/4 dark:bg-white/3 backdrop-blur-sm",
        ].join(" "),
        gradient: [
          "border-brand-500/20 hover:border-brand-500/40",
          "bg-gradient-to-br from-brand-500/8 to-brand-400/4 dark:from-brand-500/10 dark:to-brand-400/5",
        ].join(" "),
        outline: "bg-transparent border-border hover:bg-muted/20",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

type DeltaTrend = "up" | "down" | "neutral";

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  label: string;
  value: string | number;
  /** e.g. "+12.5%" or "↑ 340" */
  delta?: string;
  /** Controls color: up=green, down=red, neutral=muted */
  trend?: DeltaTrend;
  /** Text label for the delta (e.g. "vs last month") */
  deltaLabel?: string;
  /** Icon rendered in the top-right corner */
  icon?: React.ReactNode;
  /** If true, icon gets brand-colored background */
  iconVariant?: "default" | "brand" | "success" | "warning" | "destructive";
  /** Optional sparkline / mini-chart slot */
  chart?: React.ReactNode;
  /** Show a subtle loading shimmer */
  loading?: boolean;
}

const iconVariantMap = {
  default: "bg-muted text-muted-foreground",
  brand: "bg-brand-500/10 text-brand-500",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

const trendConfig: Record<DeltaTrend, {
  color: string;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
}> = {
  up: { color: "text-success", Icon: TrendingUp },
  down: { color: "text-destructive", Icon: TrendingDown },
  neutral: { color: "text-muted-foreground", Icon: Minus },
};

function StatCard({
  label,
  value,
  delta,
  trend = "neutral",
  deltaLabel,
  icon,
  iconVariant = "default",
  chart,
  loading = false,
  variant,
  className,
  ...props
}: StatCardProps) {
  const { color: trendColor, Icon: TrendIcon } = trendConfig[trend];

  if (loading) {
    return (
      <div className={cn(statCardVariants({ variant }), className)} {...props}>
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="h-7 w-20 rounded-md bg-muted animate-pulse" />
        <div className="h-3 w-16 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div
      data-slot="stat-card"
      className={cn(statCardVariants({ variant }), className)}
      {...props}
    >
      {/* Header row: label + icon */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground leading-tight line-clamp-1">
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
              "[&>svg]:w-4 [&>svg]:h-4",
              iconVariantMap[iconVariant]
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <p className="text-2xl font-bold font-heading text-foreground tabular-nums tracking-tight leading-none">
        {value}
      </p>

      {/* Delta row */}
      {(delta || deltaLabel) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {delta && (
            <span className={cn("flex items-center gap-1 text-xs font-semibold", trendColor)}>
              <TrendIcon className="w-3 h-3" aria-hidden="true" />
              {delta}
            </span>
          )}
          {deltaLabel && (
            <span className="text-xs text-muted-foreground">{deltaLabel}</span>
          )}
        </div>
      )}

      {/* Chart slot */}
      {chart && (
        <div className="mt-auto -mx-4 -mb-4 pt-1" aria-hidden="true">
          {chart}
        </div>
      )}
    </div>
  );
}

/**
 * Responsive grid of stat cards
 */
function StatCardGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const colClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  }[columns];

  return (
    <div className={cn("grid grid-cols-1 gap-4", colClass, className)}>
      {children}
    </div>
  );
}

export { StatCard, StatCardGrid, statCardVariants };
