import { BaseAgent } from "./base-agent";
import type { AgentStatus, AgentRole } from "../types/agent";
import type { AgentSession } from "../types/session";
import { PlannerAgent } from "./planning/planner-agent";
import { ResearchAgent } from "./research/research-agent";
import { ToolAgent } from "./tools/tool-agent";
export { PlannerAgent, ResearchAgent, ToolAgent };

export class ExecutorAgent extends BaseAgent {
  constructor() {
    super({
      id: "executor-agent",
      metadata: {
        id: "executor-agent",
        name: "Executor Agent",
        description: "Runs sequential command operations.",
        version: "1.0.0",
        author: "ForgeFlow AI",
      },
      capabilities: {
        canPlan: false,
        canExecute: true,
        canSearchCode: false,
        canEditCode: false,
        canAccessMemory: false,
        canUseTools: true,
      },
      role: "executor" as AgentRole,
    });
  }

  async executeStep(session: AgentSession, input: string) {
    return {
      output: `[Executor] Command executed successfully: ${input}`,
      newStatus: "completed" as AgentStatus,
    };
  }
}



export class CodingAgent extends BaseAgent {
  constructor() {
    super({
      id: "coding-agent",
      metadata: {
        id: "coding-agent",
        name: "Coding Agent",
        description: "Generates, reviews, and edits software code.",
        version: "1.0.0",
        author: "ForgeFlow AI",
      },
      capabilities: {
        canPlan: false,
        canExecute: false,
        canSearchCode: true,
        canEditCode: true,
        canAccessMemory: false,
        canUseTools: false,
      },
      role: "coder" as AgentRole,
    });
  }

  async executeStep(session: AgentSession, input: string) {
    return {
      output: `[Coding] Code changes written for: ${input}`,
      newStatus: "completed" as AgentStatus,
    };
  }
}

export class MemoryAgent extends BaseAgent {
  constructor() {
    super({
      id: "memory-agent",
      metadata: {
        id: "memory-agent",
        name: "Memory Agent",
        description: "Retrieves past experiences and key value store items.",
        version: "1.0.0",
        author: "ForgeFlow AI",
      },
      capabilities: {
        canPlan: false,
        canExecute: false,
        canSearchCode: false,
        canEditCode: false,
        canAccessMemory: true,
        canUseTools: false,
      },
      role: "memory" as AgentRole,
    });
  }

  async executeStep(session: AgentSession, input: string) {
    return {
      output: `[Memory] Retrieved experiences for: ${input}`,
      newStatus: "completed" as AgentStatus,
    };
  }
}



export class ReviewerAgent extends BaseAgent {
  constructor() {
    super({
      id: "reviewer-agent",
      metadata: {
        id: "reviewer-agent",
        name: "Reviewer Agent",
        description: "Reviews and validates task outputs and execution results.",
        version: "1.0.0",
        author: "ForgeFlow AI",
      },
      capabilities: {
        canPlan: true,
        canExecute: false,
        canSearchCode: false,
        canEditCode: false,
        canAccessMemory: true,
        canUseTools: false,
      },
      role: "reviewer" as AgentRole,
    });
  }

  async executeStep(session: AgentSession, input: string) {
    return {
      output: `[Reviewer] Task output reviewed and approved for: ${input}`,
      newStatus: "completed" as AgentStatus,
      metadata: { score: 0.98, status: "approved" },
    };
  }
}
