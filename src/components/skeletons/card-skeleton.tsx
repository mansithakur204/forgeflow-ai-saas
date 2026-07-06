import { cn } from "@/lib/utils";

interface CardSkeletonProps {
  className?: string;
  /** Number of skeleton cards to render */
  count?: number;
}

/**
 * Animated shimmer card skeleton placeholder.
 * Use while card content is loading.
 */
export function CardSkeleton({ className, count = 1 }: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl border border-border/60 bg-card p-6",
            "flex flex-col gap-4",
            className
          )}
          aria-hidden="true"
          aria-label="Loading..."
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            {/* Icon placeholder */}
            <div className="skeleton-shimmer w-10 h-10 rounded-lg shrink-0" />
            {/* Badge placeholder */}
            <div className="skeleton-shimmer w-16 h-5 rounded-full" />
          </div>

          {/* Title */}
          <div className="skeleton-shimmer w-3/4 h-5 rounded-lg" />

          {/* Description lines */}
          <div className="flex flex-col gap-2">
            <div className="skeleton-shimmer w-full h-3.5 rounded-md" />
            <div className="skeleton-shimmer w-5/6 h-3.5 rounded-md" />
            <div className="skeleton-shimmer w-2/3 h-3.5 rounded-md" />
          </div>

          {/* Footer row */}
          <div className="flex items-center gap-3 pt-2 border-t border-border/40">
            <div className="skeleton-shimmer w-20 h-7 rounded-lg" />
            <div className="skeleton-shimmer w-16 h-7 rounded-lg" />
          </div>
        </div>
      ))}
    </>
  );
}
