"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Login Page (Clerk v7)
//
// useSignIn() → { signIn: SignInFutureResource, fetchStatus, errors }
// Password flow:  signIn.password({ emailAddress, password })
//                 → signIn.status === 'complete' → signIn.finalize()
// OAuth flow:     signIn.sso({ strategy, redirectUrl, redirectCallbackUrl })
// ─────────────────────────────────────────────────────────────────────────────

// Inline GitHub SVG — lucide-react v1.x removed the Github icon
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

interface FieldErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const router = useRouter();
  
  const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";
  // Call useSignIn conditionally/safely to prevent errors when ClerkProvider is unmounted
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const clerkSignIn = isMock ? { signIn: null, fetchStatus: undefined } : useSignIn();
  const { signIn, fetchStatus } = clerkSignIn;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  const isClerkReady = isMock || fetchStatus !== undefined;

  // ── Client-side validation ────────────────────────────────────────────────
  function validate(): boolean {
    const next: FieldErrors = {};
    if (!email.trim()) {
      next.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Please enter a valid email address.";
    }
    if (!password) next.password = "Password is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── Email + Password sign-in ──────────────────────────────────────────────
  async function handleEmailSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isMock) {
      if (!validate()) return;
      setIsSubmitting(true);
      setErrors({});
      document.cookie = "mock_session=active; path=/; max-age=86400";
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
      return;
    }
    if (!signIn || !validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const { error } = await signIn.password({
        emailAddress: email.trim(),
        password,
      });

      if (error) {
        const clerkErrors: FieldErrors = {};
        const code = error.code ?? "";
        if (code.includes("identifier") || code.includes("email")) {
          clerkErrors.email = error.longMessage ?? error.message;
        } else if (code.includes("password")) {
          clerkErrors.password = error.longMessage ?? error.message;
        } else {
          clerkErrors.general = error.longMessage ?? error.message;
        }
        setErrors(clerkErrors);
        return;
      }

      // Status is 'complete' after a successful password sign-in
      if (signIn.status === "complete") {
        await signIn.finalize();
        router.push("/dashboard");
      }
    } catch {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── OAuth sign-in ─────────────────────────────────────────────────────────
  async function handleOAuthSignIn(strategy: "oauth_google" | "oauth_github") {
    if (isMock) {
      const key = strategy === "oauth_google" ? "google" : "github";
      setOauthLoading(key);
      setErrors({});
      document.cookie = "mock_session=active; path=/; max-age=86400";
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
      return;
    }
    if (!signIn) return;
    const key = strategy === "oauth_google" ? "google" : "github";
    setOauthLoading(key);
    setErrors({});

    try {
      const { error } = await signIn.sso({
        strategy,
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectCallbackUrl: `${window.location.origin}/dashboard`,
      });

      if (error) {
        setErrors({ general: error.longMessage ?? "OAuth sign-in failed. Please try again." });
        setOauthLoading(null);
      }
      // On success, Clerk redirects — no further action needed
    } catch {
      setErrors({ general: "OAuth sign-in failed. Please try again." });
      setOauthLoading(null);
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col"
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in to your ForgeFlow AI account.
        </p>
      </div>

      {/* General error */}
      {errors.general && (
        <div
          role="alert"
          id="login-general-error"
          className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {errors.general}
        </div>
      )}

      {/* OAuth buttons */}
      <div className="flex flex-col gap-2.5" role="group" aria-label="Sign in with a provider">
        <Button
          id="login-google-btn"
          type="button"
          variant="outline"
          size="lg"
          className="w-full gap-3"
          onClick={() => handleOAuthSignIn("oauth_google")}
          disabled={isSubmitting || oauthLoading !== null}
          aria-label="Sign in with Google"
        >
          {oauthLoading === "google" ? (
            <Spinner size="sm" variant="muted" />
          ) : (
            <Globe className="h-4 w-4" aria-hidden="true" />
          )}
          Continue with Google
        </Button>

        <Button
          id="login-github-btn"
          type="button"
          variant="outline"
          size="lg"
          className="w-full gap-3"
          onClick={() => handleOAuthSignIn("oauth_github")}
          disabled={isSubmitting || oauthLoading !== null}
          aria-label="Sign in with GitHub"
        >
          {oauthLoading === "github" ? (
            <Spinner size="sm" variant="muted" />
          ) : (
            <GitHubIcon className="h-4 w-4" />
          )}
          Continue with GitHub
        </Button>
      </div>

      {/* Divider */}
      <div className="relative my-6" aria-hidden="true">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>

      {/* Email + Password form */}
      <form
        onSubmit={handleEmailSignIn}
        noValidate
        aria-label="Sign in with email and password"
        className="flex flex-col gap-4"
      >
        <FormField
          id="login-email"
          label="Email address"
          required
          error={errors.email}
        >
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              className="pl-9"
              disabled={isSubmitting || oauthLoading !== null}
            />
          </div>
        </FormField>

        <FormField
          id="login-password"
          label="Password"
          required
          error={errors.password}
        >
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              }}
              className="pl-9 pr-10"
              disabled={isSubmitting || oauthLoading !== null}
            />
            <button
              type="button"
              id="login-toggle-password"
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                "text-muted-foreground hover:text-foreground transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
              )}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </FormField>

        {/* Forgot password */}
        <div className="flex justify-end -mt-1">
          <Link
            href="/forgot-password"
            id="login-forgot-password-link"
            className="text-xs text-brand-500 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Forgot your password?
          </Link>
        </div>

        {/* Submit */}
        <Button
          id="login-submit-btn"
          type="submit"
          variant="glow"
          size="lg"
          className="w-full mt-1"
          disabled={!isClerkReady || isSubmitting || oauthLoading !== null}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" variant="white" label="" aria-hidden="true" />
              <span>Signing in…</span>
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Sign-up link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          id="login-signup-link"
          className="font-medium text-brand-500 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Create one
        </Link>
      </p>
    </motion.div>
  );
}
