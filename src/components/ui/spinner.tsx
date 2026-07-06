import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Spinner Component
// Accessible loading indicator • 5 sizes • 4 color variants
// ─────────────────────────────────────────────────────────────────────────────

const spinnerVariants = cva(
  "animate-spin rounded-full border-2 border-current border-t-transparent shrink-0",
  {
    variants: {
      size: {
        xs: "w-3 h-3 border-[1.5px]",
        sm: "w-4 h-4",
        md: "w-5 h-5",
        lg: "w-6 h-6 border-[2.5px]",
        xl: "w-8 h-8 border-[3px]",
      },
      variant: {
        default: "text-foreground/40",
        brand: "text-brand-500",
        muted: "text-muted-foreground/50",
        white: "text-white/80",
        success: "text-success",
        destructive: "text-destructive",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "brand",
    },
  }
);

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

function Spinner({
  className,
  size,
  variant,
  label = "Loading…",
  ...props
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      data-slot="spinner"
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    >
      <span
        className={cn(spinnerVariants({ size, variant }))}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Full-page centered loading overlay */
function SpinnerOverlay({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-40 flex items-center justify-center",
        "bg-background/70 backdrop-blur-sm",
        className
      )}
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="xl" variant="brand" label={label} />
        <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
      </div>
    </div>
  );
}

/** Inline spinner with a trailing label */
function SpinnerWithLabel({
  label = "Loading…",
  size = "sm",
  className,
}: SpinnerProps) {
  return (
    <span
      role="status"
      className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}
    >
      <Spinner size={size} label="" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export { Spinner, SpinnerOverlay, SpinnerWithLabel, spinnerVariants };
