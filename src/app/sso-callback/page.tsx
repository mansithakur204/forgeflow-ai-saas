"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — SSO Callback Handler
//
// Clerk redirects back to this URL after OAuth (Google / GitHub) completes.
// AuthenticateWithRedirectCallback handles the token exchange and session
// creation, then redirects to the configured redirectUrlComplete (/dashboard).
// ─────────────────────────────────────────────────────────────────────────────

export default function SSOCallbackPage() {
  const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";
  const router = useRouter();

  useEffect(() => {
    if (isMock) {
      document.cookie = "mock_session=active; path=/; max-age=86400";
      router.push("/dashboard");
    }
  }, [isMock, router]);

  if (isMock) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Authenticating...</p>
      </div>
    );
  }

  return (
    <AuthenticateWithRedirectCallback
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    />
  );
}
