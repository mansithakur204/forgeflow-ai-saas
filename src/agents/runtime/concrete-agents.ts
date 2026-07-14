import { BaseAgent } from "./base-agent";
import type { AgentStatus, AgentRole } from "../types/agent";
import type { AgentSession } from "../types/session";
import { PlannerAgent } from "./planning/planner-agent";
import { ResearchAgent } from "./research/research-agent";
import { ToolAgent } from "./tools/tool-agent";
import { MemoryAgent } from "./memory/memory-agent";
import { ReviewerAgent } from "./reviewer/reviewer-agent";
export { PlannerAgent, ResearchAgent, ToolAgent, MemoryAgent, ReviewerAgent };

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






