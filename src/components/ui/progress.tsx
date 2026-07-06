import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Progress Component
// Animated progress bar • 5 color variants • indeterminate mode
// WCAG: role=progressbar + aria-valuenow/min/max
// ─────────────────────────────────────────────────────────────────────────────

const progressTrackVariants = cva(
  "relative w-full overflow-hidden rounded-full bg-muted",
  {
    variants: {
      size: {
        xs: "h-1",
        sm: "h-1.5",
        md: "h-2",
        lg: "h-3",
        xl: "h-4",
      },
    },
    defaultVariants: { size: "md" },
  }
);

const progressFillVariants = cva(
  "h-full rounded-full transition-all duration-500 ease-out",
  {
    variants: {
      variant: {
        default: "bg-primary",
        brand: "bg-gradient-to-r from-brand-500 to-brand-400",
        success: "bg-success",
        warning: "bg-warning",
        destructive: "bg-destructive",
        info: "bg-info",
      },
    },
    defaultVariants: { variant: "brand" },
  }
);

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressTrackVariants>,
    VariantProps<typeof progressFillVariants> {
  /** 0–100 */
  value?: number;
  /** When true, shows a looping animation — do not combine with value */
  indeterminate?: boolean;
  /** Visible label above the bar */
  label?: string;
  /** Show percentage text on the right */
  showValue?: boolean;
  /** Custom formatted value text */
  valueText?: string;
}

function Progress({
  className,
  size,
  variant,
  value = 0,
  indeterminate = false,
  label,
  showValue = false,
  valueText,
  ...props
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div data-slot="progress-root" className={cn("w-full", className)} {...props}>
      {/* Header row */}
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs font-medium text-foreground/80">{label}</span>
          )}
          {showValue && !indeterminate && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {valueText ?? `${clampedValue}%`}
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-label={label ?? "Progress"}
        data-slot="progress-track"
        className={cn(progressTrackVariants({ size }))}
      >
        {indeterminate ? (
          /* Indeterminate shimmer bar */
          <div
            data-slot="progress-indeterminate"
            className={cn(
              progressFillVariants({ variant }),
              "absolute inset-y-0 left-0 w-1/3",
              "animate-[progress-indeterminate_1.5s_ease-in-out_infinite]"
            )}
          />
        ) : (
          <div
            data-slot="progress-fill"
            className={cn(progressFillVariants({ variant }), "will-change-[width]")}
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>
    </div>
  );
}

export { Progress, progressTrackVariants, progressFillVariants };
