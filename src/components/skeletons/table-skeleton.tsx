import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  className?: string;
  rows?: number;
  cols?: number;
}

/**
 * Animated shimmer table skeleton.
 * Use while tabular data is loading.
 */
export function TableSkeleton({
  className,
  rows = 5,
  cols = 5,
}: TableSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 overflow-hidden bg-card",
        className
      )}
      aria-hidden="true"
      aria-label="Loading table..."
    >
      {/* Table header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border/60 bg-muted/30">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "skeleton-shimmer h-3.5 rounded-md",
              i === 0 ? "w-1/4" : "flex-1"
            )}
          />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className={cn(
            "flex items-center gap-4 px-4 py-3",
            rowIdx !== rows - 1 && "border-b border-border/40"
          )}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={cn(
                "skeleton-shimmer h-4 rounded-md",
                colIdx === 0 ? "w-1/4" : "flex-1",
                // Vary widths for visual realism
                colIdx === cols - 1 && "w-16 flex-none"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
