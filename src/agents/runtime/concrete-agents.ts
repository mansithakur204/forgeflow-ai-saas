import { BaseAgent } from "./base-agent";
import type { AgentStatus } from "../types/agent";
import type { AgentSession } from "../types/session";

export class PlannerAgent extends BaseAgent {
  constructor() {
    super({
      id: "planner-agent",
      metadata: {
        id: "planner-agent",
        name: "Planner Agent",
        description: "Creates and updates execution plans.",
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
    });
  }

  async executeStep(session: AgentSession, input: string) {
    return {
      output: `[Planner] Structured execution plan for: ${input}`,
      newStatus: "completed" as AgentStatus,
      metadata: { planType: "sequential" },
    };
  }
}

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
    });
  }

  async executeStep(session: AgentSession, input: string) {
    return {
      output: `[Executor] Command executed successfully: ${input}`,
      newStatus: "completed" as AgentStatus,
    };
  }
}

export class ResearchAgent extends BaseAgent {
  constructor() {
    super({
      id: "research-agent",
      metadata: {
        id: "research-agent",
        name: "Research Agent",
        description: "Searches documentation and websites.",
        version: "1.0.0",
        author: "ForgeFlow AI",
      },
      capabilities: {
        canPlan: false,
        canExecute: false,
        canSearchCode: true,
        canEditCode: false,
        canAccessMemory: true,
        canUseTools: true,
      },
    });
  }

  async executeStep(session: AgentSession, input: string) {
    return {
      output: `[Research] Gathered knowledge sources for: ${input}`,
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
    });
  }

  async executeStep(session: AgentSession, input: string) {
    return {
      output: `[Memory] Retrieved experiences for: ${input}`,
      newStatus: "completed" as AgentStatus,
    };
  }
}

export class ToolAgent extends BaseAgent {
  constructor() {
    super({
      id: "tool-agent",
      metadata: {
        id: "tool-agent",
        name: "Tool Agent",
        description: "Orchestrates API calls and tool integrations.",
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
    });
  }

  async executeStep(session: AgentSession, input: string) {
    return {
      output: `[Tool] Tool output compiled for: ${input}`,
      newStatus: "completed" as AgentStatus,
    };
  }
}
