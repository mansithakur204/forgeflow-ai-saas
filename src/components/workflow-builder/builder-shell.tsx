"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  WorkflowRunner,
  createDefaultExecutorRegistry,
  ExecutionContext,
  validateWorkflowGraph,
  parseWorkflowGraphFromCanvas,
  InMemoryExecutionLogger,
  ExecutionError,
  type WorkflowRunSnapshot,
  type ExecutionLogEntry,
} from "@/engine";
import type { NodeExecutionInput } from "@/engine/types/runtime";
import { toast } from "sonner";
import { ExecutionTimeline } from "./timeline";
import { ExecutionLogsPanel } from "./logs-panel";
import { ExecutionInspectorPanel } from "./inspector-panel";
import { ChevronUp, ChevronDown, X, Settings, History } from "lucide-react";
import { RunHistoryService, type RunHistoryEntry } from "./run-history-service";
import { RunHistoryPanel } from "./history-panel";
import { ReplayController } from "./replay-controller";
import { ReplayToolbar } from "./replay-toolbar";

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
  workflowId,
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
  const [runSnapshot, setRunSnapshot] = useState<WorkflowRunSnapshot | null>(null);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<"timeline" | "logs" | "history">("logs");
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogEntry[]>([]);
  const [activeRightTab, setActiveRightTab] = useState<"config" | "inspector">("config");
  const [historyList, setHistoryList] = useState<RunHistoryEntry[]>([]);
  const historyServiceRef = useRef<RunHistoryService>(new RunHistoryService());
  const [replayController, setReplayController] = useState<ReplayController | null>(null);
  const [, setReplayTick] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (replayController) {
        replayController.destroy();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [replayController]);

  // ── Engine Execution References ─────────────────────────────────────────────
  const activeRunIdRef = useRef<string | null>(null);
  const activeContextRef = useRef<ExecutionContext | null>(null);
  const registryRef = useRef<any>(null);
  const runnerRef = useRef<WorkflowRunner | null>(null);

  if (!registryRef.current) {
    registryRef.current = createDefaultExecutorRegistry();
  }

  // ── Derived Snapshots / Logs for Replay Debugger ────────────────────────────
  const activeSnapshot = replayController
    ? replayController.getReplayedSnapshot()
    : runSnapshot;

  const activeLogs = replayController
    ? replayController.getReplayedLogs()
    : executionLogs;

  const visualNodes = useMemo(() => {
    if (!activeSnapshot) return nodes;
    return nodes.map((node) => {
      const exec = activeSnapshot.nodeExecutions.find((e) => e.nodeId === node.id);
      return exec ? { ...node, runStatus: exec.status } : { ...node, runStatus: "idle" as const };
    });
  }, [nodes, activeSnapshot]);

  // Bridge function connecting NodeExecutor type to INodeExecutor execution logic
  const bridgeExecutor = useCallback(async (input: NodeExecutionInput) => {
    const executorInstance = registryRef.current.get(input.node.typeId);
    if (!executorInstance) {
      throw new Error(`No executor found for node type ${input.node.typeId}`);
    }

    const activeContext = activeContextRef.current;
    if (!activeContext) {
      throw new Error("No active execution context found");
    }

    // Set outputs on context from preceding runs to resolve variables/references
    activeContext.setNodeOutputs(input.node.id, input.inputs);

    const abortControl = { aborted: false };
    const result = await executorInstance.execute({
      node: input.node,
      context: activeContext,
      inputs: input.inputs,
      signal: abortControl,
      attempt: input.attempt,
    });

    if (!result.success) {
      const isRetryable = result.error?.retryable ?? false;
      throw new ExecutionError(
        result.error?.code ?? "EXECUTOR_FAILED",
        result.error?.message ?? "Node execution failed",
        { retryable: isRetryable }
      );
    }

    return result.outputs;
  }, []);

  if (!runnerRef.current) {
    runnerRef.current = new WorkflowRunner({
      executor: bridgeExecutor,
      executorRegistry: registryRef.current.asReadonly(),
    });
  }

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

  // ── Engine Execution Orchestration ──────────────────────────────────────────

  const handleRun = useCallback(async () => {
    // Clear any existing polling loop
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // 1. Parse workflow graph
    const parsedWf = parseWorkflowGraphFromCanvas(
      workflowId,
      workflowName,
      nodes,
      connections
    );

    // 2. Validate workflow graph
    const validation = validateWorkflowGraph(parsedWf);
    if (!validation.valid) {
      toast.error(`Validation failed: ${validation.errors[0].message}`);
      return;
    }

    // 3. Setup context & logger
    const runId = `run-${Date.now()}`;
    activeRunIdRef.current = runId;

    const logger = new InMemoryExecutionLogger();
    const context = new ExecutionContext({
      runId,
      workflow: parsedWf,
      initiatedBy: "user",
      trigger: {
        type: "manual",
        receivedAt: new Date().toISOString(),
        payload: {},
      },
      services: { logger },
    });
    activeContextRef.current = context;

    // 4. Initialize nodes to pending runStatus
    setRunSnapshot(null);
    setExecutionLogs([]);
    setIsBottomPanelOpen(true);
    setActiveRightTab("inspector");
    setNodes((prev) => prev.map((n) => ({ ...n, runStatus: "pending" })));
    setIsRunning(true);
    toast.success("Execution started");

    // 5. Setup live state updates polling loop
    pollIntervalRef.current = setInterval(() => {
      if (!runnerRef.current) return;
      const snapshot = runnerRef.current.getRun(runId);
      if (snapshot) {
        setRunSnapshot(snapshot);
        setExecutionLogs(logger.getEntries(runId));
        setNodes((prev) =>
          prev.map((node) => {
            const exec = snapshot.nodeExecutions.find((e: any) => e.nodeId === node.id);
            return exec ? { ...node, runStatus: exec.status } : node;
          })
        );
      }
    }, 100);

    try {
      // 6. Start runner execution
      if (!runnerRef.current) throw new Error("WorkflowRunner is not initialized");
      const finalSnapshot = await runnerRef.current.start({
        runId,
        workflow: parsedWf,
        initiatedBy: "user",
        trigger: {
          type: "manual",
          receivedAt: new Date().toISOString(),
          payload: {},
        },
      });

      // 7. Clear polling and apply final snapshots
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setRunSnapshot(finalSnapshot);
      const finalLogs = logger.getEntries(runId);
      setExecutionLogs(finalLogs);
      setNodes((prev) =>
        prev.map((node) => {
          const exec = finalSnapshot.nodeExecutions.find((e: any) => e.nodeId === node.id);
          return exec ? { ...node, runStatus: exec.status } : node;
        })
      );

      historyServiceRef.current.add(finalSnapshot, finalLogs);
      setHistoryList(historyServiceRef.current.getAll());

      if (finalSnapshot.run.status === "completed") {
        toast.success("Workflow completed successfully!");
      } else if (finalSnapshot.run.status === "cancelled") {
        toast.warning("Workflow execution stopped.");
      } else {
        toast.error(`Workflow execution failed: ${finalSnapshot.run.errorMessage}`);
      }
    } catch (err: any) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      let finalSnap = null;
      if (runnerRef.current) {
        finalSnap = runnerRef.current.getRun(runId);
        if (finalSnap) setRunSnapshot(finalSnap);
      }
      const finalLogs = logger.getEntries(runId);
      setExecutionLogs(finalLogs);
      if (finalSnap) {
        historyServiceRef.current.add(finalSnap, finalLogs);
        setHistoryList(historyServiceRef.current.getAll());
      }
      toast.error(`Workflow execution crashed: ${err.message}`);
    } finally {
      setIsRunning(false);
      activeContextRef.current = null;
      activeRunIdRef.current = null;
    }
  }, [workflowId, workflowName, nodes, connections, bridgeExecutor]);

  const handleStop = useCallback(async () => {
    const runId = activeRunIdRef.current;
    if (!runId) return;
    try {
      if (runnerRef.current) {
        await runnerRef.current.cancel(runId);
      }
    } catch (err: any) {
      toast.error(`Failed to stop execution: ${err.message}`);
    }
  }, []);

  const handleSelectHistoryRun = useCallback((entry: RunHistoryEntry) => {
    if (replayController) {
      replayController.destroy();
      setReplayController(null);
    }
    setRunSnapshot(entry.snapshot);
    setExecutionLogs(entry.logs);
    setNodes((prev) =>
      prev.map((node) => {
        const exec = entry.snapshot.nodeExecutions.find((e: any) => e.nodeId === node.id);
        return exec ? { ...node, runStatus: exec.status } : { ...node, runStatus: "idle" };
      })
    );
    // Switch to timeline view to let them inspect
    setActiveBottomTab("timeline");
    setIsBottomPanelOpen(true);
    setActiveRightTab("inspector");
  }, [replayController]);

  const handleEnterReplay = useCallback((entry: RunHistoryEntry) => {
    const controller = new ReplayController(entry.snapshot, entry.logs, () => {
      setReplayTick((t) => t + 1);
    });
    setReplayController(controller);
    setActiveBottomTab("timeline");
    setIsBottomPanelOpen(true);
    setActiveRightTab("inspector");
  }, []);

  const handleExitReplay = useCallback(() => {
    if (replayController) {
      replayController.destroy();
    }
    setReplayController(null);
  }, [replayController]);

  const handleSaveWorkflow = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: workflowId,
          name: workflowName,
          description: nodes.length > 0 ? `Custom workflow with ${nodes.length} nodes.` : "Custom AI workflow.",
          status: "active",
          nodeCount: nodes.length,
          runCount: 0,
          lastRun: new Date().toISOString(),
          tags: ["User-Created"],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Save failed");
      }
      toast.success("Workflow saved successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to save workflow: ${err.message}`);
      throw err;
    }
  }, [workflowId, workflowName, nodes]);

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
          onSave={handleSaveWorkflow}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        {/* Replay Debugger Controls */}
        {replayController && (
          <ReplayToolbar
            controller={replayController}
            onExitReplay={handleExitReplay}
          />
        )}

        {/* Main area: palette + canvas + properties */}
        <div className="flex flex-1 overflow-hidden">
          {/* Node palette */}
          <NodePalette
            onDragStart={handlePaletteDragStart}
            onDragEnd={handlePaletteDragEnd}
          />

          {/* Canvas and bottom panel container */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <Canvas
              nodes={visualNodes}
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

            {/* Bottom Collapsible Panel (Timeline / Logs) */}
            <div className="flex flex-col bg-sidebar border-t border-sidebar-border transition-all duration-200 select-none">
              {/* Header bar with tabs */}
              <div
                className="h-10 px-4 flex items-center justify-between hover:bg-sidebar-accent/50 cursor-pointer"
                onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
              >
                <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setActiveBottomTab("timeline");
                      setIsBottomPanelOpen(true);
                    }}
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer",
                      activeBottomTab === "timeline" && isBottomPanelOpen
                        ? "bg-brand-500/10 text-brand-500 border border-brand-500/20"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Timeline
                  </button>
                  <button
                    onClick={() => {
                      setActiveBottomTab("logs");
                      setIsBottomPanelOpen(true);
                    }}
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer",
                      activeBottomTab === "logs" && isBottomPanelOpen
                        ? "bg-brand-500/10 text-brand-500 border border-brand-500/20"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Execution Logs
                  </button>
                  <button
                    onClick={() => {
                      setActiveBottomTab("history");
                      setIsBottomPanelOpen(true);
                    }}
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5",
                      activeBottomTab === "history" && isBottomPanelOpen
                        ? "bg-brand-500/10 text-brand-500 border border-brand-500/20"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <History className="w-3.5 h-3.5" />
                    Run History ({historyList.length})
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {isBottomPanelOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Collapsible content */}
              {isBottomPanelOpen && (
                <div className="h-[200px] border-t border-sidebar-border overflow-hidden bg-sidebar flex flex-col">
                  {activeBottomTab === "timeline" ? (
                    <ExecutionTimeline snapshot={activeSnapshot} hideHeader={true} />
                  ) : activeBottomTab === "logs" ? (
                    <ExecutionLogsPanel logs={activeLogs} onClear={() => setExecutionLogs([])} />
                  ) : (
                    <RunHistoryPanel
                      history={historyList}
                      activeRunId={activeSnapshot?.run.id ?? null}
                      onSelect={handleSelectHistoryRun}
                      onReplay={handleEnterReplay}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Collapsible Panel (Config / Inspector) */}
          <AnimatePresence mode="wait">
            {(selectedNode || selectedNodeIds.length > 0 || activeSnapshot) && (
              <motion.aside
                key="right-panel"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                id="properties-panel"
                className={cn(
                  "w-[280px] shrink-0 flex flex-col",
                  "bg-sidebar border-l border-sidebar-border",
                  "overflow-hidden"
                )}
                aria-label="Node properties and inspector panel"
              >
                {/* Header with Close and Tabs */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 shrink-0 min-h-[44px]">
                  {activeSnapshot ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveRightTab("config")}
                        className={cn(
                          "text-xs font-semibold px-2 py-1 rounded transition-colors cursor-pointer",
                          activeRightTab === "config"
                            ? "bg-brand-500/10 text-brand-500 border border-brand-500/20"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Config
                      </button>
                      <button
                        onClick={() => setActiveRightTab("inspector")}
                        className={cn(
                          "text-xs font-semibold px-2 py-1 rounded transition-colors cursor-pointer",
                          activeRightTab === "inspector"
                            ? "bg-brand-500/10 text-brand-500 border border-brand-500/20"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Inspector
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">
                        Node Properties
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedNodeIds([])}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    aria-label="Close panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {activeSnapshot && activeRightTab === "inspector" ? (
                    <ExecutionInspectorPanel
                      selectedNodeId={lastSelectedId}
                      selectedNodeLabel={selectedNode ? selectedNode.label : null}
                      selectedNodeTypeId={selectedNode ? selectedNode.typeId : null}
                      snapshot={activeSnapshot}
                      onClose={() => setSelectedNodeIds([])}
                    />
                  ) : (
                    <PropertiesPanel
                      selectedNode={selectedNode}
                      selectionCount={selectedNodeIds.length}
                      onClose={() => setSelectedNodeIds([])}
                      onDeleteNode={handleDeleteNode}
                      onDuplicateNode={handleDuplicateNode}
                      onUpdateNode={handleUpdateNode}
                      hideHeader={true}
                    />
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
