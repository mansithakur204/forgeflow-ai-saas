import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Empty State Component
// Illustrated zero-data states with action slots
// ─────────────────────────────────────────────────────────────────────────────

const emptyStateVariants = cva(
  "flex flex-col items-center justify-center text-center gap-3 px-6",
  {
    variants: {
      size: {
        sm: "py-8 max-w-xs",
        md: "py-12 max-w-sm",
        lg: "py-16 max-w-md",
        full: "py-24 max-w-lg",
      },
    },
    defaultVariants: { size: "md" },
  }
);

const iconWrapperVariants = cva(
  "flex items-center justify-center rounded-2xl",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        brand: "bg-brand-500/10 text-brand-500",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        destructive: "bg-destructive/10 text-destructive",
        info: "bg-info/10 text-info",
      },
      size: {
        sm: "w-10 h-10 [&>svg]:w-5 [&>svg]:h-5",
        md: "w-12 h-12 [&>svg]:w-6 [&>svg]:h-6",
        lg: "w-14 h-14 [&>svg]:w-7 [&>svg]:h-7",
        full: "w-16 h-16 [&>svg]:w-8 [&>svg]:h-8",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  /** Icon element (from lucide-react or custom) */
  icon?: React.ReactNode;
  /** Color variant for the icon container */
  iconVariant?: VariantProps<typeof iconWrapperVariants>["variant"];
  title: string;
  description?: string;
  /** Primary action (usually a Button) */
  action?: React.ReactNode;
  /** Secondary action (link, ghost button) */
  secondaryAction?: React.ReactNode;
}

function EmptyState({
  className,
  size = "md",
  icon,
  iconVariant = "default",
  title,
  description,
  action,
  secondaryAction,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(emptyStateVariants({ size }), "mx-auto", className)}
      {...props}
    >
      {/* Icon */}
      {icon && (
        <div
          className={cn(iconWrapperVariants({ variant: iconVariant, size }))}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      {/* Text content */}
      <div className="flex flex-col items-center gap-1.5">
        <h3 className="font-heading font-semibold text-base text-foreground tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
            {description}
          </p>
        )}
      </div>

      {/* Custom slot for extra content */}
      {children && <div className="w-full">{children}</div>}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

/**
 * Preset: Search returned no results
 */
function EmptySearch({
  query,
  onClear,
  ...props
}: Omit<EmptyStateProps, "title" | "icon"> & {
  query?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      title={query ? `No results for "${query}"` : "No results found"}
      description="Try adjusting your search terms or filters to find what you're looking for."
      iconVariant="default"
      {...props}
    />
  );
}

/**
 * Preset: Table / list is empty
 */
function EmptyList({
  entityName = "items",
  ...props
}: Omit<EmptyStateProps, "title"> & { entityName?: string }) {
  return (
    <EmptyState
      title={`No ${entityName} yet`}
      description={`Get started by creating your first ${entityName.replace(/s$/, "")}.`}
      {...props}
    />
  );
}

export { EmptyState, EmptySearch, EmptyList, emptyStateVariants };
