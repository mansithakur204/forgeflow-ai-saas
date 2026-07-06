// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Builder Mock Data
// Production-typed mock data for workflows and canvas nodes.
// Replace with real API calls when backend is ready.
// ─────────────────────────────────────────────────────────────────────────────

import type { LucideIcon } from "lucide-react";
import {
  Zap,
  Bot,
  Filter,
  Globe,
  GitBranch,
  Send,
  Cpu,
  Database,
  Mail,
  MessageSquare,
  Webhook,
  Clock,
} from "lucide-react";

// ─── Workflow List Types ───────────────────────────────────────────────────────

export type WorkflowStatus = "active" | "paused" | "draft" | "error" | "archived";

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  nodeCount: number;
  runCount: number;
  lastRun: string | null;
  createdAt: string;
  tags: string[];
}

// ─── Canvas Node Types ─────────────────────────────────────────────────────────

export type NodeCategory = "trigger" | "ai" | "logic" | "io";

export type NodeTypeId =
  | "trigger_webhook"
  | "trigger_schedule"
  | "trigger_manual"
  | "ai_llm"
  | "ai_classifier"
  | "logic_filter"
  | "logic_condition"
  | "logic_transform"
  | "io_http"
  | "io_database"
  | "io_email"
  | "io_slack";

export interface NodeTypeDefinition {
  typeId: NodeTypeId;
  label: string;
  description: string;
  category: NodeCategory;
  icon: LucideIcon;
  /** Tailwind color token class prefix — used for accent/border/icon */
  accentColor: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  defaultConfig: Record<string, unknown>;
}

export interface PortDefinition {
  id: string;
  label: string;
  /** Whether multiple connections are allowed */
  multiple?: boolean;
}

// ─── Canvas State Types ────────────────────────────────────────────────────────

export interface CanvasNode {
  id: string;
  typeId: NodeTypeId;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  /** Runtime status (only meaningful when workflow is running) */
  runStatus?: "idle" | "running" | "done" | "error";
}

export interface NodeConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

// ─── Node Type Catalog ─────────────────────────────────────────────────────────

export const NODE_TYPE_CATALOG: NodeTypeDefinition[] = [
  // ── Triggers ──────────────────────────────────────────
  {
    typeId: "trigger_webhook",
    label: "Webhook",
    description: "Start on incoming HTTP request",
    category: "trigger",
    icon: Webhook,
    accentColor: "brand",
    inputs: [],
    outputs: [{ id: "out", label: "Payload" }],
    defaultConfig: { method: "POST", path: "/webhook" },
  },
  {
    typeId: "trigger_schedule",
    label: "Schedule",
    description: "Run on a cron schedule",
    category: "trigger",
    icon: Clock,
    accentColor: "brand",
    inputs: [],
    outputs: [{ id: "out", label: "Trigger" }],
    defaultConfig: { cron: "0 9 * * 1-5", timezone: "UTC" },
  },
  {
    typeId: "trigger_manual",
    label: "Manual Trigger",
    description: "Run manually or via API",
    category: "trigger",
    icon: Zap,
    accentColor: "brand",
    inputs: [],
    outputs: [{ id: "out", label: "Trigger" }],
    defaultConfig: {},
  },

  // ── AI ────────────────────────────────────────────────
  {
    typeId: "ai_llm",
    label: "LLM Prompt",
    description: "Send a prompt to GPT-4, Claude, or Gemini",
    category: "ai",
    icon: Bot,
    accentColor: "violet",
    inputs: [{ id: "in", label: "Input" }],
    outputs: [{ id: "out", label: "Response" }, { id: "tokens", label: "Token Usage" }],
    defaultConfig: { model: "gpt-4o", temperature: 0.7, maxTokens: 1024 },
  },
  {
    typeId: "ai_classifier",
    label: "Classifier",
    description: "Classify text into predefined categories",
    category: "ai",
    icon: Cpu,
    accentColor: "violet",
    inputs: [{ id: "in", label: "Text" }],
    outputs: [{ id: "out", label: "Category" }, { id: "score", label: "Confidence" }],
    defaultConfig: { model: "gpt-4o-mini", categories: ["positive", "negative", "neutral"] },
  },

  // ── Logic ─────────────────────────────────────────────
  {
    typeId: "logic_filter",
    label: "Filter",
    description: "Pass records matching a condition",
    category: "logic",
    icon: Filter,
    accentColor: "warning",
    inputs: [{ id: "in", label: "Records", multiple: true }],
    outputs: [{ id: "pass", label: "Matches" }, { id: "fail", label: "Rejected" }],
    defaultConfig: { field: "", operator: "equals", value: "" },
  },
  {
    typeId: "logic_condition",
    label: "Condition",
    description: "Branch on true / false logic",
    category: "logic",
    icon: GitBranch,
    accentColor: "warning",
    inputs: [{ id: "in", label: "Input" }],
    outputs: [{ id: "true", label: "True" }, { id: "false", label: "False" }],
    defaultConfig: { expression: "" },
  },
  {
    typeId: "logic_transform",
    label: "Transform",
    description: "Map, reshape, or compute new fields",
    category: "logic",
    icon: GitBranch,
    accentColor: "warning",
    inputs: [{ id: "in", label: "Input" }],
    outputs: [{ id: "out", label: "Output" }],
    defaultConfig: { mappings: [] },
  },

  // ── I/O ──────────────────────────────────────────────
  {
    typeId: "io_http",
    label: "HTTP Request",
    description: "Call any REST API endpoint",
    category: "io",
    icon: Globe,
    accentColor: "info",
    inputs: [{ id: "in", label: "Trigger" }],
    outputs: [{ id: "out", label: "Response" }, { id: "err", label: "Error" }],
    defaultConfig: { method: "GET", url: "", headers: {} },
  },
  {
    typeId: "io_database",
    label: "Database",
    description: "Query or write to a database",
    category: "io",
    icon: Database,
    accentColor: "info",
    inputs: [{ id: "in", label: "Input" }],
    outputs: [{ id: "out", label: "Result" }],
    defaultConfig: { operation: "select", table: "", query: "" },
  },
  {
    typeId: "io_email",
    label: "Send Email",
    description: "Send transactional emails",
    category: "io",
    icon: Mail,
    accentColor: "success",
    inputs: [{ id: "in", label: "Trigger" }],
    outputs: [{ id: "out", label: "Sent" }],
    defaultConfig: { to: "", subject: "", body: "" },
  },
  {
    typeId: "io_slack",
    label: "Slack Message",
    description: "Post a message to a Slack channel",
    category: "io",
    icon: MessageSquare,
    accentColor: "success",
    inputs: [{ id: "in", label: "Trigger" }],
    outputs: [{ id: "out", label: "Sent" }],
    defaultConfig: { channel: "#general", text: "" },
  },
];

/** Lookup a node type definition by typeId */
export function getNodeType(typeId: NodeTypeId): NodeTypeDefinition {
  const def = NODE_TYPE_CATALOG.find((n) => n.typeId === typeId);
  if (!def) throw new Error(`Unknown node type: ${typeId}`);
  return def;
}

/** Group node types by category */
export const NODE_TYPES_BY_CATEGORY = NODE_TYPE_CATALOG.reduce<
  Record<NodeCategory, NodeTypeDefinition[]>
>(
  (acc, def) => {
    acc[def.category].push(def);
    return acc;
  },
  { trigger: [], ai: [], logic: [], io: [] }
);

// ─── Mock Workflows List ───────────────────────────────────────────────────────

function minsAgo(m: number) {
  return new Date(Date.now() - m * 60 * 1000).toISOString();
}
function hoursAgo(h: number) { return minsAgo(h * 60); }
function daysAgo(d: number) { return hoursAgo(d * 24); }

export const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: "wf-demo",
    name: "Lead Qualification AI",
    description: "Ingests inbound leads, classifies intent via GPT-4o, and routes to Salesforce or Slack.",
    status: "active",
    nodeCount: 6,
    runCount: 1482,
    lastRun: minsAgo(4),
    createdAt: daysAgo(14),
    tags: ["CRM", "AI", "Sales"],
  },
  {
    id: "wf-002",
    name: "Invoice Processing Suite",
    description: "OCR extraction → validation → ERP sync pipeline for incoming vendor invoices.",
    status: "active",
    nodeCount: 8,
    runCount: 340,
    lastRun: hoursAgo(1),
    createdAt: daysAgo(30),
    tags: ["Finance", "OCR", "ERP"],
  },
  {
    id: "wf-003",
    name: "Customer Support Triage",
    description: "Classifies incoming support tickets and routes to the right Slack channel.",
    status: "paused",
    nodeCount: 5,
    runCount: 2910,
    lastRun: hoursAgo(48),
    createdAt: daysAgo(60),
    tags: ["Support", "AI"],
  },
  {
    id: "wf-004",
    name: "Daily Reporting Bot",
    description: "Runs every morning at 9 AM, aggregates KPIs, and sends a digest email.",
    status: "active",
    nodeCount: 4,
    runCount: 42,
    lastRun: hoursAgo(14),
    createdAt: daysAgo(7),
    tags: ["Reporting", "Schedule"],
  },
  {
    id: "wf-005",
    name: "GitHub PR Reviewer",
    description: "Webhook-triggered GPT-4o code review posted as a pull-request comment.",
    status: "draft",
    nodeCount: 3,
    runCount: 0,
    lastRun: null,
    createdAt: daysAgo(2),
    tags: ["Dev", "AI", "GitHub"],
  },
  {
    id: "wf-006",
    name: "Data Enrichment Pipeline",
    description: "Enriches contact records with Clearbit, then syncs to HubSpot.",
    status: "error",
    nodeCount: 7,
    runCount: 156,
    lastRun: hoursAgo(3),
    createdAt: daysAgo(21),
    tags: ["CRM", "Enrichment"],
  },
];

// ─── Demo Workflow Canvas State ────────────────────────────────────────────────

export const MOCK_WORKFLOW_NODES: CanvasNode[] = [
  {
    id: "node-1",
    typeId: "trigger_webhook",
    label: "Inbound Lead",
    position: { x: 80, y: 200 },
    config: { method: "POST", path: "/leads" },
    runStatus: "done",
  },
  {
    id: "node-2",
    typeId: "logic_transform",
    label: "Normalize Data",
    position: { x: 320, y: 200 },
    config: { mappings: ["email", "name", "company"] },
    runStatus: "done",
  },
  {
    id: "node-3",
    typeId: "ai_classifier",
    label: "Intent Classifier",
    position: { x: 560, y: 200 },
    config: { model: "gpt-4o-mini", categories: ["hot", "warm", "cold"] },
    runStatus: "running",
  },
  {
    id: "node-4",
    typeId: "logic_condition",
    label: "Hot Lead?",
    position: { x: 800, y: 200 },
    config: { expression: "category === 'hot'" },
    runStatus: "idle",
  },
  {
    id: "node-5",
    typeId: "io_slack",
    label: "Notify Sales Team",
    position: { x: 1040, y: 110 },
    config: { channel: "#hot-leads", text: "New hot lead: {{name}}" },
    runStatus: "idle",
  },
  {
    id: "node-6",
    typeId: "io_http",
    label: "Add to Salesforce",
    position: { x: 1040, y: 310 },
    config: { method: "POST", url: "https://api.salesforce.com/leads" },
    runStatus: "idle",
  },
];

export const MOCK_CONNECTIONS: NodeConnection[] = [
  { id: "conn-1", fromNodeId: "node-1", fromPortId: "out", toNodeId: "node-2", toPortId: "in" },
  { id: "conn-2", fromNodeId: "node-2", fromPortId: "out", toNodeId: "node-3", toPortId: "in" },
  { id: "conn-3", fromNodeId: "node-3", fromPortId: "out", toNodeId: "node-4", toPortId: "in" },
  { id: "conn-4", fromNodeId: "node-4", fromPortId: "true", toNodeId: "node-5", toPortId: "in" },
  { id: "conn-5", fromNodeId: "node-4", fromPortId: "false", toNodeId: "node-6", toPortId: "in" },
];

// ─── Utility ───────────────────────────────────────────────────────────────────

/** Human-readable relative time */
export function formatWorkflowTime(isoString: string | null): string {
  if (!isoString) return "Never";
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Accent color → Tailwind class map for node type accents */
export const ACCENT_CLASSES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  brand:  { bg: "bg-brand-500/10",   border: "border-brand-500/30",   text: "text-brand-500",   icon: "text-brand-500"   },
  violet: { bg: "bg-violet-500/10",  border: "border-violet-500/30",  text: "text-violet-500",  icon: "text-violet-500"  },
  warning:{ bg: "bg-warning/10",     border: "border-warning/30",     text: "text-warning",     icon: "text-warning"     },
  info:   { bg: "bg-info/10",        border: "border-info/30",        text: "text-info",        icon: "text-info"        },
  success:{ bg: "bg-success/10",     border: "border-success/30",     text: "text-success",     icon: "text-success"     },
};
