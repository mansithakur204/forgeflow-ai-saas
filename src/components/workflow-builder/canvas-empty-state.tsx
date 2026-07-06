"use client";

import React from "react";
import { motion } from "framer-motion";
import { GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Builder Canvas Empty State
// Shown when the canvas has zero nodes.
// ─────────────────────────────────────────────────────────────────────────────

interface CanvasEmptyStateProps {
  onAddNode?: () => void;
}

export function CanvasEmptyState({ onAddNode }: CanvasEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
      aria-label="Empty canvas — drag a node to begin"
    >
      {/* Glowing illustration */}
      <div className="relative mb-8">
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-20"
          style={{
            background:
              "radial-gradient(circle, oklch(0.62 0.24 265) 0%, oklch(0.64 0.26 290) 100%)",
          }}
          aria-hidden="true"
        />

        {/* Central icon container */}
        <div
          className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{
            background: "oklch(0.62 0.24 265 / 12%)",
            border: "1px solid oklch(0.62 0.24 265 / 25%)",
          }}
          aria-hidden="true"
        >
          <GitBranch
            className="w-10 h-10"
            style={{ color: "oklch(0.62 0.24 265)" }}
          />
        </div>

        {/* Orbiting node chips */}
        {[
          { top: "-12px", left: "-32px", delay: 0 },
          { top: "-12px", right: "-32px", delay: 0.15 },
          { bottom: "-12px", left: "-20px", delay: 0.3 },
          { bottom: "-12px", right: "-20px", delay: 0.45 },
        ].map((pos, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: pos.delay + 0.2, type: "spring", stiffness: 300 }}
            className="absolute w-9 h-9 rounded-xl bg-surface-2 border border-border/60 shadow-sm"
            style={{ ...pos }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Text */}
      <div className="text-center space-y-2 mb-6 max-w-xs">
        <h3 className="text-lg font-semibold text-foreground tracking-tight">
          Start building your workflow
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Drag a node from the palette on the left, or use a quick-start
          template below to get going instantly.
        </p>
      </div>

      {/* Actions — re-enabled for pointer events */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <Button
          id="canvas-empty-add-node"
          variant="glow"
          size="sm"
          className="gap-1.5"
          onClick={onAddNode}
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add First Node
        </Button>
        <Button variant="outline" size="sm">
          Use Template
        </Button>
      </div>

      {/* Keyboard hint */}
      <p className="mt-4 text-xs text-muted-foreground/50 pointer-events-none">
        Tip: drag from the node palette on the left
      </p>
    </motion.div>
  );
}
