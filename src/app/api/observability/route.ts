// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Observability API Route
// GET /api/observability
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get("workflowId") || undefined;
  const agentId = searchParams.get("agentId") || undefined;
  const provider = searchParams.get("provider") || undefined;
  const status = searchParams.get("status") || undefined;

  // Retrieve metrics from analytics service
  const analytics = forgeFlowService.analyticsService.getAggregatedAnalytics(workflowId, agentId);
  const dailyCost = forgeFlowService.analyticsService.getDailyCost();
  const monthlyCost = forgeFlowService.analyticsService.getMonthlyCost();

  // Expose execution inspector details for a specific run if requested
  const inspectId = searchParams.get("inspectId");
  let inspectorDetails = null;
  if (inspectId) {
    inspectorDetails = forgeFlowService.analyticsService.getExecutionInspectorDetails(inspectId);
  }

  // Active agents & active executions
  const registeredAgents = forgeFlowService.agentRegistry.list().length;
  const wfStats = forgeFlowService.executionHistory.getWorkflowRunStats();
  const queueLength = wfStats.running; 

  // Get raw records for charts/lists
  const rawMetrics = (forgeFlowService.analyticsService as any).metrics || [];
  const rawUsages = (forgeFlowService.analyticsService as any).tokenUsages || [];
  const rawCosts = (forgeFlowService.analyticsService as any).costRecords || [];
  const rawLatencies = (forgeFlowService.analyticsService as any).latencies || [];

  // Generate agent analytics table rows (Task 4)
  const agentsList = forgeFlowService.agentRegistry.list().map((agent) => {
    const aid = agent.getConfig().id;
    const aName = agent.getConfig().metadata.name;
    const agentStats = forgeFlowService.analyticsService.getAggregatedAnalytics(undefined, aid);
    const agentMetricsList = rawMetrics.filter((m: any) => m.agentId === aid);
    const retryCount = agentMetricsList.reduce((sum: number, m: any) => sum + m.retryCount, 0);

    return {
      agentId: aid,
      agentName: aName,
      executions: agentMetricsList.length,
      averageLatency: agentStats.averageLatency,
      averageTokens: agentStats.averageTokens,
      averageCost: agentStats.averageCost,
      successRate: agentStats.successRate,
      failureRate: agentStats.failureRate,
      retries: retryCount,
    };
  });

  return NextResponse.json({
    overview: {
      activeAgents: registeredAgents,
      runningWorkflows: queueLength,
      successRate: analytics.successRate,
      failureRate: analytics.failureRate,
      totalExecutions: rawMetrics.length,
      queueLength,
      averageLatency: analytics.averageLatency,
      dailyCost,
      monthlyCost,
      totalTokens: rawUsages.reduce((sum: number, u: any) => sum + u.usage.totalTokens, 0),
    },
    agentsAnalytics: agentsList,
    rawMetrics,
    rawUsages,
    rawCosts,
    rawLatencies,
    inspectorDetails,
  });
}

export const dynamic = "force-dynamic";
