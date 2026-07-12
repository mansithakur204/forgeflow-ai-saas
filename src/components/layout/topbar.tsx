"use client";

import React, { useEffect, useState } from "react";
import { Search, Bell, User, Settings, CreditCard, LogOut, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { CommandPalette } from "@/components/common/command-palette";
import { HamburgerButton, MobileSidebar } from "@/components/layout/sidebar";
import { useIsMobile } from "@/hooks/use-media-query";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Responsive Topbar
// Mobile: full-width + hamburger menu
// Tablet: offset from collapsed sidebar (64px)
// Desktop: offset from expanded sidebar (260px)
//
// User data is sourced from Clerk's useUser() — no hardcoded values.
// Sign out uses useClerk().signOut() and redirects to /login.
// ─────────────────────────────────────────────────────────────────────────────

/** Derive display initials from name or email. */
function getInitials(firstName?: string | null, lastName?: string | null, email?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

export function Topbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { open, show, close } = useCommandPalette();
  const isMobile = useIsMobile();

  // ── User data ───────────────────────────────────────────────────────
  const { user, isLoaded, signOut, displayName, email, imageUrl: avatarUrl } = useAuth();
  const initials = getInitials(user?.firstName, user?.lastName, email ?? "");

  // ── Scroll shadow ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Sign out ───────────────────────────────────────────────────────────────
  async function handleSignOut() {
    await signOut();
  }

  return (
    <>
      <motion.header
        initial={false}
        animate={
          scrolled
            ? { backdropFilter: "blur(16px)", backgroundColor: "transparent" }
            : { backdropFilter: "blur(0px)" }
        }
        transition={{ duration: 0.2 }}
        className={cn(
          "sticky top-0 z-20 flex h-14 items-center gap-2 md:gap-3 px-3 md:px-4 lg:px-6",
          "border-b transition-all duration-200",
          scrolled
            ? "border-border/60 bg-background/70 supports-[backdrop-filter]:bg-background/50"
            : "border-border/0 bg-background"
        )}
        aria-label="Application header"
      >
        {/* Hamburger — mobile only */}
        <HamburgerButton onClick={() => setMobileNavOpen(true)} />

        {/* Search / Command palette trigger */}
        <button
          id="command-palette-trigger"
          onClick={show}
          className={cn(
            "flex flex-1 max-w-xs items-center gap-2 px-3 py-1.5 rounded-lg border text-sm",
            "bg-muted/50 border-border/60 text-muted-foreground",
            "hover:bg-muted hover:border-border hover:text-foreground",
            "transition-all duration-150 cursor-pointer group",
            "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1"
          )}
          aria-label="Open command palette"
          aria-keyshortcuts="Meta+K"
        >
          <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left text-sm hidden sm:block">
            Search or run a command...
          </span>
          <kbd
            className="hidden sm:flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-background border border-border/60 text-muted-foreground/70"
            aria-hidden="true"
          >
            <span>⌘</span><span>K</span>
          </kbd>
        </button>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1 md:gap-2">
          {/* Notifications (Disabled / Coming Soon) */}
          <Tooltip>
            <TooltipTrigger
              id="notifications-button"
              disabled
              className="relative cursor-not-allowed opacity-35 p-2 rounded-lg text-muted-foreground"
              aria-label="Notifications (Coming soon)"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Notifications (Coming soon)</TooltipContent>
          </Tooltip>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* User menu — real Clerk data */}
          <DropdownMenu>
            <DropdownMenuTrigger
              id="user-menu-trigger"
              className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1"
              aria-label="User menu"
            >
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage
                  src={(isLoaded && avatarUrl) ? avatarUrl : undefined}
                  alt={isLoaded ? `${displayName}'s avatar` : "Loading avatar"}
                />
                <AvatarFallback className="text-[11px] bg-brand-500/20 text-brand-500 font-semibold select-none">
                  {isLoaded ? initials : "…"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start min-w-0">
                <span className="text-xs font-semibold leading-none truncate max-w-[120px]">
                  {isLoaded ? displayName : "Loading…"}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate max-w-[120px]">
                  {isLoaded ? email : ""}
                </span>
              </div>
              <ChevronDown className="hidden md:block w-3 h-3 text-muted-foreground shrink-0" aria-hidden="true" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              {/* Identity header */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0">
                  <div className="flex items-center gap-3 px-2 py-2.5">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={(isLoaded && avatarUrl) ? avatarUrl : undefined} alt={displayName} />
                      <AvatarFallback className="text-xs bg-brand-500/20 text-brand-500 font-semibold select-none">
                        {isLoaded ? initials : "…"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {isLoaded ? displayName : "Loading…"}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal truncate">
                        {isLoaded ? email : ""}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem id="user-menu-profile" disabled className="gap-2.5 opacity-55">
                  <User className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  <span>Profile</span>
                  <span className="ml-auto text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wide">Soon</span>
                </DropdownMenuItem>
                <DropdownMenuItem id="user-menu-settings" disabled className="gap-2.5 opacity-55">
                  <Settings className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  <span>Settings</span>
                  <span className="ml-auto text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wide">Soon</span>
                </DropdownMenuItem>
                <DropdownMenuItem id="user-menu-billing" disabled className="gap-2.5 opacity-55">
                  <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  <span>Billing</span>
                  <span className="ml-auto text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wide">Soon</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem
                  id="user-menu-signout"
                  variant="destructive"
                  className="cursor-pointer gap-2.5"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.header>

      {/* Mobile navigation drawer */}
      <MobileSidebar
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Command palette */}
      <CommandPalette open={open} onClose={close} />
    </>
  );
}
