import type {
  AgentExecutionMetrics,
  DetailedTokenUsage,
  CostRecord,
  LatencyMetrics,
} from "@/agents";

export interface DashboardFilters {
  workflowId: string;
  agentId: string;
  provider: string;
  status: string;
  dateRange: string; // "24h" | "7d" | "30d" | "all"
}

export interface OverviewMetrics {
  activeAgents: number;
  runningWorkflows: number;
  successRate: number;
  failureRate: number;
  totalExecutions: number;
  queueLength: number;
  averageLatency: number;
  dailyCost: number;
  monthlyCost: number;
  totalTokens: number;
}

export interface AgentRowData {
  agentId: string;
  agentName: string;
  executions: number;
  averageLatency: number;
  averageTokens: number;
  averageCost: number;
  successRate: number;
  failureRate: number;
  retries: number;
}

export interface DashboardData {
  overview: OverviewMetrics;
  agentsAnalytics: AgentRowData[];
  rawMetrics: AgentExecutionMetrics[];
  rawUsages: DetailedTokenUsage[];
  rawCosts: CostRecord[];
  rawLatencies: (LatencyMetrics & { workflowId: string; agentId: string; timestamp: string })[];
  inspectorDetails: any | null;
}
