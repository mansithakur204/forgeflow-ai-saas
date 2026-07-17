// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Observability & Analytics Test Script
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAgent } from "../src/agents/runtime/base-agent";
import { AgentRegistry } from "../src/agents/runtime/agent-registry";
import { AgentRuntimeCoordinator } from "../src/agents/runtime/agent-runtime-coordinator";
import { MultiAgentOrchestrator } from "../src/agents/runtime/orchestration/multi-agent-orchestrator";
import { AgentAnalyticsService } from "../src/agents/observability/services/analytics-service";
import { CostEstimator } from "../src/agents/observability/cost/cost-estimator";
import type { AgentSession } from "../src/agents/types/session";
import type { AgentStatus } from "../src/agents/types/agent";

// Define Mock Agents to avoid circular dependency module loads
class MockAgent extends BaseAgent {
  constructor(id: string, name: string, private mockResponse: string) {
    super({
      id,
      metadata: { id, name, description: `Mock agent for ${name}`, version: "1.0.0", author: "ForgeFlow" },
      capabilities: { canPlan: true, canExecute: true, canSearchCode: true, canEditCode: true, canAccessMemory: true, canUseTools: true },
      role: "executor",
    });
  }

  async executeStep(
    session: AgentSession,
    input: string
  ): Promise<{ output: string; newStatus?: AgentStatus; metadata?: Record<string, unknown> }> {
    return { output: this.mockResponse, newStatus: "completed" };
  }
}

async function runTests() {
  console.log("=== ForgeFlow AI Observability & Analytics Tests ===\n");

  // Set up mock timeline logger array to capture telemetry events
  const telemetryEvents: string[] = [];
  const mockLogger = {
    info: (msg: string, metadata?: any) => {
      console.log(`[INFO] ${msg}`, metadata || "");
      if (metadata && metadata.event) {
        telemetryEvents.push(metadata.event);
      }
    },
    warn: (msg: string, metadata?: any) => {
      console.log(`[WARN] ${msg}`, metadata || "");
      if (metadata && metadata.event) {
        telemetryEvents.push(metadata.event);
      }
    },
    error: (msg: string, metadata?: any) => {
      console.log(`[ERROR] ${msg}`, metadata || "");
      if (metadata && metadata.event) {
        telemetryEvents.push(metadata.event);
      }
    },
  };

  // Initialize Core Services
  const registry = new AgentRegistry();
  const coordinator = new AgentRuntimeCoordinator(registry);
  const analyticsService = new AgentAnalyticsService(mockLogger);
  const orchestrator = new MultiAgentOrchestrator(
    registry,
    coordinator,
    { parallelExecutionEnabled: false },
    undefined,
    undefined,
    analyticsService
  );

  // Register agents
  const planner = new MockAgent("planner-agent", "Planner Agent", JSON.stringify({ toolId: "io_http", config: { method: "GET" } }));
  const research = new MockAgent("research-agent", "Research Agent", "Research insights");
  const tool = new MockAgent("tool-agent", "Tool Agent", "Tool execution complete");
  const memory = new MockAgent("memory-agent", "Memory Agent", "Saved successfully");
  const reviewer = new MockAgent("reviewer-agent", "Reviewer Agent", "Approved output");

  registry.register(planner);
  registry.register(research);
  registry.register(tool);
  registry.register(memory);
  registry.register(reviewer);

  // --- Test Case 1: Cost Estimator verification ---
  console.log("--- 1. Cost Estimator Tests ---");
  const openaiCost = CostEstimator.estimate("openai", 1000000, 1000000);
  const geminiCost = CostEstimator.estimate("gemini", 1000000, 1000000);
  const anthropicCost = CostEstimator.estimate("anthropic", 1000000, 1000000);
  const localCost = CostEstimator.estimate("local", 1000000, 1000000);
  
  console.log(`OpenAI 1M Input + 1M Output Cost: $${openaiCost} (Expected: $12.50)`);
  console.log(`Gemini 1M Input + 1M Output Cost: $${geminiCost} (Expected: $6.25)`);
  console.log(`Anthropic 1M Input + 1M Output Cost: $${anthropicCost} (Expected: $18.00)`);
  console.log(`Local 1M Input + 1M Output Cost: $${localCost} (Expected: $0.00)`);

  if (openaiCost !== 12.5 || geminiCost !== 6.25 || anthropicCost !== 18 || localCost !== 0) {
    throw new Error("Cost Estimator rates calculations mismatch!");
  }
  console.log("Cost Estimator checks passed.\n");

  // --- Test Case 2: Run Orchestration and check telemetry ---
  console.log("--- 2. Orchestration Metrics Execution ---");
  
  const result = await orchestrator.start("Call httpbin endpoint to fetch resource", mockLogger, "correlation-obs-1");
  console.log(`Orchestration finished. Success: ${result.success}`);

  // Check telemetry events captured
  console.log("\nCaptured Telemetry Event Types:");
  console.log(telemetryEvents);

  const requiredTelemetry = [
    "QUEUE_WAITING",
    "QUEUE_FINISHED",
    "AGENT_STARTED",
    "PROVIDER_CALLED",
    "PROVIDER_RETURNED",
    "TOKEN_USAGE_UPDATED",
    "COST_UPDATED",
    "LATENCY_UPDATED",
    "MEMORY_RETRIEVED",
    "KNOWLEDGE_RETRIEVED",
    "AGENT_COMPLETED",
    "WORKFLOW_COMPLETED"
  ];

  for (const event of requiredTelemetry) {
    if (!telemetryEvents.includes(event)) {
      console.error(`Missing telemetry event: ${event}`);
      throw new Error(`Observability validation failed: Missing event type ${event}`);
    }
  }
  console.log("All expected telemetry events successfully emitted!\n");

  // --- Test Case 3: Execution Inspector Details ---
  console.log("--- 3. Execution Inspector Verification ---");
  const inspector = orchestrator.getExecutionInspectorDetails(result.orchestrationId);
  console.log("Exposed Inspector Details:", JSON.stringify(inspector, null, 2));

  if (!inspector) {
    throw new Error("Execution Inspector details not found!");
  }

  if (inspector.orchestrationId !== result.orchestrationId) {
    throw new Error("Execution Inspector returned wrong orchestrationId!");
  }

  if (inspector.agentMetrics.length !== 5) {
    throw new Error(`Expected metrics for 5 agents, got ${inspector.agentMetrics.length}`);
  }

  // Cost Per request checks
  console.log(`Total Execution Cost: $${inspector.cost}`);
  console.log(`Total Prompt Tokens: ${inspector.tokenUsage.promptTokens}`);
  console.log(`Total Completion Tokens: ${inspector.tokenUsage.completionTokens}`);
  console.log(`Total Tokens: ${inspector.tokenUsage.totalTokens}`);

  // --- Test Case 4: Aggregated Analytics ---
  console.log("\n--- 4. Aggregated Analytics Service ---");
  const overallStats = analyticsService.getAggregatedAnalytics();
  console.log("Overall Aggregated Analytics:", JSON.stringify(overallStats, null, 2));

  if (overallStats.successRate !== 1.0) {
    throw new Error(`Expected success rate 1.0, got ${overallStats.successRate}`);
  }

  console.log(`Daily Cost: $${analyticsService.getDailyCost()}`);
  console.log(`Monthly Cost: $${analyticsService.getMonthlyCost()}`);

  console.log("\n=== All Observability & Analytics Tests Passed! ===");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
