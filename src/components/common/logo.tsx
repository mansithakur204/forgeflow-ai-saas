import React from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 select-none group shrink-0",
        className
      )}
      aria-label="ForgeFlow AI home"
    >
      {/* Icon mark */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-lg shrink-0",
          "bg-brand-gradient shadow-lg shadow-brand-500/25",
          "group-hover:shadow-brand-500/40 transition-shadow duration-300",
          iconOnly ? "w-8 h-8" : "w-8 h-8"
        )}
      >
        <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        {/* Glow overlay */}
        <div className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Wordmark */}
      {!iconOnly && (
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-tight text-foreground">
            ForgeFlow
          </span>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-brand-500">
            AI
          </span>
        </div>
      )}
    </Link>
  );
}
