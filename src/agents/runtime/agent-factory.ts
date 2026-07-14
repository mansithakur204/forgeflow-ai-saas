import type { IAgent } from "./agent.interface";
import { AgentRegistry } from "./agent-registry";
import {
  PlannerAgent,
  ExecutorAgent,
  ResearchAgent,
  CodingAgent,
  MemoryAgent,
  ToolAgent,
  ReviewerAgent,
} from "./concrete-agents";

export class AgentFactory {
  /**
   * Instantiates an agent dynamically based on its type key.
   */
  static create(type: string): IAgent {
    const normalized = type.toLowerCase().trim();
    switch (normalized) {
      case "planner":
      case "planner-agent":
        return new PlannerAgent();
      case "executor":
      case "executor-agent":
        return new ExecutorAgent();
      case "research":
      case "research-agent":
        return new ResearchAgent();
      case "coding":
      case "coding-agent":
        return new CodingAgent();
      case "memory":
      case "memory-agent":
        return new MemoryAgent();
      case "tool":
      case "tool-agent":
        return new ToolAgent();
      case "reviewer":
      case "reviewer-agent":
        return new ReviewerAgent();
      default:
        throw new Error(`Unsupported agent type requested: "${type}"`);
    }
  }

  /**
   * Generates a preloaded default registry containing all capabilities profiles.
   */
  static createDefaultRegistry(): AgentRegistry {
    const registry = new AgentRegistry();
    registry.register(new PlannerAgent());
    registry.register(new ExecutorAgent());
    registry.register(new ResearchAgent());
    registry.register(new CodingAgent());
    registry.register(new MemoryAgent());
    registry.register(new ToolAgent());
    registry.register(new ReviewerAgent());
    return registry;
  }
}
