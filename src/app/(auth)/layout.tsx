"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/common/logo";
import { ThemeToggle } from "@/components/common/theme-toggle";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Auth Layout
//
// Full-screen layout for /login, /signup, /forgot-password.
// Two-column on desktop (branding left | form right).
// Single-column on mobile (logo top | form below).
// Does NOT use RootLayoutShell — no sidebar or topbar.
// ─────────────────────────────────────────────────────────────────────────────

interface AuthLayoutProps {
  children: React.ReactNode;
}

const testimonials = [
  {
    quote:
      "ForgeFlow cut our pipeline build time from days to hours. It's the orchestration layer we've been waiting for.",
    author: "Priya Nair",
    role: "CTO, Aether Labs",
  },
  {
    quote:
      "The multi-agent coordination is seamless. We run 40 concurrent agents without any manual intervention.",
    author: "Marcus Chen",
    role: "Head of AI, Strata Systems",
  },
  {
    quote:
      "Finally, a platform that treats observability as a first-class citizen. Real-time dashboards saved us countless debug hours.",
    author: "Sofia Reyes",
    role: "Staff Engineer, Luminary AI",
  },
];

export default function AuthLayout({ children }: AuthLayoutProps) {
  // SSR-safe: always start at 0 so server and client agree on initial render.
  // After mount, rotate every 6 seconds.
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setIdx((i) => (i + 1) % testimonials.length),
      6000
    );
    return () => clearInterval(id);
  }, []);

  const testimonial = testimonials[idx];

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Theme toggle — top right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* ── Left panel: Brand / Testimonial (desktop only) ─────────────── */}
      <div
        className="relative hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between overflow-hidden"
        aria-hidden="true"
      >
        {/* Brand gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.08 0.02 265) 0%, oklch(0.12 0.04 270) 40%, oklch(0.1 0.035 280) 100%)",
          }}
        />

        {/* Mesh radial glows */}
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-30 blur-[120px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, oklch(0.62 0.24 265 / 80%) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 -right-20 w-[400px] h-[400px] rounded-full opacity-20 blur-[100px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, oklch(0.64 0.26 290 / 60%) 0%, transparent 70%)",
          }}
        />

        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(0.94 0.01 265) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-12">
          {/* Logo */}
          <div>
            <Logo />
          </div>

          {/* Tagline */}
          <div className="mt-auto mb-8">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-3xl xl:text-4xl font-bold text-white leading-tight"
            >
              Orchestrate Intelligence.{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg, oklch(0.78 0.18 265), oklch(0.8 0.2 290))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Automate Everything.
              </span>
            </motion.p>

            {/* Testimonial — rotates every 6s */}
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{
                  duration: 0.4,
                  delay: 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mt-8 border-l-2 border-brand-500/50 pl-4"
              >
                <p className="text-sm text-white/60 leading-relaxed italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <footer className="mt-3">
                  <p className="text-sm font-semibold text-white/80">
                    {testimonial.author}
                  </p>
                  <p className="text-xs text-white/40">{testimonial.role}</p>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>

          {/* Footer links */}
          <nav
            aria-label="Legal links"
            className="flex gap-4 text-xs text-white/30"
          >
            <Link
              href="#"
              className="hover:text-white/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="hover:text-white/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="hover:text-white/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
            >
              Status
            </Link>
          </nav>
        </div>
      </div>

      {/* ── Right panel: Auth form ──────────────────────────────────────── */}
      <main
        id="auth-content"
        className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8 lg:px-12 xl:px-16"
        tabIndex={-1}
      >
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>

        {/* Form container — max width for readability */}
        <div className="w-full max-w-[400px]">{children}</div>

        {/*
          Clerk Smart CAPTCHA anchor (headless flow).
          Clerk's bot-protection widget mounts here when captcha_widget_type
          is 'smart' or 'invisible'. Must be in the DOM during sign-up / sign-in.
          Visually hidden; not removed from layout so Clerk can size the widget.
        */}
        <div
          id="clerk-captcha"
          aria-hidden="true"
          className="absolute bottom-0 left-0 opacity-0 pointer-events-none"
        />
      </main>
    </div>
  );
}
