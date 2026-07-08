"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, Globe, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Signup Page (Clerk v7)
//
// useSignUp() → { signUp: SignUpFutureResource, fetchStatus, errors }
// Step 1:  signUp.password({ emailAddress, password, firstName, lastName })
//          → signUp.verifications.sendEmailCode()
// Step 2:  signUp.verifications.verifyEmailCode({ code })
//          → signUp.status === 'complete' → signUp.finalize()
// OAuth:   signUp.sso({ strategy, redirectUrl, redirectCallbackUrl })
// ─────────────────────────────────────────────────────────────────────────────

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

const stepVariants = {
  enter: { opacity: 0, x: 20 },
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

// ── Password strength ─────────────────────────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "bg-destructive" };
  if (score <= 2) return { score, label: "Fair", color: "bg-yellow-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-blue-500" };
  return { score, label: "Strong", color: "bg-brand-500" };
}

interface FieldErrors {
  firstName?: string;
  email?: string;
  password?: string;
  code?: string;
  general?: string;
}

type Step = "details" | "verify";

export default function SignupPage() {
  const router = useRouter();
  
  const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";
  // Call useSignUp conditionally/safely to prevent errors when ClerkProvider is unmounted
  const clerkSignUp = isMock ? { signUp: null, fetchStatus: undefined } : useSignUp();
  const { signUp, fetchStatus } = clerkSignUp;

  const [step, setStep] = useState<Step>("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  const isClerkReady = isMock || fetchStatus !== undefined;
  const passwordStrength = getPasswordStrength(password);

  // ── Validate step 1 ───────────────────────────────────────────────────────
  function validateDetails(): boolean {
    const next: FieldErrors = {};
    if (!firstName.trim()) next.firstName = "First name is required.";
    if (!email.trim()) {
      next.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Please enter a valid email address.";
    }
    if (!password) {
      next.password = "Password is required.";
    } else if (password.length < 8) {
      next.password = "Password must be at least 8 characters.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── Step 1: create account + send verification email ─────────────────────
  async function handleCreateAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isMock) {
      if (!validateDetails()) return;
      setIsSubmitting(true);
      setErrors({});
      setTimeout(() => {
        setStep("verify");
        setIsSubmitting(false);
      }, 500);
      return;
    }
    if (!signUp || !validateDetails()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Create the account with password
      const createResult = await signUp.password({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        emailAddress: email.trim(),
        password,
      });

      if (createResult.error) {
        const err = createResult.error;
        const errCode = err.code ?? "";
        const clerkErrors: FieldErrors = {};
        if (errCode.includes("email")) {
          clerkErrors.email = err.longMessage ?? err.message;
        } else if (errCode.includes("password")) {
          clerkErrors.password = err.longMessage ?? err.message;
        } else {
          clerkErrors.general = err.longMessage ?? err.message;
        }
        setErrors(clerkErrors);
        return;
      }

      // Send the email verification code
      const sendResult = await signUp.verifications.sendEmailCode();
      if (sendResult.error) {
        setErrors({ general: sendResult.error.longMessage ?? "Failed to send verification code." });
        return;
      }

      setStep("verify");
    } catch {
      setErrors({ general: "Account creation failed. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Step 2: verify email code ─────────────────────────────────────────────
  async function handleVerifyCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isMock) {
      if (!code.trim()) {
        setErrors({ code: "Verification code is required." });
        return;
      }
      if (code.trim() !== "424242") {
        setErrors({ code: "Invalid verification code." });
        return;
      }
      setIsSubmitting(true);
      setErrors({});
      document.cookie = "mock_session=active; path=/; max-age=86400";
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
      return;
    }
    if (!signUp) return;

    if (!code.trim()) {
      setErrors({ code: "Verification code is required." });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await signUp.verifications.verifyEmailCode({ code: code.trim() });

      if (result.error) {
        setErrors({ code: result.error.longMessage ?? result.error.message });
        return;
      }

      if (signUp.status === "complete") {
        await signUp.finalize();
        router.push("/dashboard");
      }
    } catch {
      setErrors({ general: "Verification failed. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Resend verification code ──────────────────────────────────────────────
  async function handleResendCode() {
    if (isMock) {
      setErrors({});
      return;
    }
    if (!signUp) return;
    try {
      const result = await signUp.verifications.sendEmailCode();
      if (result.error) {
        setErrors({ general: result.error.longMessage ?? "Failed to resend code." });
      } else {
        setErrors({});
      }
    } catch {
      setErrors({ general: "Failed to resend code. Please try again." });
    }
  }

  // ── OAuth sign-up ─────────────────────────────────────────────────────────
  async function handleOAuthSignUp(strategy: "oauth_google" | "oauth_github") {
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
    if (!signUp) return;
    const key = strategy === "oauth_google" ? "google" : "github";
    setOauthLoading(key);
    setErrors({});

    try {
      const { error } = await signUp.sso({
        strategy,
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectCallbackUrl: `${window.location.origin}/dashboard`,
      });

      if (error) {
        setErrors({ general: error.longMessage ?? "OAuth sign-up failed. Please try again." });
        setOauthLoading(null);
      }
    } catch {
      setErrors({ general: "OAuth sign-up failed. Please try again." });
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
      <AnimatePresence mode="wait">
        {/* ── Step 1: Account Details ────────────────────────────────────── */}
        {step === "details" && (
          <motion.div
            key="details"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Create your account
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Start orchestrating AI workflows in minutes.
              </p>
            </div>

            {errors.general && (
              <div
                role="alert"
                id="signup-general-error"
                className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {errors.general}
              </div>
            )}

            {/* OAuth buttons */}
            <div className="flex flex-col gap-2.5" role="group" aria-label="Sign up with a provider">
              <Button
                id="signup-google-btn"
                type="button"
                variant="outline"
                size="lg"
                className="w-full gap-3"
                onClick={() => handleOAuthSignUp("oauth_google")}
                disabled={isSubmitting || oauthLoading !== null}
                aria-label="Sign up with Google"
              >
                {oauthLoading === "google" ? (
                  <Spinner size="sm" variant="muted" />
                ) : (
                  <Globe className="h-4 w-4" aria-hidden="true" />
                )}
                Continue with Google
              </Button>
              <Button
                id="signup-github-btn"
                type="button"
                variant="outline"
                size="lg"
                className="w-full gap-3"
                onClick={() => handleOAuthSignUp("oauth_github")}
                disabled={isSubmitting || oauthLoading !== null}
                aria-label="Sign up with GitHub"
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
                  or sign up with email
                </span>
              </div>
            </div>

            {/* Details form */}
            <form
              onSubmit={handleCreateAccount}
              noValidate
              aria-label="Create account with email and password"
              className="flex flex-col gap-4"
            >
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="signup-first-name"
                  label="First name"
                  required
                  error={errors.firstName}
                >
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="signup-first-name"
                      type="text"
                      autoComplete="given-name"
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (errors.firstName) setErrors((p) => ({ ...p, firstName: undefined }));
                      }}
                      className="pl-9"
                      disabled={isSubmitting || oauthLoading !== null}
                    />
                  </div>
                </FormField>

                <FormField id="signup-last-name" label="Last name">
                  <Input
                    id="signup-last-name"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isSubmitting || oauthLoading !== null}
                  />
                </FormField>
              </div>

              <FormField
                id="signup-email"
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
                    id="signup-email"
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
                id="signup-password"
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
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
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
                    id="signup-toggle-password"
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

                {/* Password strength */}
                {password && (
                  <div className="mt-2" aria-label={`Password strength: ${passwordStrength.label}`}>
                    <div className="flex gap-1" aria-hidden="true">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-all duration-300",
                            passwordStrength.score >= i ? passwordStrength.color : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Strength:{" "}
                      <span
                        className={cn(
                          "font-medium",
                          passwordStrength.score <= 1
                            ? "text-destructive"
                            : passwordStrength.score <= 2
                            ? "text-yellow-500"
                            : passwordStrength.score <= 3
                            ? "text-blue-500"
                            : "text-brand-500"
                        )}
                      >
                        {passwordStrength.label}
                      </span>
                    </p>
                  </div>
                )}
              </FormField>

              <Button
                id="signup-submit-btn"
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
                    <span>Creating account…</span>
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                id="signup-login-link"
                className="font-medium text-brand-500 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        )}

        {/* ── Step 2: Email Verification ─────────────────────────────────── */}
        {step === "verify" && (
          <motion.div
            key="verify"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10">
                <Mail className="h-7 w-7 text-brand-500" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Check your email
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-foreground">{email}</span>.
              </p>
            </div>

            {errors.general && (
              <div
                role="alert"
                id="verify-general-error"
                className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {errors.general}
              </div>
            )}

            <form
              onSubmit={handleVerifyCode}
              noValidate
              aria-label="Verify email address"
              className="flex flex-col gap-4"
            >
              <FormField
                id="signup-code"
                label="Verification code"
                required
                error={errors.code}
                hint="Enter the 6-digit code from your email."
              >
                <Input
                  id="signup-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    if (errors.code) setErrors((p) => ({ ...p, code: undefined }));
                  }}
                  className="text-center text-lg tracking-[0.5em] font-mono"
                  disabled={isSubmitting}
                />
              </FormField>

              <Button
                id="verify-submit-btn"
                type="submit"
                variant="glow"
                size="lg"
                className="w-full gap-2"
                disabled={!isClerkReady || isSubmitting || code.length < 6}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" variant="white" label="" aria-hidden="true" />
                    <span>Verifying…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Verify email
                  </>
                )}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Didn&apos;t receive a code?{" "}
              <button
                id="verify-resend-btn"
                type="button"
                onClick={handleResendCode}
                className="font-medium text-brand-500 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                Resend
              </button>
            </p>

            <p className="mt-2 text-center">
              <button
                id="verify-back-btn"
                type="button"
                onClick={() => {
                  setStep("details");
                  setErrors({});
                  setCode("");
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                ← Back to sign up
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
