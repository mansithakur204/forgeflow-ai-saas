import * as React from "react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Kbd Component
// Keyboard shortcut display • matches OS style
// ─────────────────────────────────────────────────────────────────────────────

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** Renders as a group of keys separated by "+" */
  keys?: string[];
}

function Kbd({ className, children, keys, ...props }: KbdProps) {
  if (keys && keys.length > 0) {
    return (
      <span className="inline-flex items-center gap-0.5">
        {keys.map((key, i) => (
          <React.Fragment key={i}>
            <KbdSingle className={className}>{key}</KbdSingle>
            {i < keys.length - 1 && (
              <span className="text-muted-foreground/50 text-[10px] px-0.5">+</span>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  }

  return <KbdSingle className={className} {...props}>{children}</KbdSingle>;
}

function KbdSingle({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center",
        "rounded-md border border-border/70 bg-muted/80",
        "px-1.5 text-[10px] font-semibold font-mono text-muted-foreground",
        "shadow-[0_1px_0_0_var(--border)] dark:shadow-none",
        "select-none",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

export { Kbd };

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Section Header Component
// Page/section titles with description + optional action slot
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Visual separator below the header */
  withBorder?: boolean;
  /** Text alignment */
  align?: "left" | "center";
  /** Compact vertical spacing */
  compact?: boolean;
}

function SectionHeader({
  title,
  description,
  action,
  withBorder = false,
  align = "left",
  compact = false,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        "flex flex-col gap-1",
        align === "center" && "items-center text-center",
        compact ? "mb-3" : "mb-6",
        withBorder && "pb-4 border-b border-border/60",
        className
      )}
      {...props}
    >
      <div className={cn(
        "flex items-start gap-4",
        align === "center" ? "flex-col items-center" : "flex-row items-center justify-between"
      )}>
        <div className={cn("flex flex-col gap-1", align === "center" && "items-center")}>
          <h2 className={cn(
            "font-heading font-semibold text-foreground tracking-tight",
            compact ? "text-base" : "text-xl md:text-2xl"
          )}>
            {title}
          </h2>
          {description && (
            <p className={cn(
              "text-muted-foreground",
              compact ? "text-xs" : "text-sm"
            )}>
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="shrink-0 flex items-center gap-2">{action}</div>
        )}
      </div>
    </div>
  );
}

export { SectionHeader };
