"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  NODE_TYPES_BY_CATEGORY,
  ACCENT_CLASSES,
  type NodeTypeDefinition,
  type NodeCategory,
} from "@/lib/workflow-data";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Node Palette
// Left panel listing all node types by category.
// Items are draggable onto the canvas.
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  trigger: "Triggers",
  ai: "AI & Models",
  logic: "Logic",
  io: "Inputs & Outputs",
};

const CATEGORY_ORDER: NodeCategory[] = ["trigger", "ai", "logic", "io"];

interface NodePaletteProps {
  onDragStart: (def: NodeTypeDefinition) => void;
  onDragEnd: () => void;
  className?: string;
}

function PaletteNodeChip({
  def,
  onDragStart,
  onDragEnd,
}: {
  def: NodeTypeDefinition;
  onDragStart: (def: NodeTypeDefinition) => void;
  onDragEnd: () => void;
}) {
  const accent = ACCENT_CLASSES[def.accentColor] ?? ACCENT_CLASSES.brand;
  const Icon = def.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12 }}
      draggable
      onDragStart={(e) => {
        onDragStart(def);
        // Set drag ghost text (browsers need this)
        if ("dataTransfer" in e && e.dataTransfer) {
          (e as unknown as React.DragEvent).dataTransfer.setData(
            "text/plain",
            def.typeId
          );
          (e as unknown as React.DragEvent).dataTransfer.effectAllowed = "copy";
        }
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-grab",
        "bg-surface-1 border-border/50",
        "hover:border-border hover:bg-surface-2",
        "hover:shadow-sm transition-all duration-100",
        "active:cursor-grabbing"
      )}
      role="button"
      aria-label={`Drag ${def.label} node onto canvas`}
      tabIndex={0}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
          accent.bg,
          accent.border
        )}
        aria-hidden="true"
      >
        <Icon className={cn("w-3.5 h-3.5", accent.icon)} />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground leading-tight truncate">
          {def.label}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {def.description}
        </p>
      </div>
    </motion.div>
  );
}

export function NodePalette({ onDragStart, onDragEnd, className }: NodePaletteProps) {
  return (
    <aside
      id="node-palette"
      className={cn(
        "flex flex-col w-[220px] shrink-0 bg-sidebar border-r border-sidebar-border",
        "overflow-y-auto overflow-x-hidden",
        className
      )}
      aria-label="Node palette — drag nodes onto the canvas"
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-border/40 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Node Library
        </p>
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-4 p-3 flex-1">
        {CATEGORY_ORDER.map((cat) => {
          const defs = NODE_TYPES_BY_CATEGORY[cat];
          if (!defs.length) return null;
          return (
            <div key={cat}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5 px-0.5">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="flex flex-col gap-1">
                {defs.map((def) => (
                  <PaletteNodeChip
                    key={def.typeId}
                    def={def}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2.5 border-t border-border/40 shrink-0">
        <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
          Drag nodes onto the canvas to build your workflow
        </p>
      </div>
    </aside>
  );
}
