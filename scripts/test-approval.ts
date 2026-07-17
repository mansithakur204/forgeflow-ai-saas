// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — HITL Approval Engine Test Script
// ─────────────────────────────────────────────────────────────────────────────

import { AgentRegistry } from "../src/agents/runtime/agent-registry";
import { AgentRuntimeCoordinator } from "../src/agents/runtime/agent-runtime-coordinator";
import { MultiAgentOrchestrator } from "../src/agents/runtime/orchestration/multi-agent-orchestrator";
import { ApprovalEngine } from "../src/agents/runtime/orchestration/approval-engine";
import { BaseAgent } from "../src/agents/runtime/base-agent";
import type { AgentRole, AgentStatus } from "../src/agents/types/agent";
import type { AgentSession } from "../src/agents/types/session";

// Mock Planner Agent that forwards JSON inputs as plans
class MockPlannerAgent extends BaseAgent {
  constructor() {
    super({
      id: "planner-agent",
      metadata: { id: "planner-agent", name: "Mock Planner", description: "test", version: "1.0.0", author: "test" },
      capabilities: { canPlan: true, canExecute: false, canSearchCode: false, canEditCode: false, canAccessMemory: false, canUseTools: false },
      role: "planner" as AgentRole
    });
  }

  async executeStep(session: AgentSession, input: string) {
    if (input.trim().startsWith("{")) {
      return {
        output: input,
        newStatus: "completed" as AgentStatus
      };
    }
    return {
      output: `Plan generated successfully: ID plan-123 containing 3 tasks.`,
      newStatus: "completed" as AgentStatus
    };
  }
}

class SimpleMockAgent extends BaseAgent {
  constructor(id: string) {
    super({
      id,
      metadata: { id, name: id, description: id, version: "1.0.0", author: "test" },
      capabilities: { canPlan: false, canExecute: true, canSearchCode: false, canEditCode: false, canAccessMemory: false, canUseTools: true },
      role: "executor" as AgentRole
    });
  }

  async executeStep(session: AgentSession, input: string) {
    return {
      output: `Output from ${this.getConfig().id} for: ${input}`,
      newStatus: "completed" as AgentStatus
    };
  }
}

// Simple Logger to capture telemetry events
class TestLogger {
  events: Array<{ event: string; [key: string]: any }> = [];

  info(msg: string, metadata?: any, agentId?: string) {
    console.log(`[INFO] [${agentId || "sys"}] ${msg}`, metadata ? JSON.stringify(metadata) : "");
    if (metadata && metadata.event) {
      this.events.push(metadata);
    }
  }

  warn(msg: string, metadata?: any, agentId?: string) {
    console.log(`[WARN] [${agentId || "sys"}] ${msg}`, metadata ? JSON.stringify(metadata) : "");
    if (metadata && metadata.event) {
      this.events.push(metadata);
    }
  }

  error(msg: string, metadata?: any, agentId?: string) {
    console.log(`[ERROR] [${agentId || "sys"}] ${msg}`, metadata ? JSON.stringify(metadata) : "");
    if (metadata && metadata.event) {
      this.events.push(metadata);
    }
  }
}

async function runTests() {
  console.log("=== HITL Approval Flow Tests ===");

  const registry = new AgentRegistry();
  registry.register(new MockPlannerAgent());
  registry.register(new SimpleMockAgent("research-agent"));
  registry.register(new SimpleMockAgent("tool-agent"));
  registry.register(new SimpleMockAgent("memory-agent"));
  registry.register(new SimpleMockAgent("reviewer-agent"));

  const coordinator = new AgentRuntimeCoordinator(registry);
  const logger = new TestLogger();

  // Test Case 1: Database DELETE rule triggers pause & resume
  console.log("\n--- Test Case 1: DB DELETE approval required & approved ---");
  const approvalEngine = new ApprovalEngine(logger);
  const orchestrator = new MultiAgentOrchestrator(
    registry,
    coordinator,
    { parallelExecutionEnabled: false },
    undefined,
    approvalEngine
  );

  const goal1 = JSON.stringify({
    toolId: "io_database",
    config: { operation: "DELETE", query: "DELETE FROM users WHERE id = 1" }
  });

  const res1 = await orchestrator.start(goal1, logger);
  console.log("Start result state:", res1.finalState); // should be "paused"
  console.log("Start success:", res1.success); // should be false
  
  // Verify telemetry was captured
  let requestedEvent = logger.events.find(e => e.event === "APPROVAL_REQUESTED");
  let pendingEvent = logger.events.find(e => e.event === "APPROVAL_PENDING");
  console.log("APPROVAL_REQUESTED emitted:", !!requestedEvent);
  console.log("APPROVAL_PENDING emitted:", !!pendingEvent);

  const requests = Array.from(approvalEngine.getRequests().values());
  const request = requests[0];
  console.log("Found request:", request.id, "Status:", request.status);

  // Deciding: Approve
  console.log("Deciding: approve request...");
  approvalEngine.decide(request.id, { decision: "approved", approver: "admin", reason: "Safe delete" });
  let approvedEvent = logger.events.find(e => e.event === "APPROVAL_APPROVED");
  console.log("APPROVAL_APPROVED emitted:", !!approvedEvent);

  // Resume Orchestration
  console.log("Resuming orchestrator...");
  const res1Resume = await orchestrator.resumeFromApproval(request.id, logger);
  console.log("Resume result state:", res1Resume.finalState); // should be "completed"
  console.log("Resume success:", res1Resume.success); // should be true

  let resumedEvent = logger.events.find(e => e.event === "WORKFLOW_RESUMED");
  console.log("WORKFLOW_RESUMED emitted:", !!resumedEvent);

  // Test Case 2: Email Bulk Send rejected
  console.log("\n--- Test Case 2: Email Bulk Send approval required & rejected ---");
  const approvalEngine2 = new ApprovalEngine(logger);
  const orchestrator2 = new MultiAgentOrchestrator(
    registry,
    coordinator,
    { parallelExecutionEnabled: false },
    undefined,
    approvalEngine2
  );

  const goal2 = JSON.stringify({
    toolId: "io_email",
    config: { to: "a@a.com, b@b.com, c@c.com, d@d.com, e@e.com, f@f.com", subject: "Bulk", body: "Hello" }
  });

  logger.events = [];
  const res2 = await orchestrator2.start(goal2, logger);
  console.log("Start result state:", res2.finalState); // should be "paused"
  const request2 = Array.from(approvalEngine2.getRequests().values())[0];
  
  // Decide: Reject
  console.log("Deciding: reject request...");
  approvalEngine2.decide(request2.id, { decision: "rejected", approver: "security_officer", reason: "Too many recipients" });
  let rejectedEvent = logger.events.find(e => e.event === "APPROVAL_REJECTED");
  console.log("APPROVAL_REJECTED emitted:", !!rejectedEvent);

  // Verify resume throws or fails since it's rejected
  try {
    await orchestrator2.resumeFromApproval(request2.id, logger);
    console.log("ERROR: resumed a rejected execution!");
  } catch (e: any) {
    console.log("Resume rejected request correctly failed with error:", e.message);
  }

  // Test Case 3: Expiration
  console.log("\n--- Test Case 3: Timeout Expiration ---");
  const approvalEngine3 = new ApprovalEngine(logger);
  const request3 = approvalEngine3.createRequest(
    "orch-test-expire",
    "io_slack",
    { broadcast: true, message: "Hello General" },
    {
      orchestrationId: "orch-test-expire",
      correlationId: "corr-test-expire",
      currentState: "executing_tools",
      progress: 55,
      executionTimeMs: 120,
      currentStepIndex: 3,
      totalSteps: 5,
      sharedVariables: {},
      sharedMetadata: {}
    },
    {},
    { timeoutMs: 10, autoRejectOnTimeout: true }
  );

  logger.events = [];
  console.log("Waiting for request to expire...");
  await new Promise(r => setTimeout(r, 20));

  const fetchedRequest = approvalEngine3.getRequest(request3.id);
  console.log("Fetched request status after timeout:", fetchedRequest?.status); // should be "rejected"
  let expiredEvent = logger.events.find(e => e.event === "APPROVAL_EXPIRED");
  let autoRejectedEvent = logger.events.find(e => e.event === "APPROVAL_REJECTED");
  console.log("APPROVAL_EXPIRED emitted:", !!expiredEvent);
  console.log("APPROVAL_REJECTED auto-reject emitted:", !!autoRejectedEvent);

  console.log("\n=== All Tests Finished ===");
}

runTests().catch(console.error);
