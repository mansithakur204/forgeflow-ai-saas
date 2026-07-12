// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Dashboard API Route
// GET /api/dashboard
// Aggregates live metrics from all subsystems:
//   - Knowledge Engine (docs, chunks, embeddings, retrievals)
//   - Agent Runtime (registered agents, tools, active executions)
//   - Memory Subsystem (entry counts by type)
//   - Execution History (workflow runs, agent runs, success rates, trends)
//   - Activity Log (recent 20 events, newest first)
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";

export async function GET() {
  const memoryStats = await forgeFlowService.memorySystem.getStats();
  const docCount = (await forgeFlowService.docRepository.list()).length;
  const chunkCount = forgeFlowService.chunkRepository.getAll().length;
  const vectorCount = (await forgeFlowService.vectorStore.statistics()).totalRecords;
  const registeredAgents = forgeFlowService.agentRegistry.list().length;
  const registeredTools = forgeFlowService.toolRegistry.list().length;
  const activeExecutions = forgeFlowService.toolCoordinator.getMetrics().activeExecutions;

  // ─── Execution Stats ─────────────────────────────────────────────────────
  const wfStats = forgeFlowService.executionHistory.getWorkflowRunStats();
  const agStats = forgeFlowService.executionHistory.getAgentRunStats();

  const totalRuns = wfStats.total + agStats.total;
  const totalCompleted = wfStats.completed + agStats.completed;
  const totalFailed = wfStats.failed + agStats.failed;
  const overallSuccessRate =
    totalCompleted + totalFailed > 0
      ? Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100)
      : 100; // default 100% when no runs yet

  const avgDurationSec =
    wfStats.avgDurationMs > 0
      ? parseFloat((wfStats.avgDurationMs / 1000).toFixed(1))
      : 0;

  // ─── Activity Log ─────────────────────────────────────────────────────────
  const recentActivity = forgeFlowService.executionHistory.getActivity(20);

  // ─── Daily Trend (last 7 days) ────────────────────────────────────────────
  const dailyTrend = forgeFlowService.executionHistory.getDailyRunTrend(7);

  return NextResponse.json({
    knowledge: {
      documents: docCount,
      indexedChunks: chunkCount,
      embeddings: vectorCount,
      retrievalCount: forgeFlowService.retrievalCount,
    },
    agents: {
      registeredAgents,
      activeSessions: activeExecutions > 0 ? 1 : 0,
      runningWorkflows: wfStats.running,
      activeExecutions,
    },
    tools: {
      registeredTools,
      runningExecutions: activeExecutions,
    },
    memory: {
      workingMemory: memoryStats.entriesByType["working"] || 0,
      longTermMemory: memoryStats.entriesByType["long-term"] || 0,
      semanticMemory: memoryStats.entriesByType["semantic"] || 0,
      episodicMemory: memoryStats.entriesByType["episodic"] || 0,
    },
    system: {
      buildVersion: "1.0.0",
      runtimeStatus: "active",
      queueStatus: wfStats.running > 0 ? "running" : "idle",
      healthStatus: "healthy",
    },
    workflows: {
      total: forgeFlowService.workflows.length,
      totalRuns: wfStats.total,
      running: wfStats.running,
      successRate: wfStats.total > 0 ? wfStats.successRate : 100,
      avgDurationSec: wfStats.avgDurationMs > 0 ? parseFloat((wfStats.avgDurationMs / 1000).toFixed(1)) : 0,
    },
    executions: {
      totalRuns,
      totalCompleted,
      totalFailed,
      overallSuccessRate,
      avgDurationSec,
      agentRuns: agStats.total,
      workflowRuns: wfStats.total,
    },
    activity: recentActivity,
    trends: {
      daily: dailyTrend,
    },
  });
}

export const dynamic = "force-dynamic";
