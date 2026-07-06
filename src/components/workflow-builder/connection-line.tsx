"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type NodeConnection } from "@/lib/workflow-data";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Connection Line
// SVG cubic bezier path between two canvas nodes.
// Port positions are supplied as absolute canvas coords.
// ─────────────────────────────────────────────────────────────────────────────

export interface PortPosition {
  x: number;
  y: number;
}

interface ConnectionLineProps {
  connection: NodeConnection;
  fromPos: PortPosition;
  toPos: PortPosition;
  isSelected?: boolean;
  isAnimated?: boolean;
  onDelete?: (connectionId: string) => void;
}

/** Build a cubic bezier path string between two points */
function buildPath(from: PortPosition, to: PortPosition): string {
  const dx = Math.abs(to.x - from.x);
  const cpOffset = Math.max(dx * 0.45, 80);
  const cp1x = from.x + cpOffset;
  const cp1y = from.y;
  const cp2x = to.x - cpOffset;
  const cp2y = to.y;
  return `M ${from.x},${from.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${to.x},${to.y}`;
}

export const ConnectionLine = memo(function ConnectionLine({
  connection,
  fromPos,
  toPos,
  isSelected = false,
  isAnimated = false,
  onDelete,
}: ConnectionLineProps) {
  const pathD = buildPath(fromPos, toPos);
  const pathId = `conn-path-${connection.id}`;

  return (
    <g
      className="group/conn"
      role="img"
      aria-label={`Connection from node output to node input`}
    >
      {/* ── Wide invisible hit area for easier selection ───────────────── */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
        onClick={() => onDelete?.(connection.id)}
      />

      {/* ── Glow shadow (blur) ──────────────────────────────────────────── */}
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke="oklch(0.62 0.24 265)"
          strokeWidth={6}
          opacity={0.25}
          strokeLinecap="round"
          className="blur-sm"
          aria-hidden="true"
        />
      )}

      {/* ── Main path ──────────────────────────────────────────────────── */}
      <path
        id={pathId}
        d={pathD}
        fill="none"
        stroke={
          isSelected
            ? "oklch(0.62 0.24 265)"
            : "oklch(0.62 0.24 265 / 50%)"
        }
        strokeWidth={isSelected ? 2 : 1.5}
        strokeLinecap="round"
        className={cn(
          "transition-all duration-150",
          "group-hover/conn:stroke-[oklch(0.62_0.24_265/80%)] group-hover/conn:stroke-2"
        )}
        aria-hidden="true"
      />

      {/* ── Animated flow dashes ────────────────────────────────────────── */}
      {isAnimated && (
        <path
          d={pathD}
          fill="none"
          stroke="oklch(0.7 0.22 265)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="8 16"
          aria-hidden="true"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-24"
            dur="0.6s"
            repeatCount="indefinite"
          />
        </path>
      )}

      {/* ── Arrowhead at destination ────────────────────────────────────── */}
      <circle
        cx={toPos.x}
        cy={toPos.y}
        r={3.5}
        fill={isSelected ? "oklch(0.62 0.24 265)" : "oklch(0.62 0.24 265 / 60%)"}
        className="transition-all duration-150"
        aria-hidden="true"
      />
    </g>
  );
});
