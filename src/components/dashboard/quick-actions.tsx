import React from "react";
import { GitBranch, Bot, Network, Upload, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomCard, CustomCardHeader, CustomCardTitle, CustomCardContent } from "@/components/ui/custom-card";
import { Skeleton } from "@/components/ui/skeleton";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Quick Actions Section
// 2×2 grid of prominent CTA cards for the most common tasks.
// ─────────────────────────────────────────────────────────────────────────────

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  /** Tailwind classes for the icon wrapper */
  iconBg: string;
  /** Tailwind classes for the icon color */
  iconColor: string;
  /** Tailwind glow on hover */
  hoverGlow: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "new-workflow",
    icon: <GitBranch className="w-5 h-5" aria-hidden="true" />,
    title: "New Workflow",
    description: "Build a visual AI pipeline from scratch or use a template.",
    href: "/workflows/new",
    iconBg: "bg-brand-500/10",
    iconColor: "text-brand-500",
    hoverGlow: "hover:shadow-brand-500/10",
  },
  {
    id: "new-agent",
    icon: <Bot className="w-5 h-5" aria-hidden="true" />,
    title: "New Agent",
    description: "Configure and deploy an AI agent to automate complex tasks.",
    href: "/agents/new",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    hoverGlow: "hover:shadow-violet-500/10",
  },
  {
    id: "create-pipeline",
    icon: <Network className="w-5 h-5" aria-hidden="true" />,
    title: "Create Pipeline",
    description: "Connect data sources, transformers, and destinations.",
    href: "/pipelines/new",
    iconBg: "bg-chart-3/10",
    iconColor: "text-chart-3",
    hoverGlow: "hover:shadow-chart-3/10",
  },
  {
    id: "import-project",
    icon: <Upload className="w-5 h-5" aria-hidden="true" />,
    title: "Import Project",
    description: "Import an existing project from GitHub or a ZIP archive.",
    href: "/projects/import",
    iconBg: "bg-chart-4/10",
    iconColor: "text-chart-4",
    hoverGlow: "hover:shadow-chart-4/10",
  },
];

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

export function QuickActionsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-28" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card p-5 flex flex-col gap-3"
            aria-hidden="true"
          >
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="h-4 w-28" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Action Card ───────────────────────────────────────────────────────────────

function ActionCard({ action }: { action: QuickAction }) {
  return (
    <a
      href={action.href}
      className={cn(
        "group block rounded-xl border border-border/60 bg-card p-5",
        "shadow-sm hover:shadow-lg transition-all duration-200",
        "hover:-translate-y-1 hover:border-border",
        action.hoverGlow,
        "cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      aria-label={action.title}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center mb-4",
          action.iconBg,
          action.iconColor,
          "transition-transform duration-200 group-hover:scale-110"
        )}
      >
        {action.icon}
      </div>

      {/* Text */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground group-hover:text-brand-500 transition-colors">
            {action.title}
          </h3>
          <ArrowRight
            className={cn(
              "w-4 h-4 text-muted-foreground shrink-0",
              "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
              "transition-all duration-200"
            )}
            aria-hidden="true"
          />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {action.description}
        </p>
      </div>
    </a>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface QuickActionsProps {
  loading?: boolean;
}

export function QuickActions({ loading = false }: QuickActionsProps) {
  if (loading) return <QuickActionsSkeleton />;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {QUICK_ACTIONS.map((action) => (
          <ActionCard key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}
