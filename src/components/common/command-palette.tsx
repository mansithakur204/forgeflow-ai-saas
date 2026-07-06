"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Search,
  ArrowRight,
  Clock,
  Zap,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { navGroups } from "@/config/nav";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const recentItems = [
  { id: "r1", label: "Production Workflow", href: "/workflows/prod" },
  { id: "r2", label: "GPT-4 Agent Config", href: "/agents/gpt4" },
  { id: "r3", label: "Analytics Report", href: "/analytics" },
];

const quickActions = [
  {
    id: "a1",
    label: "New Workflow",
    shortcut: "N W",
    icon: Zap,
    action: () => console.log("New workflow"),
  },
  {
    id: "a2",
    label: "New Agent",
    shortcut: "N A",
    icon: Zap,
    action: () => console.log("New agent"),
  },
];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Reset search on close
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const handleNavigation = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          "p-0 gap-0 max-w-[600px] w-full",
          "border border-border/60 rounded-xl shadow-2xl",
          "bg-background/90 backdrop-blur-2xl"
        )}
        aria-label="Command palette"
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <Command
                className="rounded-xl border-0 bg-transparent"
                shouldFilter={true}
              >
                <div className="flex items-center border-b border-border/60 px-4">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-3" />
                  <CommandInput
                    placeholder="Search navigation, run actions..."
                    value={search}
                    onValueChange={setSearch}
                    className="flex-1 border-0 focus:ring-0 bg-transparent py-4 text-sm placeholder:text-muted-foreground/60"
                  />
                  <kbd className="text-[10px] text-muted-foreground/60 border border-border/60 rounded px-1.5 py-0.5 shrink-0">
                    ESC
                  </kbd>
                </div>

                <CommandList className="max-h-[380px] overflow-y-auto p-2">
                  <CommandEmpty>
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <Search className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        No results for &quot;{search}&quot;
                      </p>
                    </div>
                  </CommandEmpty>

                  {/* Quick Actions */}
                  <CommandGroup heading="Quick Actions">
                    {quickActions.map((action) => (
                      <CommandItem
                        key={action.id}
                        value={action.label}
                        onSelect={action.action}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-brand-500/15 flex items-center justify-center shrink-0">
                          <action.icon className="w-3.5 h-3.5 text-brand-500" />
                        </div>
                        <span className="text-sm font-medium">
                          {action.label}
                        </span>
                        <CommandShortcut className="ml-auto">
                          {action.shortcut}
                        </CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  <CommandSeparator className="my-2" />

                  {/* Recent */}
                  <CommandGroup heading="Recent">
                    {recentItems.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.label}
                        onSelect={() => handleNavigation(item.href)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-sm">{item.label}</span>
                        <ArrowRight className="ml-auto w-3.5 h-3.5 text-muted-foreground/40" />
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  <CommandSeparator className="my-2" />

                  {/* Navigation */}
                  {navGroups.map((group) => (
                    <CommandGroup key={group.label} heading={group.label}>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <CommandItem
                            key={item.href}
                            value={item.title}
                            onSelect={() => handleNavigation(item.href)}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <span className="text-sm">{item.title}</span>
                            <span className="ml-auto text-xs text-muted-foreground/50">
                              {group.label}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                </CommandList>

                {/* Footer */}
                <div className="flex items-center gap-4 border-t border-border/60 px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                    <kbd className="border border-border/60 rounded px-1 py-0.5">↑</kbd>
                    <kbd className="border border-border/60 rounded px-1 py-0.5">↓</kbd>
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                    <kbd className="border border-border/60 rounded px-1 py-0.5">↵</kbd>
                    <span>Select</span>
                  </div>
                </div>
              </Command>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
