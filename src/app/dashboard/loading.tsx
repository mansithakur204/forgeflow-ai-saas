import { RootLayoutShell } from "@/components/layout/root-layout";
import { MetricCardsSkeleton } from "@/components/dashboard/metric-cards";
import { Skeleton } from "@/components/ui/skeleton";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Dashboard Loading
//
// Next.js route-level Suspense fallback. Automatically displayed while the
// dashboard server component is fetching user data and rendering.
// Mirrors the exact layout of the dashboard page.
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardLoading() {
  return (
    <RootLayoutShell>
      <div className="flex flex-col gap-8 p-4 md:p-6 max-w-screen-xl mx-auto">
        {/* Page Header skeleton */}
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between pb-6 border-b border-border/50">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Metric Cards skeleton */}
        <MetricCardsSkeleton />

        {/* Two-column section skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Activity skeleton */}
          <div className="lg:col-span-3 rounded-xl border border-border/60 bg-card p-6 space-y-4">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 py-2 border-b border-border/50 last:border-0">
                <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between gap-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-10 shrink-0" />
                  </div>
                  <Skeleton className="h-3 w-56 max-w-full" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions skeleton */}
          <div className="lg:col-span-2 space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/60 bg-card p-5 space-y-3"
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
        </div>

        {/* Projects Table skeleton */}
        <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
          <div className="space-y-0">
            <div className="flex gap-4 pb-2.5 border-b border-border/50">
              {[120, 80, 90, 100].map((w, i) => (
                <Skeleton key={i} className={`h-3 w-${w} rounded`} style={{ width: w }} />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16 rounded-full shrink-0" />
                <Skeleton className="h-3 w-20 shrink-0 hidden sm:block" />
                <Skeleton className="h-3 w-24 shrink-0 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </RootLayoutShell>
  );
}
