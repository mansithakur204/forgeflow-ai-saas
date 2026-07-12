"use client";

import React from "react";
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
  const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";

  // Call Clerk hooks conditionally/safely to prevent errors when ClerkProvider is not mounted (mock mode)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const clerkUser = isMock ? { isLoaded: false, isSignedIn: false, user: null } : useUser();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const clerkObj = isMock ? { signOut: null } : useClerk();
  const router = useRouter();

  // State to prevent hydration mismatch in mock mode
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    if (isMock) {
      setIsMounted(true);
    }
  }, [isMock]);

  if (isMock) {
    const hasMockSession = isMounted && typeof window !== "undefined" && document.cookie.includes("mock_session=active");

    return {
      isLoaded: isMounted,
      isSignedIn: hasMockSession,
      user: hasMockSession
        ? ({
            id: "mock_user_123",
            firstName: "Jane",
            lastName: "Doe",
            fullName: "Jane Doe",
            imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
            primaryEmailAddress: { emailAddress: "jane.doe@example.com" },
            emailAddresses: [{ emailAddress: "jane.doe@example.com" }],
          } as any)
        : null,
      displayName: hasMockSession ? "Jane" : "User",
      email: hasMockSession ? "jane.doe@example.com" : null,
      imageUrl: hasMockSession ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" : null,
      signOut: async () => {
        if (typeof window !== "undefined") {
          document.cookie = "mock_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        router.push("/login");
      },
    };
  }

  const { isLoaded, isSignedIn, user } = clerkUser;
  const { signOut: clerkSignOut } = clerkObj;

  const displayName =
    user?.firstName ??
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ??
    "User";

  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  const imageUrl = user?.imageUrl ?? null;

  async function signOut() {
    if (clerkSignOut) {
      await clerkSignOut();
    }
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
