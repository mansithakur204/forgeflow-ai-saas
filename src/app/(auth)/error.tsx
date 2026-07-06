"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/logo";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Auth Error Boundary
// Shown when a runtime error occurs in the (auth) route group.
// ─────────────────────────────────────────────────────────────────────────────

interface AuthErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthError({ error, reset }: AuthErrorProps) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error("[AuthError]", error);
  }, [error]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-background px-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="mb-8">
        <Logo />
      </div>

      <div className="w-full max-w-sm rounded-xl border border-destructive/20 bg-card p-6 text-center shadow-lg">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle
            className="h-6 w-6 text-destructive"
            aria-hidden="true"
          />
        </div>

        <h1 className="text-lg font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>

        {error.digest && (
          <p className="mt-2 font-mono text-xs text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            id="auth-error-retry"
            onClick={reset}
            variant="default"
            size="sm"
            className="gap-2"
          >
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </Button>
          <Button
            id="auth-error-go-home"
            onClick={() => (window.location.href = "/")}
            variant="ghost"
            size="sm"
          >
            Go to home
          </Button>
        </div>
      </div>
    </div>
  );
}
