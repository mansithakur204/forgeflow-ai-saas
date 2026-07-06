import { Spinner } from "@/components/ui/spinner";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Auth Loading State
// Shown while (auth) route segments are loading.
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      aria-busy="true"
      aria-label="Loading authentication"
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" variant="brand" label="Loading…" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading…
        </p>
      </div>
    </div>
  );
}
