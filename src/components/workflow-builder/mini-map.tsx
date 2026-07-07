"use client";

import React, { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { type CanvasNode, getNodeType } from "@/lib/workflow-data";
import { type CanvasViewport } from "./canvas";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Canvas Mini Map
// Bottom-right overview of the entire canvas.
// Nodes shown as colored rects; current viewport shown as a frame.
// Click to pan the canvas to that position.
// ─────────────────────────────────────────────────────────────────────────────

const MAP_W = 160;
const MAP_H = 100;
const CONTENT_SIZE = 4000; // matches canvas content size
const SCALE = MAP_W / CONTENT_SIZE; // 0.04
const NODE_W = 200;  // matches NODE_WIDTH in node.tsx
const NODE_H = 80;   // approximate rendered node height

const ACCENT_FILLS: Record<string, string> = {
  brand:   "oklch(0.62 0.24 265)",
  violet:  "oklch(0.64 0.26 290)",
  warning: "oklch(0.72 0.18 65)",
  info:    "oklch(0.55 0.2 240)",
  success: "oklch(0.55 0.18 145)",
};

interface MiniMapProps {
  nodes: CanvasNode[];
  viewport: CanvasViewport;
  canvasWidth: number;
  canvasHeight: number;
  onViewportChange: (vp: CanvasViewport) => void;
  className?: string;
}

export function MiniMap({
  nodes,
  viewport,
  canvasWidth,
  canvasHeight,
  onViewportChange,
  className,
}: MiniMapProps) {
  const mapRef = useRef<SVGSVGElement>(null);

  // Viewport rect in canvas-content coordinates
  const vpContentX = -viewport.x / viewport.zoom;
  const vpContentY = -viewport.y / viewport.zoom;
  const vpContentW = canvasWidth / viewport.zoom;
  const vpContentH = canvasHeight / viewport.zoom;

  // Convert to minimap pixel coordinates (clamped)
  const rectX = Math.max(0, vpContentX * SCALE);
  const rectY = Math.max(0, vpContentY * SCALE);
  const rectW = Math.max(8, Math.min(MAP_W - rectX, vpContentW * SCALE));
  const rectH = Math.max(8, Math.min(MAP_H - rectY, vpContentH * SCALE));

  // Click on minimap → pan canvas so clicked content point is centered
  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!mapRef.current) return;
      const svgRect = mapRef.current.getBoundingClientRect();
      const mx = e.clientX - svgRect.left;
      const my = e.clientY - svgRect.top;
      const contentX = mx / SCALE;
      const contentY = my / SCALE;
      onViewportChange({
        ...viewport,
        x: canvasWidth / 2 - contentX * viewport.zoom,
        y: canvasHeight / 2 - contentY * viewport.zoom,
      });
    },
    [viewport, canvasWidth, canvasHeight, onViewportChange]
  );

  return (
    <div
      className={cn(
        "absolute bottom-3 right-3 z-20 rounded-lg overflow-hidden",
        "border border-border/60 shadow-md bg-surface-1/90 backdrop-blur-sm",
        className
      )}
      aria-label="Canvas mini map"
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-2 py-0.5 border-b border-border/40">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
          Overview
        </span>
        <span className="text-[9px] text-muted-foreground/40 tabular-nums select-none">
          {nodes.length} node{nodes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* SVG map */}
      <svg
        ref={mapRef}
        width={MAP_W}
        height={MAP_H}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="block cursor-crosshair"
        onClick={handleClick}
        role="img"
        aria-label="Click to navigate canvas"
      >
        {/* Dot-grid background matching the main canvas */}
        <defs>
          <pattern
            id="minimap-grid"
            x="0"
            y="0"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="0.5" cy="0.5" r="0.5" fill="oklch(0.62 0.24 265 / 15%)" />
          </pattern>
        </defs>
        <rect width={MAP_W} height={MAP_H} fill="url(#minimap-grid)" />

        {/* Node rectangles */}
        {nodes.map((node) => {
          const def = getNodeType(node.typeId);
          const fill = ACCENT_FILLS[def.accentColor] ?? ACCENT_FILLS.brand;
          const nx = node.position.x * SCALE;
          const ny = node.position.y * SCALE;
          const nw = NODE_W * SCALE;
          const nh = NODE_H * SCALE;
          if (nx > MAP_W || ny > MAP_H || nx + nw < 0 || ny + nh < 0) return null;
          return (
            <rect
              key={node.id}
              x={nx}
              y={ny}
              width={Math.max(3, nw)}
              height={Math.max(2, nh)}
              rx={0.5}
              fill={fill}
              fillOpacity={0.65}
            />
          );
        })}

        {/* Viewport frame */}
        <rect
          x={rectX}
          y={rectY}
          width={rectW}
          height={rectH}
          fill="oklch(0.62 0.24 265 / 8%)"
          stroke="oklch(0.62 0.24 265 / 70%)"
          strokeWidth={1}
          rx={1}
        />
      </svg>
    </div>
  );
}
