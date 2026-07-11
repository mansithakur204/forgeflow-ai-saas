import type { AgentConfig, AgentStatus } from "../types/agent";
import type { AgentSession } from "../types/session";

export interface IAgent {
  /**
   * Returns capabilities and metadata configurations.
   */
  getConfig(): AgentConfig;

  /**
   * Executes a single prompt step inside an active session.
   */
  executeStep(
    session: AgentSession,
    input: string
  ): Promise<{
    output: string;
    newStatus?: AgentStatus;
    metadata?: Record<string, unknown>;
  }>;
}
