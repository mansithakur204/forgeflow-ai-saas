"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  type CanvasNode,
  type NodeConnection,
  type NodeTypeId,
  type NodeTypeDefinition,
  NODE_TYPE_CATALOG,
} from "@/lib/workflow-data";
import { Canvas, type CanvasViewport } from "./canvas";
import { NodePalette } from "./node-palette";
import { PropertiesPanel } from "./properties-panel";
import { BuilderToolbar } from "./toolbar";
import { Monitor } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Builder Shell (Orchestrator)
//
// Full-screen client component. Owns all workflow state:
//   nodes, connections, selectedNodeIds, viewport, history (undo/redo)
//
// Layout (full-viewport, no global topbar/sidebar/footer):
//   ┌─────────────────────────────────────────────────────────┐
//   │  BuilderToolbar (h-12)                                  │
//   ├──────────────┬────────────────────────────┬─────────────┤
//   │ NodePalette  │ Canvas (flex-1)             │ Properties  │
//   │ (w-[220px])  │                             │ (w-[280px]) │
//   └──────────────┴────────────────────────────┴─────────────┘
// ─────────────────────────────────────────────────────────────────────────────

interface BuilderShellProps {
  workflowId: string;
  workflowName: string;
  initialNodes: CanvasNode[];
  initialConnections: NodeConnection[];
}

// ── History entry ────────────────────────────────────────────────────────────

interface HistoryEntry {
  nodes: CanvasNode[];
  connections: NodeConnection[];
}

const MAX_HISTORY = 50;

// ── ID generators ────────────────────────────────────────────────────────────

let nodeCounter = 100;
function nextNodeId() { return `node-${++nodeCounter}`; }

let connCounter = 100;
function nextConnId() { return `conn-${++connCounter}`; }

// ── Default viewport: centered ───────────────────────────────────────────────
const DEFAULT_VIEWPORT: CanvasViewport = { x: 60, y: 60, zoom: 1 };
const ZOOM_STEP = 0.12;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.0;

// ─────────────────────────────────────────────────────────────────────────────
export function BuilderShell({
  workflowName: initialName,
  initialNodes,
  initialConnections,
}: BuilderShellProps) {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [nodes, setNodes] = useState<CanvasNode[]>(initialNodes);
  const [connections, setConnections] = useState<NodeConnection[]>(initialConnections);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<CanvasViewport>(DEFAULT_VIEWPORT);
  const [workflowName, setWorkflowName] = useState(initialName);
  const [isRunning, setIsRunning] = useState(false);
  const [pendingDropType, setPendingDropType] = useState<NodeTypeDefinition | null>(null);

  // ── Undo / redo ─────────────────────────────────────────────────────────────
  const historyRef = useRef<HistoryEntry[]>([{ nodes: initialNodes, connections: initialConnections }]);
  const historyIndexRef = useRef(0);

  function pushHistory(nextNodes: CanvasNode[], nextConns: NodeConnection[]) {
    const idx = historyIndexRef.current;
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push({ nodes: nextNodes, connections: nextConns });
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current = historyRef.current.length - 1;
    }
  }

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const entry = historyRef.current[historyIndexRef.current];
    setNodes(entry.nodes);
    setConnections(entry.connections);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const entry = historyRef.current[historyIndexRef.current];
    setNodes(entry.nodes);
    setConnections(entry.connections);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey && !isInput) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey)) && !isInput) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl+D — duplicate last selected node
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && !isInput) {
        e.preventDefault();
        const lastId = selectedNodeIds[selectedNodeIds.length - 1];
        if (lastId) handleDuplicateNode(lastId);
      }
      // Ctrl+A — select all nodes
      if ((e.metaKey || e.ctrlKey) && e.key === "a" && !isInput) {
        e.preventDefault();
        setSelectedNodeIds(nodes.map((n) => n.id));
      }
      // Delete / Backspace — remove all selected nodes at once
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeIds.length > 0 && !isInput) {
          const idsToDelete = new Set(selectedNodeIds);
          const nextNodes = nodes.filter((n) => !idsToDelete.has(n.id));
          const nextConns = connections.filter(
            (c) => !idsToDelete.has(c.fromNodeId) && !idsToDelete.has(c.toNodeId)
          );
          setNodes(nextNodes);
          setConnections(nextConns);
          setSelectedNodeIds([]);
          pushHistory(nextNodes, nextConns);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeIds, nodes, connections, handleUndo, handleRedo]);

  // ── Node operations ─────────────────────────────────────────────────────────

  const handleAddNode = useCallback(
    (typeId: NodeTypeId, position: { x: number; y: number }) => {
      const def = NODE_TYPE_CATALOG.find((n) => n.typeId === typeId);
      if (!def) return;
      const newNode: CanvasNode = {
        id: nextNodeId(),
        typeId,
        label: def.label,
        position,
        config: { ...def.defaultConfig },
        runStatus: "idle",
      };
      const nextNodes = [...nodes, newNode];
      setNodes(nextNodes);
      setSelectedNodeIds([newNode.id]);
      pushHistory(nextNodes, connections);
    },
    [nodes, connections]
  );

  const handleMoveNode = useCallback(
    (nodeId: string, dx: number, dy: number) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
            : n
        )
      );
    },
    []
  );

  const handleMoveNodeEnd = useCallback(
    (nodeId: string) => {
      setNodes((prev) => {
        pushHistory(prev, connections);
        return prev;
      });
    },
    [connections]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const nextNodes = nodes.filter((n) => n.id !== nodeId);
      const nextConns = connections.filter(
        (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
      );
      setNodes(nextNodes);
      setConnections(nextConns);
      setSelectedNodeIds((prev) => prev.filter((id) => id !== nodeId));
      pushHistory(nextNodes, nextConns);
    },
    [nodes, connections]
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const src = nodes.find((n) => n.id === nodeId);
      if (!src) return;
      const newNode: CanvasNode = {
        ...src,
        id: nextNodeId(),
        position: { x: src.position.x + 24, y: src.position.y + 24 },
        runStatus: "idle",
      };
      const nextNodes = [...nodes, newNode];
      setNodes(nextNodes);
      setSelectedNodeIds([newNode.id]);
      pushHistory(nextNodes, connections);
    },
    [nodes, connections]
  );

  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<CanvasNode>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, ...updates } : n))
      );
    },
    []
  );

  // ── Connection operations ───────────────────────────────────────────────────

  const handleAddConnection = useCallback(
    (conn: Omit<NodeConnection, "id">) => {
      // Prevent duplicate
      const duplicate = connections.some(
        (c) =>
          c.fromNodeId === conn.fromNodeId &&
          c.fromPortId === conn.fromPortId &&
          c.toNodeId === conn.toNodeId &&
          c.toPortId === conn.toPortId
      );
      if (duplicate) return;
      const newConn: NodeConnection = { ...conn, id: nextConnId() };
      const nextConns = [...connections, newConn];
      setConnections(nextConns);
      pushHistory(nodes, nextConns);
    },
    [connections, nodes]
  );

  const handleDeleteConnection = useCallback(
    (connId: string) => {
      const nextConns = connections.filter((c) => c.id !== connId);
      setConnections(nextConns);
      pushHistory(nodes, nextConns);
    },
    [connections, nodes]
  );

  // ── Viewport operations ─────────────────────────────────────────────────────

  const handleZoomIn = useCallback(() => {
    setViewport((v) => ({ ...v, zoom: Math.min(ZOOM_MAX, v.zoom + ZOOM_STEP) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport((v) => ({ ...v, zoom: Math.max(ZOOM_MIN, v.zoom - ZOOM_STEP) }));
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (nodes.length === 0) {
      setViewport(DEFAULT_VIEWPORT);
      return;
    }
    // Compute bounding box of all nodes
    const xs = nodes.map((n) => n.position.x);
    const ys = nodes.map((n) => n.position.y);
    const minX = Math.min(...xs) - 60;
    const minY = Math.min(...ys) - 60;
    const maxX = Math.max(...xs) + 260; // node width + padding
    const maxY = Math.max(...ys) + 160;

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const canvasEl = document.getElementById("workflow-canvas");
    if (!canvasEl) return;
    const canvasW = canvasEl.offsetWidth;
    const canvasH = canvasEl.offsetHeight;
    const zoom = Math.min(
      ZOOM_MAX,
      Math.max(ZOOM_MIN, Math.min(canvasW / contentW, canvasH / contentH) * 0.9)
    );
    setViewport({
      x: (canvasW - contentW * zoom) / 2 - minX * zoom,
      y: (canvasH - contentH * zoom) / 2 - minY * zoom,
      zoom,
    });
  }, [nodes]);

  // ── Run simulation ──────────────────────────────────────────────────────────

  const handleRun = useCallback(() => {
    setIsRunning(true);
    // Simulate: after 4 seconds, stop
    setTimeout(() => setIsRunning(false), 4000);
  }, []);

  const handleStop = useCallback(() => setIsRunning(false), []);

  // ── Palette drag ────────────────────────────────────────────────────────────

  const handlePaletteDragStart = useCallback((def: NodeTypeDefinition) => {
    setPendingDropType(def);
  }, []);

  const handlePaletteDragEnd = useCallback(() => {
    // Don't clear immediately — let canvas drop handler fire first
    setTimeout(() => setPendingDropType(null), 100);
  }, []);

  // ── Quick-add from empty state ──────────────────────────────────────────────

  const handleEmptyAddNode = useCallback(() => {
    // Add a trigger node at the center of canvas
    handleAddNode("trigger_webhook", { x: 200, y: 200 });
  }, [handleAddNode]);

  // ── Selected node object (last in selection for properties panel) ───────────

  const lastSelectedId = selectedNodeIds[selectedNodeIds.length - 1] ?? null;
  const selectedNode = nodes.find((n) => n.id === lastSelectedId) ?? null;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen w-screen bg-surface-0 overflow-hidden" id="builder-shell">
      {/* Mobile fallback */}
      <div className="flex md:hidden flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center">
          <Monitor className="w-7 h-7 text-brand-500" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold">Open on a larger screen</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          The workflow builder is designed for desktop. Please visit on a screen
          wider than 768px for the full experience.
        </p>
      </div>

      {/* Desktop builder */}
      <div className="hidden md:flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <BuilderToolbar
          workflowName={workflowName}
          viewport={viewport}
          isRunning={isRunning}
          onNameChange={setWorkflowName}
          onRun={handleRun}
          onStop={handleStop}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToScreen={handleFitToScreen}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSave={() => { /* mock */ }}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        {/* Main area: palette + canvas + properties */}
        <div className="flex flex-1 overflow-hidden">
          {/* Node palette */}
          <NodePalette
            onDragStart={handlePaletteDragStart}
            onDragEnd={handlePaletteDragEnd}
          />

          {/* Canvas */}
          <Canvas
            nodes={nodes}
            connections={connections}
            selectedNodeIds={selectedNodeIds}
            viewport={viewport}
            isRunning={isRunning}
            onSelectNode={(id) => setSelectedNodeIds(id ? [id] : [])}
            onMoveNode={handleMoveNode}
            onAddNode={handleAddNode}
            onAddConnection={handleAddConnection}
            onDeleteConnection={handleDeleteConnection}
            onViewportChange={setViewport}
            onEmptyAddNode={handleEmptyAddNode}
            pendingDropType={pendingDropType}
            onClearPendingDrop={() => setPendingDropType(null)}
          />

          {/* Properties panel */}
          <PropertiesPanel
            selectedNode={selectedNode}
            selectionCount={selectedNodeIds.length}
            onClose={() => setSelectedNodeIds([])}
            onDeleteNode={handleDeleteNode}
            onDuplicateNode={handleDuplicateNode}
            onUpdateNode={handleUpdateNode}
          />
        </div>
      </div>
    </div>
  );
}
