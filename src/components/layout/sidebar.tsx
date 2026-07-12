"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Zap, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { navGroups } from "@/config/nav";
import { siteConfig } from "@/config/site";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-media-query";
import { Logo } from "@/components/common/logo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Responsive Sidebar
// Desktop: animated expand/collapse (260px ↔ 64px)
// Tablet:  collapsed icon-only mode (64px)
// Mobile:  Sheet drawer from the left (triggered by topbar hamburger)
// ─────────────────────────────────────────────────────────────────────────────

export const SIDEBAR_EXPANDED_W = 260;
export const SIDEBAR_COLLAPSED_W = 64;

// ── Shared Nav Content ────────────────────────────────────────────────────────

function NavContent({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-5 px-2">
      {navGroups.map((group) => (
        <div key={group.label}>
          {/* Group label */}
          <AnimatePresence>
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none"
              >
                {group.label}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Nav items */}
          <ul className="flex flex-col gap-0.5" role="list">
            {group.items.map((item) => {
              const isActive =
                !item.disabled && (pathname === item.href || pathname.startsWith(item.href + "/"));
              const Icon = item.icon;

              const navContent = (
                <>
                  {/* Active indicator */}
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4/5 rounded-full bg-sidebar-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      aria-hidden="true"
                    />
                  )}

                  <Icon
                    className={cn(
                      "shrink-0 transition-colors",
                      collapsed ? "w-5 h-5" : "w-4 h-4",
                      item.disabled
                        ? "text-muted-foreground/30"
                        : isActive
                        ? "text-sidebar-primary"
                        : "text-muted-foreground"
                    )}
                    aria-hidden="true"
                  />

                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="truncate"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {!collapsed && item.badge && !item.disabled && (
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] py-0 h-4 px-1.5 bg-brand-500/15 text-brand-500 border-0"
                    >
                      {item.badge}
                    </Badge>
                  )}

                  {!collapsed && item.disabled && (
                    <span className="ml-auto text-[9px] text-muted-foreground/40 font-medium uppercase tracking-wide">
                      Soon
                    </span>
                  )}
                </>
              );

              const navLink = item.disabled ? (
                <span
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                    "transition-all duration-150 outline-none select-none",
                    "opacity-40 cursor-not-allowed",
                    collapsed && "justify-center px-0 py-2.5"
                  )}
                  aria-disabled="true"
                  role="link"
                >
                  {navContent}
                </span>
              ) : (
                <Link
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                    "transition-all duration-150 outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive
                      ? "bg-sidebar-primary/10 text-sidebar-primary"
                      : "text-sidebar-foreground/70",
                    collapsed && "justify-center px-0 py-2.5"
                  )}
                >
                  {navContent}
                </Link>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger render={<span />}>{navLink}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.title}
                        {item.disabled && (
                          <span className="ml-1.5 text-muted-foreground/60">(Coming soon)</span>
                        )}
                        {item.badge && !item.disabled && (
                          <span className="ml-1.5 text-brand-400">({item.badge})</span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    navLink
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// ── Desktop / Tablet Sidebar ──────────────────────────────────────────────────

const sidebarVariants = {
  expanded: { width: SIDEBAR_EXPANDED_W },
  collapsed: { width: SIDEBAR_COLLAPSED_W },
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();

  // On mobile, we render nothing — MobileSidebar handles it
  if (isMobile) return null;

  return (
    <motion.aside
      variants={sidebarVariants}
      animate={collapsed ? "collapsed" : "expanded"}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="fixed left-0 top-0 h-full z-30 flex flex-col bg-sidebar border-r border-sidebar-border overflow-hidden"
      aria-label="Sidebar"
    >
      {/* Logo row */}
      <div
        className={cn(
          "flex items-center h-14 px-4 shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="full-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Logo />
            </motion.div>
          ) : (
            <motion.div
              key="icon-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div
                className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center"
                aria-label="ForgeFlow AI"
              >
                <Zap className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-1 mb-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      )}

      <Separator className="shrink-0 opacity-50" />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <NavContent collapsed={collapsed} />
      </ScrollArea>
    </motion.aside>
  );
}

// ── Mobile Sidebar (Sheet Drawer) ─────────────────────────────────────────────

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" showCloseButton={false} className="p-0 w-[280px] flex flex-col">
        {/* Header */}
        <SheetHeader className="h-14 flex flex-row items-center justify-between px-4 py-0 border-b border-border/50 shrink-0">
          <SheetTitle className="m-0 p-0">
            <Logo />
          </SheetTitle>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </SheetHeader>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <NavContent collapsed={false} onNavigate={onClose} />
        </ScrollArea>

        {/* Footer branding */}
        <div className="px-4 py-3 border-t border-border/40">
          <p className="text-xs text-muted-foreground/50 font-medium">
            ForgeFlow AI <span className="opacity-60">v{siteConfig.version}</span>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Mobile Hamburger Trigger ──────────────────────────────────────────────────

interface HamburgerProps {
  onClick: () => void;
  className?: string;
}

export function HamburgerButton({ onClick, className }: HamburgerProps) {
  return (
    <button
      id="mobile-menu-trigger"
      onClick={onClick}
      className={cn(
        "flex md:hidden items-center justify-center",
        "w-9 h-9 rounded-lg text-muted-foreground",
        "hover:text-foreground hover:bg-muted transition-colors",
        "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1",
        className
      )}
      aria-label="Open navigation menu"
      aria-expanded={false}
    >
      <Menu className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}
