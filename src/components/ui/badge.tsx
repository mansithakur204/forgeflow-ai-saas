import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Extended Badge Component
// Extends the original with semantic variants + dot variant
// ─────────────────────────────────────────────────────────────────────────────

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // ── Base shadcn variants (preserved) ──────────────
        default:
          "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",

        // ── Extended semantic variants ────────────────────
        success:
          "bg-success/12 text-success border-success/20 dark:bg-success/15",
        warning:
          "bg-warning/12 text-warning-foreground border-warning/20 dark:bg-warning/15",
        info:
          "bg-info/12 text-info border-info/20 dark:bg-info/15",
        brand:
          "bg-gradient-to-r from-brand-500 to-brand-400 text-white border-transparent shadow-brand-sm",

        // ── Dot / status variant ──────────────────────────
        "dot-success": [
          "bg-transparent border-0 text-success font-medium gap-1.5 px-0",
          "before:inline-block before:w-1.5 before:h-1.5 before:rounded-full before:bg-success before:animate-pulse",
        ].join(" "),
        "dot-warning": [
          "bg-transparent border-0 text-warning-foreground font-medium gap-1.5 px-0",
          "before:inline-block before:w-1.5 before:h-1.5 before:rounded-full before:bg-warning before:animate-pulse",
        ].join(" "),
        "dot-destructive": [
          "bg-transparent border-0 text-destructive font-medium gap-1.5 px-0",
          "before:inline-block before:w-1.5 before:h-1.5 before:rounded-full before:bg-destructive before:animate-pulse",
        ].join(" "),
        "dot-muted": [
          "bg-transparent border-0 text-muted-foreground font-medium gap-1.5 px-0",
          "before:inline-block before:w-1.5 before:h-1.5 before:rounded-full before:bg-muted-foreground",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
