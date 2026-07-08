"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "./theme-provider";
import { ToastProvider } from "./toast-provider";

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Root provider tree. Order matters:
 * ClerkProvider → ThemeProvider → children + ToastProvider
 *
 * ClerkProvider must be the outermost so auth context is available to all
 * server and client components, including the root layout and middleware.
 * ThemeProvider must wrap ToastProvider so Toaster can read the theme.
 */
export function Providers({ children }: ProvidersProps) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === "true") {
    return (
      <ThemeProvider>
        {children}
        <ToastProvider />
      </ThemeProvider>
    );
  }
  return (
    <ClerkProvider>
      <ThemeProvider>
        {children}
        <ToastProvider />
      </ThemeProvider>
    </ClerkProvider>
  );
}
