import type { IAgent } from "./agent.interface";
import type { AgentConfig, AgentStatus } from "../types/agent";
import type { AgentSession } from "../types/session";

export abstract class BaseAgent implements IAgent {
  protected readonly config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  getConfig(): AgentConfig {
    return this.config;
  }

  abstract executeStep(
    session: AgentSession,
    input: string
  ): Promise<{
    output: string;
    newStatus?: AgentStatus;
    metadata?: Record<string, unknown>;
  }>;
}
