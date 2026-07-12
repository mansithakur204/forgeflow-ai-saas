import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";

export async function GET() {
  const memoryStats = await forgeFlowService.memorySystem.getStats();
  const docCount = (await forgeFlowService.docRepository.list()).length;
  const chunkCount = forgeFlowService.chunkRepository.getAll().length;
  const vectorCount = (await forgeFlowService.vectorStore.statistics()).totalRecords;
  const registeredAgents = forgeFlowService.agentRegistry.list().length;
  const registeredTools = forgeFlowService.toolRegistry.list().length;

  return NextResponse.json({
    knowledge: {
      documents: docCount,
      indexedChunks: chunkCount,
      embeddings: vectorCount,
      retrievalCount: forgeFlowService.retrievalCount,
    },
    agents: {
      registeredAgents,
      activeSessions: 1,
      runningWorkflows: 0,
      activeExecutions: forgeFlowService.toolCoordinator.getMetrics().activeExecutions,
    },
    tools: {
      registeredTools,
      runningExecutions: forgeFlowService.toolCoordinator.getMetrics().activeExecutions,
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
      queueStatus: "idle",
      healthStatus: "healthy",
    },
  });
}
export const dynamic = "force-dynamic";
