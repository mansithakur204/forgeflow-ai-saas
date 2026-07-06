import { cn } from "@/lib/utils";
import { CardSkeleton } from "./card-skeleton";
import { TableSkeleton } from "./table-skeleton";

interface PageSkeletonProps {
  className?: string;
}

/**
 * Full-page loading skeleton.
 * Use as the global Suspense fallback (app/loading.tsx).
 */
export function PageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div
      className={cn("flex flex-col gap-6 p-6", className)}
      aria-hidden="true"
      aria-label="Loading page..."
    >
      {/* Page header skeleton */}
      <div className="flex items-center justify-between pb-6 border-b border-border/50">
        <div className="flex flex-col gap-2">
          <div className="skeleton-shimmer w-48 h-7 rounded-lg" />
          <div className="skeleton-shimmer w-72 h-4 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="skeleton-shimmer w-24 h-8 rounded-lg" />
          <div className="skeleton-shimmer w-32 h-8 rounded-lg" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="skeleton-shimmer w-24 h-3.5 rounded-md" />
              <div className="skeleton-shimmer w-8 h-8 rounded-lg" />
            </div>
            <div className="skeleton-shimmer w-20 h-7 rounded-lg" />
            <div className="skeleton-shimmer w-32 h-3 rounded-md" />
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CardSkeleton count={3} />
      </div>

      {/* Table */}
      <TableSkeleton rows={4} cols={5} />
    </div>
  );
}
