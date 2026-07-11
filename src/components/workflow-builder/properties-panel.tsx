"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  type CanvasNode,
  getNodeType,
  ACCENT_CLASSES,
} from "@/lib/workflow-data";
import {
  X,
  ChevronDown,
  ChevronUp,
  Settings,
  Copy,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Properties Panel
// Right-side inspector for the currently selected node.
// ─────────────────────────────────────────────────────────────────────────────

interface PropertiesPanelProps {
  selectedNode: CanvasNode | null;
  selectionCount?: number;
  onClose: () => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onUpdateNode: (nodeId: string, updates: Partial<CanvasNode>) => void;
  hideHeader?: boolean;
}

// ── Collapsible section ──────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {title}
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Config field ─────────────────────────────────────────────────────────────

function ConfigField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (val: string) => void;
}) {
  const strVal = typeof value === "string" ? value : JSON.stringify(value);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-muted-foreground capitalize">
        {label.replace(/_/g, " ")}
      </label>
      <input
        type="text"
        defaultValue={strVal}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full px-2.5 py-1.5 rounded-md text-xs bg-surface-2 border border-border/60",
          "text-foreground placeholder:text-muted-foreground/50",
          "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring/60",
          "transition-all duration-100"
        )}
      />
    </div>
  );
}

// ── Run status badge ─────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  idle:    { label: "Idle",    cls: "bg-muted text-muted-foreground" },
  running: { label: "Running", cls: "bg-brand-500/15 text-brand-500 animate-pulse" },
  done:    { label: "Done",    cls: "bg-success/15 text-success" },
  error:   { label: "Error",   cls: "bg-destructive/15 text-destructive" },
};

// ── Panel ────────────────────────────────────────────────────────────────────

export function PropertiesPanel({
  selectedNode,
  selectionCount = 0,
  onClose,
  onDeleteNode,
  onDuplicateNode,
  onUpdateNode,
  hideHeader = false,
}: PropertiesPanelProps) {
  const nodeDef = selectedNode ? getNodeType(selectedNode.typeId) : null;
  const accent = nodeDef ? (ACCENT_CLASSES[nodeDef.accentColor] ?? ACCENT_CLASSES.brand) : null;
  const runStatus = selectedNode?.runStatus ?? "idle";
  const statusBadge = STATUS_BADGE[runStatus] ?? STATUS_BADGE.idle;

  const handleConfigChange = useCallback(
    (key: string, val: string) => {
      if (!selectedNode) return;
      onUpdateNode(selectedNode.id, {
        config: { ...selectedNode.config, [key]: val },
      });
    },
    [selectedNode, onUpdateNode]
  );

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedNode) return;
      onUpdateNode(selectedNode.id, { label: e.target.value });
    },
    [selectedNode, onUpdateNode]
  );

  const content = (
    <div className="flex-1 flex flex-col overflow-hidden bg-sidebar">

        {/* ── Multi-select banner ─────────────────────────────────────────── */}
        {!selectedNode && selectionCount > 1 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-6">
            <div
              className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center"
              aria-hidden="true"
            >
              <Settings className="w-5 h-5 text-brand-500/70" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {selectionCount} nodes selected
            </p>
            <p className="text-xs text-muted-foreground/50">
              Press Delete to remove all.
              Press Ctrl+D to duplicate the last selected.
            </p>
          </div>
        )}

        {/* ── No selection state ─────────────────────────────────────────── */}
        {!selectedNode && selectionCount <= 1 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-6">
            <div
              className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
              aria-hidden="true"
            >
              <Settings className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground/50">
              Nothing selected
            </p>
            <p className="text-xs text-muted-foreground/40">
              Click a node on the canvas to inspect and configure it.
            </p>
          </div>
        )}

        {/* ── Node details ─────────────────────────────────────────────── */}
        {selectedNode && nodeDef && accent && (
          <div className="flex-1 overflow-y-auto">

            {/* Node type badge */}
            <div className="px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0",
                    accent.bg,
                    accent.border
                  )}
                  aria-hidden="true"
                >
                  <nodeDef.icon className={cn("w-4 h-4", accent.icon)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">
                    {nodeDef.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {nodeDef.description}
                  </p>
                </div>
                {/* Status badge */}
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0",
                    statusBadge.cls
                  )}
                >
                  {statusBadge.label}
                </span>
              </div>
            </div>

            {/* ── General section ──────────────────────────────────────── */}
            <Section title="General">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="node-label-input"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Label
                  </label>
                  <input
                    id="node-label-input"
                    type="text"
                    value={selectedNode.label}
                    onChange={handleLabelChange}
                    className={cn(
                      "w-full px-2.5 py-1.5 rounded-md text-xs bg-surface-2 border border-border/60",
                      "text-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring/60",
                      "transition-all duration-100"
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Node ID</p>
                  <p className="text-[10px] font-mono text-muted-foreground/50 bg-surface-2 px-2 py-1.5 rounded-md border border-border/40">
                    {selectedNode.id}
                  </p>
                </div>
              </div>
            </Section>

            {/* ── Configuration section ─────────────────────────────────── */}
            {Object.keys(selectedNode.config).length > 0 && (
              <Section title="Configuration">
                <div className="flex flex-col gap-3">
                  {Object.entries(selectedNode.config).map(([key, val]) => (
                    <ConfigField
                      key={key}
                      label={key}
                      value={val}
                      onChange={(v) => handleConfigChange(key, v)}
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* ── Ports section ─────────────────────────────────────────── */}
            <Section title="Ports" defaultOpen={false}>
              <div className="flex flex-col gap-3">
                {nodeDef.inputs.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 mb-1.5">Inputs</p>
                    {nodeDef.inputs.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 py-1">
                        <span className="w-2 h-2 rounded-full bg-info/60 shrink-0" />
                        <span className="text-xs text-foreground">{p.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {nodeDef.outputs.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 mb-1.5">Outputs</p>
                    {nodeDef.outputs.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 py-1">
                        <span className="w-2 h-2 rounded-full bg-brand-500/60 shrink-0" />
                        <span className="text-xs text-foreground">{p.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>

          </div>
        )}

        {/* ── Node actions ──────────────────────────────────────────────── */}
        {selectedNode && (
          <div className="px-4 py-3 border-t border-border/40 shrink-0 flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              className="gap-1.5 flex-1"
              onClick={() => onDuplicateNode(selectedNode.id)}
            >
              <Copy className="w-3 h-3" aria-hidden="true" />
              Duplicate
            </Button>
            <Button
              variant="destructive"
              size="xs"
              className="gap-1.5 flex-1"
              onClick={() => onDeleteNode(selectedNode.id)}
            >
              <Trash2 className="w-3 h-3" aria-hidden="true" />
              Delete
            </Button>
          </div>
        )}
      </div>
  );

  if (hideHeader) {
    return content;
  }

  return (
    <AnimatePresence>
      <motion.aside
        key={selectedNode?.id ?? "empty"}
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
        aria-label="Node properties panel"
      >
        {/* ── Panel header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-semibold text-foreground">
              {selectedNode ? "Node Properties" : "Properties"}
            </span>
          </div>
          {selectedNode && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close properties panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {content}
      </motion.aside>
    </AnimatePresence>
  );
}
