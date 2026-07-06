import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/**
 * Branded 404 Not Found page.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background overflow-hidden">
      {/* Ambient background glows */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 dark:opacity-[0.06] blur-[120px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.62 0.24 265) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-8 dark:opacity-[0.04] blur-[100px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.64 0.26 290) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="flex flex-col items-center gap-8 text-center max-w-lg w-full relative">
        {/* 404 display */}
        <div className="relative select-none">
          <span
            className="text-[160px] md:text-[200px] font-black leading-none tracking-tighter text-gradient"
            aria-hidden="true"
          >
            404
          </span>
          {/* Brand icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-brand-gradient shadow-2xl shadow-brand-500/40 flex items-center justify-center">
              <Zap className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Page not found
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-sm mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Let&apos;s get you back on track.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href="/"
            className={buttonVariants({ variant: "glow", size: "lg" }) + " gap-2"}
          >
            <ArrowLeft className="w-4 h-4" />
            Return home
          </Link>
          <Link
            href="/docs"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            View docs
          </Link>
        </div>

        {/* Subtle branding */}
        <p className="text-xs text-muted-foreground/50">
          ForgeFlow AI — Orchestrate Intelligence. Automate Everything.
        </p>
      </div>
    </div>
  );
}
