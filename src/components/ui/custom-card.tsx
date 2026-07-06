import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Custom Card Component System
// Extends shadcn/ui card with glass, gradient, and interactive variants
// ─────────────────────────────────────────────────────────────────────────────

const customCardVariants = cva(
  // Base styles shared by all variants
  "relative rounded-xl border transition-all duration-200",
  {
    variants: {
      variant: {
        /**
         * Default — standard elevated card with subtle background
         */
        default: [
          "bg-card text-card-foreground border-border/60",
          "shadow-sm",
        ].join(" "),

        /**
         * Glass — frosted glassmorphism card
         */
        glass: [
          "bg-white/5 dark:bg-white/4 text-foreground",
          "border-white/10 dark:border-white/8",
          "backdrop-blur-xl",
          "shadow-xl shadow-black/10",
        ].join(" "),

        /**
         * Gradient — card with glowing gradient border via pseudo-element
         */
        gradient: [
          "bg-card text-card-foreground",
          "border-transparent",
          // Gradient border trick using box-shadow
          "shadow-[0_0_0_1px_oklch(0.62_0.24_265/25%),0_4px_16px_oklch(0.62_0.24_265/8%)]",
          "dark:shadow-[0_0_0_1px_oklch(0.62_0.24_265/30%),0_4px_20px_oklch(0.62_0.24_265/10%)]",
        ].join(" "),

        /**
         * Interactive — hover lift + glow effect, ideal for clickable cards
         */
        interactive: [
          "bg-card text-card-foreground border-border/60",
          "shadow-sm cursor-pointer",
          "hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-500/10",
          "hover:border-brand-500/30 hover:bg-card",
          "active:translate-y-0 active:shadow-sm",
        ].join(" "),

        /**
         * Muted — very subtle card for secondary content areas
         */
        muted: "bg-muted/50 text-foreground border-border/40 shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// ─── Component Props ───────────────────────────────────────────────────────────

export interface CustomCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof customCardVariants> {}

// ─── Card Root ────────────────────────────────────────────────────────────────

function CustomCard({ className, variant, ...props }: CustomCardProps) {
  return (
    <div
      data-slot="card"
      className={cn(customCardVariants({ variant }), className)}
      {...props}
    />
  );
}

// ─── Card Header ──────────────────────────────────────────────────────────────

function CustomCardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-6", className)}
      {...props}
    />
  );
}

// ─── Card Title ───────────────────────────────────────────────────────────────

function CustomCardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "text-base font-semibold leading-tight tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
}

// ─── Card Description ─────────────────────────────────────────────────────────

function CustomCardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  );
}

// ─── Card Content ─────────────────────────────────────────────────────────────

function CustomCardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 pb-6", className)}
      {...props}
    />
  );
}

// ─── Card Footer ──────────────────────────────────────────────────────────────

function CustomCardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-6 pb-6 pt-0 gap-3",
        className
      )}
      {...props}
    />
  );
}

export {
  CustomCard,
  CustomCardHeader,
  CustomCardTitle,
  CustomCardDescription,
  CustomCardContent,
  CustomCardFooter,
  customCardVariants,
};
