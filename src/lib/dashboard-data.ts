// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Dashboard Mock Data
// Production-typed mock data for all dashboard widgets.
// Replace with real API calls when backend is ready.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Metric Types ─────────────────────────────────────────────────────────────

export type MetricTrend = "up" | "down" | "neutral";

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: MetricTrend;
  deltaLabel: string;
  /** Icon variant for the stat card icon */
  iconVariant: "default" | "brand" | "success" | "warning" | "destructive";
}

// ─── Activity Types ────────────────────────────────────────────────────────────

export type ActivityStatus = "completed" | "failed" | "running" | "pending";
export type ActivityType =
  | "workflow"
  | "agent"
  | "pipeline"
  | "error"
  | "import";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  status: ActivityStatus;
  actor: string;
}

// ─── Project Types ─────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "paused" | "draft" | "archived";

export interface RecentProject {
  id: string;
  name: string;
  status: ProjectStatus;
  /** ISO 8601 timestamp */
  lastUpdated: string;
  owner: string;
  workflows: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK_METRICS: DashboardMetric[] = [
  {
    id: "total_workflows",
    label: "Total Workflows",
    value: "142",
    delta: "+8",
    trend: "up",
    deltaLabel: "vs last week",
    iconVariant: "brand",
  },
  {
    id: "active_agents",
    label: "Active Agents",
    value: "38",
    delta: "+3",
    trend: "up",
    deltaLabel: "vs last week",
    iconVariant: "brand",
  },
  {
    id: "running_pipelines",
    label: "Running Pipelines",
    value: "12",
    delta: "-2",
    trend: "down",
    deltaLabel: "vs last hour",
    iconVariant: "default",
  },
  {
    id: "api_requests",
    label: "API Requests Today",
    value: "84.3K",
    delta: "+12.5%",
    trend: "up",
    deltaLabel: "vs yesterday",
    iconVariant: "brand",
  },
  {
    id: "success_rate",
    label: "Success Rate",
    value: "98.6%",
    delta: "+0.4%",
    trend: "up",
    deltaLabel: "vs last month",
    iconVariant: "success",
  },
  {
    id: "total_executions",
    label: "Total Executions",
    value: "2.4M",
    delta: "+340K",
    trend: "up",
    deltaLabel: "vs last month",
    iconVariant: "brand",
  },
];

/** Helper: milliseconds to ISO timestamp in the past */
function minsAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}
function hoursAgo(hours: number) {
  return minsAgo(hours * 60);
}
function daysAgo(days: number) {
  return hoursAgo(days * 24);
}

export const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "act-1",
    type: "workflow",
    title: "Data Processing Pipeline completed",
    description: "Processed 12,480 records in 3m 42s",
    timestamp: minsAgo(2),
    status: "completed",
    actor: "Automated",
  },
  {
    id: "act-2",
    type: "agent",
    title: "GPT-4 Summarizer deployed",
    description: "Agent deployed to production cluster",
    timestamp: minsAgo(18),
    status: "completed",
    actor: "Jane Smith",
  },
  {
    id: "act-3",
    type: "error",
    title: "Email Enrichment workflow failed",
    description: "API rate limit exceeded on third-party service",
    timestamp: minsAgo(45),
    status: "failed",
    actor: "Automated",
  },
  {
    id: "act-4",
    type: "pipeline",
    title: "CRM Sync pipeline running",
    description: "Syncing 4,200 contacts to Salesforce",
    timestamp: minsAgo(72),
    status: "running",
    actor: "Automated",
  },
  {
    id: "act-5",
    type: "import",
    title: "Project imported from GitHub",
    description: "lead-qualification-ai repository imported",
    timestamp: hoursAgo(4),
    status: "completed",
    actor: "Alex Johnson",
  },
  {
    id: "act-6",
    type: "workflow",
    title: "Invoice Processing workflow updated",
    description: "Added OCR extraction step with 94.2% accuracy",
    timestamp: hoursAgo(6),
    status: "completed",
    actor: "Sarah Williams",
  },
];

export const MOCK_PROJECTS: RecentProject[] = [
  {
    id: "proj-1",
    name: "Lead Qualification AI",
    status: "active",
    lastUpdated: hoursAgo(2),
    owner: "Alex Johnson",
    workflows: 8,
  },
  {
    id: "proj-2",
    name: "Invoice Processing Suite",
    status: "active",
    lastUpdated: hoursAgo(5),
    owner: "Sarah Williams",
    workflows: 5,
  },
  {
    id: "proj-3",
    name: "Customer Support Agents",
    status: "paused",
    lastUpdated: hoursAgo(24),
    owner: "Mike Chen",
    workflows: 12,
  },
  {
    id: "proj-4",
    name: "Data Enrichment Pipeline",
    status: "draft",
    lastUpdated: daysAgo(2),
    owner: "Jane Smith",
    workflows: 3,
  },
  {
    id: "proj-5",
    name: "Email Marketing Automation",
    status: "archived",
    lastUpdated: daysAgo(7),
    owner: "Alex Johnson",
    workflows: 6,
  },
];

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Human-readable relative time from an ISO 8601 string */
export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
