"use client";

import React, { useRef, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  type CanvasNode,
  getNodeType,
  ACCENT_CLASSES,
} from "@/lib/workflow-data";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Node
// Draggable node card with typed ports (input left, output right).
// ─────────────────────────────────────────────────────────────────────────────

export const NODE_WIDTH = 200;
export const NODE_HEADER_H = 48;

/** Unique DOM id for an output port — used by canvas to measure position */
export function outputPortId(nodeId: string, portId: string) {
  return `port-out-${nodeId}-${portId}`;
}
/** Unique DOM id for an input port */
export function inputPortId(nodeId: string, portId: string) {
  return `port-in-${nodeId}-${portId}`;
}

const RUN_STATUS_COLORS = {
  idle:    "border-border/50",
  pending: "border-border/40",
  queued:  "border-warning/40 shadow-sm",
  running: "border-brand-500 shadow-brand-sm animate-glow-pulse",
  done:    "border-success/50",
  completed: "border-success/50",
  error:   "border-destructive/50",
  failed:  "border-destructive/50",
  cancelled: "border-border/30 opacity-60",
  skipped: "border-border/30 opacity-60",
  retry_scheduled: "border-warning/50 shadow-sm animate-pulse",
} as const;

const RUN_DOT_COLORS = {
  idle:    "bg-muted-foreground/40",
  pending: "bg-muted-foreground/30",
  queued:  "bg-warning animate-pulse",
  running: "bg-brand-500 animate-pulse",
  done:    "bg-success",
  completed: "bg-success",
  error:   "bg-destructive",
  failed:  "bg-destructive",
  cancelled: "bg-muted-foreground/30",
  skipped: "bg-muted-foreground/30",
  retry_scheduled: "bg-warning animate-pulse",
} as const;

interface WorkflowNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  zoom: number;
  onSelect: (nodeId: string) => void;
  onMove: (nodeId: string, dx: number, dy: number) => void;
  onMoveEnd: (nodeId: string) => void;
  onStartConnection: (nodeId: string, portId: string, isOutput: boolean) => void;
  onEndConnection: (nodeId: string, portId: string) => void;
}

export const WorkflowNode = memo(function WorkflowNode({
  node,
  isSelected,
  zoom,
  onSelect,
  onMove,
  onMoveEnd,
  onStartConnection,
  onEndConnection,
}: WorkflowNodeProps) {
  const nodeDef = getNodeType(node.typeId);
  const accent = ACCENT_CLASSES[nodeDef.accentColor] ?? ACCENT_CLASSES.brand;
  const runStatus = node.runStatus ?? "idle";
  const Icon = nodeDef.icon;

  // ── Drag state ──────────────────────────────────────────────────────────────
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Middle-click reserved for canvas pan, right-click for context menus
      if (e.button !== 0) return;
      e.stopPropagation();
      onSelect(node.id);
      dragOrigin.current = { x: e.clientX, y: e.clientY };
      isDragging.current = false;

      const handlePointerMove = (me: PointerEvent) => {
        if (!dragOrigin.current) return;
        const rawDx = me.clientX - dragOrigin.current.x;
        const rawDy = me.clientY - dragOrigin.current.y;
        if (!isDragging.current && Math.abs(rawDx) + Math.abs(rawDy) > 4) {
          isDragging.current = true;
        }
        if (isDragging.current) {
          // Scale movement by zoom so node tracks cursor precisely
          onMove(node.id, rawDx / zoom, rawDy / zoom);
          dragOrigin.current = { x: me.clientX, y: me.clientY };
        }
      };

      const handlePointerUp = () => {
        const wasDragging = isDragging.current;
        dragOrigin.current = null;
        isDragging.current = false;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        // Push undo-history snapshot when a drag completes
        if (wasDragging) {
          onMoveEnd(node.id);
        }
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [node.id, zoom, onSelect, onMove]
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "absolute rounded-xl border bg-card shadow-md select-none",
        "transition-shadow duration-150",
        isSelected
          ? "ring-2 ring-brand-500/60 shadow-brand-md border-brand-500/30"
          : RUN_STATUS_COLORS[runStatus],
        "cursor-grab active:cursor-grabbing"
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: NODE_WIDTH,
        zIndex: isSelected ? 20 : 10,
      }}
      onPointerDown={handlePointerDown}
      role="button"
      aria-pressed={isSelected}
      aria-label={`${node.label} node — ${nodeDef.label}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(node.id);
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center gap-2.5 px-3 py-2.5 rounded-t-xl border-b",
          accent.bg,
          "border-b-border/40"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            accent.bg,
            accent.border,
            "border"
          )}
          aria-hidden="true"
        >
          <Icon className={cn("w-3.5 h-3.5", accent.icon)} />
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate leading-tight">
            {node.label}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {nodeDef.label}
          </p>
        </div>

        {/* Run status dot */}
        <span
          className={cn("w-2 h-2 rounded-full shrink-0", RUN_DOT_COLORS[runStatus])}
          aria-label={`Status: ${runStatus}`}
          role="status"
        />
      </div>

      {/* ── Body — port rows ───────────────────────────────────────────────── */}
      <div className="px-0 py-2 relative">
        {/* Input ports (left side) */}
        <div className="flex flex-col gap-1.5">
          {nodeDef.inputs.map((port) => (
            <div
              key={port.id}
              className="relative flex items-center gap-2 h-6 pl-1 pr-3"
            >
              {/* Port circle */}
              <button
                id={inputPortId(node.id, port.id)}
                className={cn(
                  "absolute -left-[9px] w-4 h-4 rounded-full border-2 bg-background",
                  "border-border hover:border-brand-500 hover:bg-brand-500/10",
                  "transition-all duration-100 cursor-crosshair",
                  "focus-visible:outline-2 focus-visible:outline-ring"
                )}
                aria-label={`Input port: ${port.label}`}
                onPointerDown={(e) => {
                  // Don't let the canvas think this is a node drag or deselect
                  e.stopPropagation();
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  onEndConnection(node.id, port.id);
                }}
              />
              <span className="text-[10px] text-muted-foreground truncate pl-3">
                {port.label}
              </span>
            </div>
          ))}
        </div>

        {/* Output ports (right side) */}
        <div className="flex flex-col gap-1.5 items-end">
          {nodeDef.outputs.map((port) => (
            <div
              key={port.id}
              className="relative flex items-center justify-end gap-2 h-6 pl-3 pr-1"
            >
              <span className="text-[10px] text-muted-foreground truncate pr-3">
                {port.label}
              </span>
              {/* Port circle */}
              <button
                id={outputPortId(node.id, port.id)}
                className={cn(
                  "absolute -right-[9px] w-4 h-4 rounded-full border-2 bg-background",
                  "border-border hover:border-brand-500 hover:bg-brand-500/10",
                  "transition-all duration-100 cursor-crosshair",
                  "focus-visible:outline-2 focus-visible:outline-ring"
                )}
                aria-label={`Output port: ${port.label}`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onStartConnection(node.id, port.id, true);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
});
