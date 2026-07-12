"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Play,
  Square,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Settings2,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import type { CanvasViewport } from "./canvas";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Builder Toolbar
// Top bar inside the builder shell (not the global topbar).
// ─────────────────────────────────────────────────────────────────────────────

type SaveState = "saved" | "saving" | "unsaved";

interface ToolbarProps {
  workflowName: string;
  viewport: CanvasViewport;
  isRunning: boolean;
  onNameChange: (name: string) => void;
  onRun: () => void;
  onStop: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  canUndo: boolean;
  canRedo: boolean;
  className?: string;
}

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = "ghost",
  active,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "ghost" | "outline";
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            size="icon-sm"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={cn(active && "bg-muted text-foreground")}
          />
        }
      >
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function BuilderToolbar({
  workflowName,
  viewport,
  isRunning,
  onNameChange,
  onRun,
  onStop,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onUndo,
  onRedo,
  onSave,
  canUndo,
  canRedo,
  className,
}: ToolbarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(workflowName);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const commitName = useCallback(() => {
    setIsEditingName(false);
    if (nameValue.trim()) {
      onNameChange(nameValue.trim());
    } else {
      setNameValue(workflowName);
    }
  }, [nameValue, workflowName, onNameChange]);

  const handleSave = useCallback(async () => {
    setSaveState("saving");
    try {
      await onSave();
      setSaveState("saved");
    } catch {
      setSaveState("unsaved");
    }
  }, [onSave]);

  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <header
      className={cn(
        "flex items-center gap-2 px-3 h-12 shrink-0",
        "bg-sidebar border-b border-sidebar-border",
        className
      )}
      aria-label="Workflow builder toolbar"
    >
      {/* ── Left: back + name ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Link href="/workflows" aria-label="Back to workflows">
          <Button variant="ghost" size="icon-sm" tabIndex={0}>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
        </Link>

        <Separator orientation="vertical" className="h-5" />

        {/* Workflow name — click to edit */}
        {isEditingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setNameValue(workflowName);
                setIsEditingName(false);
              }
            }}
            className={cn(
              "text-sm font-semibold bg-transparent border-b border-brand-500/60",
              "outline-none text-foreground min-w-0 max-w-[200px]",
              "focus:border-brand-500"
            )}
            autoFocus
            aria-label="Workflow name"
          />
        ) : (
          <button
            onClick={() => {
              setIsEditingName(true);
              setTimeout(() => nameInputRef.current?.select(), 10);
            }}
            className={cn(
              "text-sm font-semibold text-foreground truncate max-w-[200px]",
              "hover:text-brand-500 transition-colors cursor-text",
              "focus-visible:outline-ring outline-none rounded-sm"
            )}
            aria-label={`Workflow name: ${workflowName}. Click to edit.`}
          >
            {workflowName}
          </button>
        )}
      </div>

      {/* ── Center: Run / Stop ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          {isRunning ? (
            <motion.div
              key="stop"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                id="builder-stop-btn"
                variant="destructive"
                size="sm"
                onClick={onStop}
                className="gap-1.5"
              >
                <Square className="w-3.5 h-3.5" aria-hidden="true" />
                Stop
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="run"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                id="builder-run-btn"
                variant="glow"
                size="sm"
                onClick={onRun}
                className="gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                Run
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Right: tools ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-1 justify-end">
        {/* History */}
        <ToolbarBtn icon={Undo2} label="Undo" onClick={onUndo} disabled={!canUndo} />
        <ToolbarBtn icon={Redo2} label="Redo" onClick={onRedo} disabled={!canRedo} />

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Zoom */}
        <ToolbarBtn icon={ZoomOut} label="Zoom out" onClick={onZoomOut} />
        <span
          className="text-xs text-muted-foreground font-mono w-10 text-center tabular-nums select-none"
          aria-label={`Zoom level: ${zoomPercent}%`}
        >
          {zoomPercent}%
        </span>
        <ToolbarBtn icon={ZoomIn} label="Zoom in" onClick={onZoomIn} />
        <ToolbarBtn icon={Maximize2} label="Fit to screen" onClick={onFitToScreen} />

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Save */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                id="builder-save-btn"
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={saveState === "saving"}
                className="gap-1.5"
                aria-label="Save workflow"
              />
            }
          >
            <AnimatePresence mode="wait">
              {saveState === "saving" && (
                <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                </motion.span>
              )}
              {saveState === "saved" && (
                <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <CheckCircle className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
            <span className="hidden sm:inline">
              {saveState === "saving" ? "Saving…" : "Saved"}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Save workflow (Ctrl+S)
          </TooltipContent>
        </Tooltip>

        <ToolbarBtn icon={Settings2} label="Workflow settings" />
      </div>
    </header>
  );
}
