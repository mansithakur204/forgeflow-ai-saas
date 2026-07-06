"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — useAuth hook
//
// A thin wrapper around Clerk's useUser + useClerk hooks that provides a
// consistent, typed interface for accessing auth state throughout the app.
// Only usable in Client Components.
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthState {
  /** True when Clerk has finished loading the session. */
  isLoaded: boolean;
  /** True when a valid session exists. */
  isSignedIn: boolean;
  /** The authenticated Clerk user object, or null if not signed in. */
  user: ReturnType<typeof useUser>["user"];
  /** Convenience: display name (first name or email username). */
  displayName: string;
  /** Convenience: primary email address string. */
  email: string | null;
  /** Convenience: profile image URL. */
  imageUrl: string | null;
  /** Sign out and redirect to /login. */
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const router = useRouter();

  const displayName =
    user?.firstName ??
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ??
    "User";

  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  const imageUrl = user?.imageUrl ?? null;

  async function signOut() {
    await clerkSignOut();
    router.push("/login");
  }

  return {
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    user: user ?? null,
    displayName,
    email,
    imageUrl,
    signOut,
  };
}
