"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  type CanvasNode,
  type NodeConnection,
  type NodeTypeId,
  type NodeTypeDefinition,
} from "@/lib/workflow-data";
import { WorkflowNode, outputPortId, inputPortId } from "./node";
import { ConnectionLine, type PortPosition } from "./connection-line";
import { CanvasEmptyState } from "./canvas-empty-state";
import { MiniMap } from "./mini-map";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Canvas
// Infinite pan/zoom canvas with SVG connection overlay and HTML node cards.
// ─────────────────────────────────────────────────────────────────────────────

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

interface DraftConnection {
  fromNodeId: string;
  fromPortId: string;
  mousePos: { x: number; y: number };
}

interface CanvasProps {
  nodes: CanvasNode[];
  connections: NodeConnection[];
  selectedNodeIds: string[];
  viewport: CanvasViewport;
  isRunning: boolean;
  onSelectNode: (nodeId: string | null) => void;
  onMoveNode: (nodeId: string, dx: number, dy: number) => void;
  onMoveNodeEnd?: (nodeId: string) => void;
  onAddNode: (typeId: NodeTypeId, position: { x: number; y: number }) => void;
  onAddConnection: (conn: Omit<NodeConnection, "id">) => void;
  onDeleteConnection: (connId: string) => void;
  onViewportChange: (vp: CanvasViewport) => void;
  onEmptyAddNode?: () => void;
  // Drag-from-palette support
  pendingDropType: NodeTypeDefinition | null;
  onClearPendingDrop: () => void;
}

/** Read a port element's center in canvas coordinates */
function getPortCanvasPos(
  portDomId: string,
  canvasEl: HTMLElement,
  viewport: CanvasViewport
): PortPosition | null {
  const el = document.getElementById(portDomId);
  if (!el || !canvasEl) return null;
  const portRect = el.getBoundingClientRect();
  const canvasRect = canvasEl.getBoundingClientRect();
  const cx = portRect.left + portRect.width / 2 - canvasRect.left;
  const cy = portRect.top + portRect.height / 2 - canvasRect.top;
  // Convert from screen space → canvas-content space
  return {
    x: (cx - viewport.x) / viewport.zoom,
    y: (cy - viewport.y) / viewport.zoom,
  };
}

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.08;

export function Canvas({
  nodes,
  connections,
  selectedNodeIds,
  viewport,
  isRunning,
  onSelectNode,
  onMoveNode,
  onMoveNodeEnd,
  onAddNode,
  onAddConnection,
  onDeleteConnection,
  onViewportChange,
  onEmptyAddNode,
  pendingDropType,
  onClearPendingDrop,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Draft connection being drawn by pointer
  const [draftConn, setDraftConn] = useState<DraftConnection | null>(null);

  // ── Pan (middle-mouse or space+drag) ──────────────────────────────────────
  const isPanning = useRef(false);
  const panOrigin = useRef({ x: 0, y: 0 });
  const vpAtPanStart = useRef<CanvasViewport>({ x: 0, y: 0, zoom: 1 });

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Middle-click or space+left for panning
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        isPanning.current = true;
        panOrigin.current = { x: e.clientX, y: e.clientY };
        vpAtPanStart.current = { ...viewport };
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        return;
      }
      // Left-click on canvas background → deselect
      if (e.button === 0 && e.target === e.currentTarget) {
        onSelectNode(null);
        setDraftConn(null);
      }
    },
    [viewport, onSelectNode]
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isPanning.current) {
        const dx = e.clientX - panOrigin.current.x;
        const dy = e.clientY - panOrigin.current.y;
        onViewportChange({
          ...vpAtPanStart.current,
          x: vpAtPanStart.current.x + dx,
          y: vpAtPanStart.current.y + dy,
        });
        return;
      }
      // Update draft connection mouse position
      if (draftConn && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDraftConn((prev) =>
          prev
            ? {
                ...prev,
                mousePos: {
                  x: (e.clientX - rect.left - viewport.x) / viewport.zoom,
                  y: (e.clientY - rect.top - viewport.y) / viewport.zoom,
                },
              }
            : null
        );
      }
    },
    [draftConn, viewport, onViewportChange]
  );

  const handleCanvasPointerUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
    }
    if (draftConn) {
      setDraftConn(null);
    }
  }, [draftConn]);

  // Cancel draft connection on Escape key
  useEffect(() => {
    if (!draftConn) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDraftConn(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [draftConn]);

  // ── Wheel zoom ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, viewport.zoom + delta));
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      // Zoom toward mouse pointer
      const newX = mouseX - (mouseX - viewport.x) * (newZoom / viewport.zoom);
      const newY = mouseY - (mouseY - viewport.y) * (newZoom / viewport.zoom);
      onViewportChange({ x: newX, y: newY, zoom: newZoom });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [viewport, onViewportChange]);

  // ── Canvas dimensions for the mini map ─────────────────────────────────────
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setCanvasDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Drop from palette ───────────────────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!pendingDropType || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const canvasY = (e.clientY - rect.top - viewport.y) / viewport.zoom;
      onAddNode(pendingDropType.typeId, { x: canvasX - 100, y: canvasY - 30 });
      onClearPendingDrop();
    },
    [pendingDropType, viewport, onAddNode, onClearPendingDrop]
  );

  // ── Connection port handlers ────────────────────────────────────────────────
  const handleStartConnection = useCallback(
    (nodeId: string, portId: string, _isOutput: boolean) => {
      if (!canvasRef.current) return;
      const portDomId = outputPortId(nodeId, portId);
      const pos = getPortCanvasPos(portDomId, canvasRef.current, viewport);
      if (!pos) return;
      setDraftConn({ fromNodeId: nodeId, fromPortId: portId, mousePos: pos });
    },
    [viewport]
  );

  const handleEndConnection = useCallback(
    (toNodeId: string, toPortId: string) => {
      if (!draftConn) return;
      if (draftConn.fromNodeId === toNodeId) {
        setDraftConn(null);
        return;
      }
      onAddConnection({
        fromNodeId: draftConn.fromNodeId,
        fromPortId: draftConn.fromPortId,
        toNodeId,
        toPortId,
      });
      setDraftConn(null);
    },
    [draftConn, onAddConnection]
  );

  // ── Build port positions for connection lines ───────────────────────────────
  const getConnectionPositions = useCallback(
    (conn: NodeConnection): { from: PortPosition; to: PortPosition } | null => {
      if (!canvasRef.current) return null;
      const fromPos = getPortCanvasPos(
        outputPortId(conn.fromNodeId, conn.fromPortId),
        canvasRef.current,
        viewport
      );
      const toPos = getPortCanvasPos(
        inputPortId(conn.toNodeId, conn.toPortId),
        canvasRef.current,
        viewport
      );
      if (!fromPos || !toPos) return null;
      return { from: fromPos, to: toPos };
    },
    [viewport]
  );

  // Force rerender when viewport changes so SVG lines follow nodes
  const [, rerender] = useState(0);
  useEffect(() => {
    rerender((v) => v + 1);
  }, [viewport, nodes]);

  return (
    <div
      ref={canvasRef}
      id="workflow-canvas"
      className={cn(
        "relative flex-1 overflow-hidden",
        "bg-surface-0",
        pendingDropType ? "cursor-copy" : isPanning.current ? "cursor-grabbing" : "cursor-default"
      )}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerLeave={handleCanvasPointerUp}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
      onDrop={handleDrop}
      aria-label="Workflow canvas — drag-and-drop workspace"
      role="application"
    >
      {/* ── Dot grid background ─────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, oklch(0.62 0.24 265 / 18%) 1px, transparent 1px)`,
          backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x % (24 * viewport.zoom)}px ${viewport.y % (24 * viewport.zoom)}px`,
        }}
        aria-hidden="true"
      />

      {/* ── Transformed content area ────────────────────────────────────── */}
      <div
        ref={contentRef}
        className="absolute origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          width: "4000px",
          height: "4000px",
        }}
        aria-hidden="false"
      >
        {/* ── SVG connection overlay ─────────────────────────────────────── */}
        <svg
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
          width="4000"
          height="4000"
          aria-hidden="true"
        >
          {/* Existing connections — each ConnectionLine has its own pointer-events */}
          {connections.map((conn) => {
            const positions = getConnectionPositions(conn);
            if (!positions) return null;
            return (
              <ConnectionLine
                key={conn.id}
                connection={conn}
                fromPos={positions.from}
                toPos={positions.to}
                isSelected={false}
                isAnimated={isRunning}
                onDelete={onDeleteConnection}
              />
            );
          })}

          {/* Draft connection being drawn */}
          {draftConn && (
            (() => {
              if (!canvasRef.current) return null;
              const fromPos = getPortCanvasPos(
                outputPortId(draftConn.fromNodeId, draftConn.fromPortId),
                canvasRef.current,
                viewport
              );
              if (!fromPos) return null;
              return (
                <ConnectionLine
                  connection={{
                    id: "__draft__",
                    fromNodeId: draftConn.fromNodeId,
                    fromPortId: draftConn.fromPortId,
                    toNodeId: "__mouse__",
                    toPortId: "in",
                  }}
                  fromPos={fromPos}
                  toPos={draftConn.mousePos}
                  isSelected={true}
                />
              );
            })()
          )}
        </svg>

        {/* ── Node cards ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {nodes.map((node) => (
            <WorkflowNode
              key={node.id}
              node={node}
              isSelected={selectedNodeIds.includes(node.id)}
              zoom={viewport.zoom}
              onSelect={onSelectNode}
              onMove={onMoveNode}
              onMoveEnd={onMoveNodeEnd || (() => {})}
              onStartConnection={handleStartConnection}
              onEndConnection={handleEndConnection}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* ── Mini map ───────────────────────────────────────────────────── */}
      {nodes.length > 0 && (
        <MiniMap
          nodes={nodes}
          viewport={viewport}
          canvasWidth={canvasDimensions.width}
          canvasHeight={canvasDimensions.height}
          onViewportChange={onViewportChange}
        />
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {nodes.length === 0 && (
        <CanvasEmptyState onAddNode={onEmptyAddNode} />
      )}
    </div>
  );
}
