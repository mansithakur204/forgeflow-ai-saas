import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Alert Component
// WCAG AA compliant • 4 semantic variants • dismissible
// ─────────────────────────────────────────────────────────────────────────────

const alertVariants = cva(
  [
    "relative flex gap-3 rounded-xl border p-4 text-sm",
    "transition-all duration-150",
    "[&>svg]:shrink-0 [&>svg]:mt-0.5",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-muted/40 border-border/60 text-foreground",
          "[&>svg]:text-muted-foreground",
        ].join(" "),
        info: [
          "bg-info/8 border-info/20 text-foreground dark:bg-info/10",
          "[&>svg]:text-info",
        ].join(" "),
        success: [
          "bg-success/8 border-success/20 text-foreground dark:bg-success/10",
          "[&>svg]:text-success",
        ].join(" "),
        warning: [
          "bg-warning/8 border-warning/20 text-foreground dark:bg-warning/10",
          "[&>svg]:text-warning",
        ].join(" "),
        destructive: [
          "bg-destructive/8 border-destructive/20 text-foreground dark:bg-destructive/10",
          "[&>svg]:text-destructive",
        ].join(" "),
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const alertIconMap = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: AlertCircle,
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  /** Controlled: show dismiss button */
  dismissible?: boolean;
  onDismiss?: () => void;
  /** Override the default icon */
  icon?: React.ReactNode;
  /** Hide the default icon */
  hideIcon?: boolean;
}

function Alert({
  className,
  variant = "default",
  title,
  children,
  dismissible = false,
  onDismiss,
  icon,
  hideIcon = false,
  ...props
}: AlertProps) {
  const DefaultIcon = alertIconMap[variant ?? "default"];

  return (
    <div
      role="alert"
      aria-live="polite"
      data-slot="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {/* Icon */}
      {!hideIcon && (
        <span aria-hidden="true">
          {icon ?? <DefaultIcon className="w-4 h-4" />}
        </span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <AlertTitle>{title}</AlertTitle>
        )}
        {children && (
          <AlertDescription hasTitle={!!title}>{children}</AlertDescription>
        )}
      </div>

      {/* Dismiss */}
      {dismissible && (
        <button
          onClick={onDismiss}
          className={cn(
            "shrink-0 rounded-md p-1 opacity-60 hover:opacity-100",
            "transition-opacity duration-150",
            "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1",
            "-mt-0.5 -mr-1"
          )}
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <p
      data-slot="alert-title"
      className={cn("font-semibold leading-snug tracking-tight mb-1", className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  hasTitle,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { hasTitle?: boolean }) {
  return (
    <p
      data-slot="alert-description"
      className={cn(
        "text-sm leading-relaxed text-foreground/80",
        hasTitle && "text-xs",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
