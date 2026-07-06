"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Root Layout Shell
// Mobile-first responsive layout:
//   Mobile  (< 768px):  full-width — sidebar is a Sheet drawer
//   Tablet  (768–1023px): 64px sidebar offset (collapsed icon mode)
//   Desktop (≥ 1024px):  260px sidebar offset (expanded mode)
// ─────────────────────────────────────────────────────────────────────────────

interface RootLayoutShellProps {
  children: React.ReactNode;
}

const pageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export function RootLayoutShell({ children }: RootLayoutShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-screen bg-background">
      {/* Desktop/Tablet Sidebar (hidden on mobile via useIsMobile inside Sidebar) */}
      <Sidebar />

      {/*
        Main content area — responsive left margin to account for sidebar width:
        - ml-0    → mobile: no sidebar (uses Sheet drawer)
        - md:ml-16 → tablet: 64px (collapsed sidebar width)
        - lg:ml-[260px] → desktop: 260px (expanded sidebar width)
      */}
      <div
        className="flex flex-1 flex-col min-w-0 ml-0 md:ml-16 lg:ml-[260px] transition-[margin] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        id="main-content"
      >
        {/* Topbar */}
        <Topbar />

        {/* Page content */}
        <main
          id="page-content"
          className="flex-1 overflow-auto"
          tabIndex={-1}
          aria-label="Page content"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer
          className="px-4 md:px-6 py-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
          aria-label="Application footer"
        >
          <span>
            ForgeFlow AI{" "}
            <span className="text-muted-foreground/60">v0.1.0</span>
          </span>
          <nav aria-label="Footer links" className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground transition-colors focus-visible:outline-ring">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors focus-visible:outline-ring">
              Terms
            </a>
            <a href="#" className="hover:text-foreground transition-colors focus-visible:outline-ring">
              Status
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
