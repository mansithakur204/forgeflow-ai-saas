"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Forgot Password Page (Clerk v7)
//
// useSignIn() → { signIn: SignInFutureResource, fetchStatus, errors }
//
// Step 1 — Request code:
//   signIn.create({ identifier: email })
//   → signIn.resetPasswordEmailCode.sendCode()
//
// Step 2 — Verify code + set new password:
//   signIn.resetPasswordEmailCode.verifyCode({ code })
//   → status becomes 'needs_new_password'
//   → signIn.resetPasswordEmailCode.submitPassword({ password })
//   → status becomes 'complete' → signIn.finalize()
// ─────────────────────────────────────────────────────────────────────────────

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

interface FieldErrors {
  email?: string;
  code?: string;
  password?: string;
  general?: string;
}

type Step = "email" | "reset" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";
  // Call useSignIn conditionally/safely to prevent errors when ClerkProvider is unmounted
  const clerkSignIn = isMock ? { signIn: null, fetchStatus: undefined } : useSignIn();
  const { signIn, fetchStatus } = clerkSignIn;

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isClerkReady = isMock || fetchStatus !== undefined;

  // ── Step 1: create sign-in with identifier, send reset code ───────────────
  async function handleRequestCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isMock) {
      if (!email.trim()) {
        setErrors({ email: "Email is required." });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErrors({ email: "Please enter a valid email address." });
        return;
      }
      setIsSubmitting(true);
      setErrors({});
      setTimeout(() => {
        setStep("reset");
        setIsSubmitting(false);
      }, 500);
      return;
    }
    if (!signIn) return;

    if (!email.trim()) {
      setErrors({ email: "Email is required." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: "Please enter a valid email address." });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Initialize sign-in with the email identifier
      const createResult = await signIn.create({ identifier: email.trim() });
      if (createResult.error) {
        const err = createResult.error;
        const errCode = err.code ?? "";
        if (errCode.includes("identifier") || errCode.includes("email")) {
          setErrors({ email: err.longMessage ?? err.message });
        } else {
          setErrors({ general: err.longMessage ?? err.message });
        }
        return;
      }

      // Send the reset code to the email
      const sendResult = await signIn.resetPasswordEmailCode.sendCode();
      if (sendResult.error) {
        setErrors({ general: sendResult.error.longMessage ?? "Failed to send reset code." });
        return;
      }

      setStep("reset");
    } catch {
      setErrors({ general: "Failed to send reset code. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Step 2: verify code + submit new password ─────────────────────────────
  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isMock) {
      const next: FieldErrors = {};
      if (!code.trim()) next.code = "Code is required.";
      if (!newPassword) next.password = "New password is required.";
      else if (newPassword.length < 8) next.password = "Password must be at least 8 characters.";
      if (Object.keys(next).length > 0) {
        setErrors(next);
        return;
      }
      setIsSubmitting(true);
      setErrors({});
      document.cookie = "mock_session=active; path=/; max-age=86400";
      setTimeout(() => {
        setStep("done");
        setIsSubmitting(false);
        setTimeout(() => router.push("/dashboard"), 2000);
      }, 500);
      return;
    }
    if (!signIn) return;

    const next: FieldErrors = {};
    if (!code.trim()) next.code = "Code is required.";
    if (!newPassword) next.password = "New password is required.";
    else if (newPassword.length < 8) next.password = "Password must be at least 8 characters.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Verify the reset code
      const verifyResult = await signIn.resetPasswordEmailCode.verifyCode({
        code: code.trim(),
      });

      if (verifyResult.error) {
        const err = verifyResult.error;
        const errCode = err.code ?? "";
        if (errCode.includes("code") || errCode === "form_code_incorrect") {
          setErrors({ code: err.longMessage ?? err.message });
        } else {
          setErrors({ general: err.longMessage ?? err.message });
        }
        return;
      }

      // Status should now be 'needs_new_password' — submit the new password
      const submitResult = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });

      if (submitResult.error) {
        const err = submitResult.error;
        const errCode = err.code ?? "";
        if (errCode.includes("password")) {
          setErrors({ password: err.longMessage ?? err.message });
        } else {
          setErrors({ general: err.longMessage ?? err.message });
        }
        return;
      }

      // Status is now 'complete' — finalize to create the session
      if (signIn.status === "complete") {
        await signIn.finalize();
      }

      setStep("done");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch {
      setErrors({ general: "Password reset failed. Please try again." });
    } finally {
      setIsSubmitting(false);
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
        {/* ── Step 1: Enter email ────────────────────────────────────────── */}
        {step === "email" && (
          <motion.div
            key="email"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <div className="mb-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10">
                <KeyRound className="h-6 w-6 text-brand-500" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Reset your password
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter your email and we&apos;ll send you a reset code.
              </p>
            </div>

            {errors.general && (
              <div
                role="alert"
                id="forgot-general-error"
                className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {errors.general}
              </div>
            )}

            <form
              onSubmit={handleRequestCode}
              noValidate
              aria-label="Request password reset"
              className="flex flex-col gap-4"
            >
              <FormField
                id="forgot-email"
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
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                    }}
                    className="pl-9"
                    disabled={isSubmitting}
                  />
                </div>
              </FormField>

              <Button
                id="forgot-submit-btn"
                type="submit"
                variant="glow"
                size="lg"
                className="w-full"
                disabled={!isClerkReady || isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" variant="white" label="" aria-hidden="true" />
                    <span>Sending code…</span>
                  </>
                ) : (
                  "Send reset code"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm">
              <Link
                href="/login"
                id="forgot-back-login-link"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to sign in
              </Link>
            </p>
          </motion.div>
        )}

        {/* ── Step 2: Verify code + new password ────────────────────────── */}
        {step === "reset" && (
          <motion.div
            key="reset"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <div className="mb-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10">
                <Mail className="h-6 w-6 text-brand-500" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Check your email
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                We sent a reset code to{" "}
                <span className="font-medium text-foreground">{email}</span>.
              </p>
            </div>

            {errors.general && (
              <div
                role="alert"
                id="reset-general-error"
                className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {errors.general}
              </div>
            )}

            <form
              onSubmit={handleResetPassword}
              noValidate
              aria-label="Reset password with code"
              className="flex flex-col gap-4"
            >
              <FormField
                id="reset-code"
                label="Reset code"
                required
                error={errors.code}
                hint="Enter the 6-digit code from your email."
              >
                <Input
                  id="reset-code"
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
                  className="text-center tracking-[0.5em] font-mono text-lg"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField
                id="reset-password"
                label="New password"
                required
                error={errors.password}
              >
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                    }}
                    className="pl-9 pr-10"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    id="reset-toggle-password"
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

              <Button
                id="reset-submit-btn"
                type="submit"
                variant="glow"
                size="lg"
                className="w-full gap-2"
                disabled={!isClerkReady || isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" variant="white" label="" aria-hidden="true" />
                    <span>Resetting…</span>
                  </>
                ) : (
                  "Reset password"
                )}
              </Button>
            </form>

            <p className="mt-4 text-center">
              <button
                id="reset-back-btn"
                type="button"
                onClick={() => {
                  setStep("email");
                  setErrors({});
                  setCode("");
                  setNewPassword("");
                }}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Change email
              </button>
            </p>
          </motion.div>
        )}

        {/* ── Step 3: Success ────────────────────────────────────────────── */}
        {step === "done" && (
          <motion.div
            key="done"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="text-center"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10">
              <CheckCircle2 className="h-8 w-8 text-brand-500" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Password reset!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your password has been changed. Redirecting you to your dashboard…
            </p>
            <div className="mt-6 flex justify-center">
              <Spinner size="md" variant="brand" label="Redirecting…" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
