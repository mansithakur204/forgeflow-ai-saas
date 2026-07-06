import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Avatar Group Component
// Stacked overlapping avatars with overflow counter
// ─────────────────────────────────────────────────────────────────────────────

export interface AvatarGroupItem {
  name: string;
  src?: string;
  alt?: string;
}

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  items: AvatarGroupItem[];
  /** Maximum avatars to display before showing "+N" */
  max?: number;
  /** Avatar size in Tailwind scale */
  size?: "xs" | "sm" | "md" | "lg";
}

const sizeClasses = {
  xs: "w-6 h-6 text-[9px] border",
  sm: "w-7 h-7 text-[10px] border",
  md: "w-8 h-8 text-xs border-[1.5px]",
  lg: "w-10 h-10 text-sm border-2",
};

const overlapClasses = {
  xs: "-ml-2",
  sm: "-ml-2",
  md: "-ml-2.5",
  lg: "-ml-3",
};

function AvatarGroup({
  items,
  max = 4,
  size = "md",
  className,
  ...props
}: AvatarGroupProps) {
  const visible = items.slice(0, max);
  const overflowCount = items.length - max;

  return (
    <div
      data-slot="avatar-group"
      className={cn("flex items-center", className)}
      role="group"
      aria-label={`${items.length} members`}
      {...props}
    >
      {visible.map((item, i) => (
        <Avatar
          key={i}
          className={cn(
            sizeClasses[size],
            "border-background ring-background",
            i > 0 && overlapClasses[size],
            "relative hover:z-10 transition-transform duration-150 hover:-translate-y-0.5"
          )}
          title={item.name}
        >
          <AvatarImage src={item.src ?? ""} alt={item.alt ?? item.name} />
          <AvatarFallback className="bg-brand-500/15 text-brand-500 font-semibold">
            {getInitials(item.name)}
          </AvatarFallback>
        </Avatar>
      ))}

      {overflowCount > 0 && (
        <span
          className={cn(
            sizeClasses[size],
            overlapClasses[size],
            "relative inline-flex items-center justify-center",
            "rounded-full border border-background bg-muted",
            "font-medium text-muted-foreground tabular-nums",
            "ring-1 ring-border/50"
          )}
          aria-label={`${overflowCount} more`}
        >
          +{overflowCount}
        </span>
      )}
    </div>
  );
}

export { AvatarGroup };
