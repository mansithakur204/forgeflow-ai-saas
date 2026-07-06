import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — SSO Callback Handler
//
// Clerk redirects back to this URL after OAuth (Google / GitHub) completes.
// AuthenticateWithRedirectCallback handles the token exchange and session
// creation, then redirects to the configured redirectUrlComplete (/dashboard).
// ─────────────────────────────────────────────────────────────────────────────

export default function SSOCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    />
  );
}
