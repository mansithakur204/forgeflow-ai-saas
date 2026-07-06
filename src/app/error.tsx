"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary.
 * Catches unhandled runtime errors in the page tree.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("[ForgeFlow AI Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-6 text-center max-w-md w-full"
      >
        {/* Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          {/* Glow */}
          <div className="absolute inset-0 rounded-2xl bg-destructive/20 blur-xl -z-10" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            An unexpected error occurred. Our team has been notified. You can
            try again or return to the home page.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-muted-foreground/60 bg-muted rounded-lg px-3 py-1.5 mt-3">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="glow"
            size="lg"
            onClick={reset}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => (window.location.href = "/")}
          >
            Return home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
