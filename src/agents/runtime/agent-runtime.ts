import type { IAgent } from "./agent.interface";
import type { AgentSession, AgentMessage } from "../types/session";
import type { AgentEvent, AgentStatus } from "../types/agent";

export class AgentRuntime {
  private agent: IAgent;
  private eventHandlers: ((event: AgentEvent) => void)[] = [];

  // Allowed state machine lifecycle transitions check
  private static readonly VALID_TRANSITIONS: Record<AgentStatus, Set<AgentStatus>> = {
    idle: new Set<AgentStatus>(["running"]),
    running: new Set<AgentStatus>(["paused", "completed", "failed"]),
    paused: new Set<AgentStatus>(["running", "failed"]),
    completed: new Set<AgentStatus>([]),
    failed: new Set<AgentStatus>([]),
  };

  constructor(agent: IAgent) {
    this.agent = agent;
  }

  /**
   * Registers event telemetry handlers.
   */
  onEvent(handler: (event: AgentEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  private dispatchEvent(
    sessionId: string,
    type: AgentEvent["type"],
    payload: Record<string, unknown>
  ): void {
    const event: AgentEvent = {
      agentId: this.agent.getConfig().id,
      sessionId,
      type,
      timestamp: new Date().toISOString(),
      payload,
    };
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (err) {
        // Silently capture telemetry failure
      }
    }
  }

  /**
   * Transition state machine helper enforcing validation rules.
   */
  private transitionState(session: AgentSession, targetStatus: AgentStatus): void {
    const current = session.status;
    if (current === targetStatus) return;

    const allowed = AgentRuntime.VALID_TRANSITIONS[current];
    if (!allowed || !allowed.has(targetStatus)) {
      throw new Error(
        `Invalid agent lifecycle status transition from "${current}" to "${targetStatus}"`
      );
    }

    session.status = targetStatus;
    session.updatedAt = new Date().toISOString();
    this.dispatchEvent(session.id, "state_changed", { from: current, to: targetStatus });
  }

  /**
   * Instantiates a new AgentSession layout context.
   */
  createSession(id: string): AgentSession {
    return {
      id,
      agentId: this.agent.getConfig().id,
      status: "idle",
      context: {
        variables: {},
        tempMemory: {},
      },
      messages: [],
      diagnostics: {
        startTime: new Date().toISOString(),
        totalStepsExecuted: 0,
        tokensConsumed: 0,
        totalLatencyMs: 0,
        errorsCount: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Runs single execution step, logging diagnostics and rolling states.
   */
  async runStep(session: AgentSession, input: string): Promise<string> {
    const startTime = Date.now();

    if (session.status === "completed" || session.status === "failed") {
      throw new Error(
        `Cannot run execution step: Agent session has already finished in status "${session.status}"`
      );
    }

    if (session.status !== "running") {
      this.transitionState(session, "running");
    }

    if (session.diagnostics.totalStepsExecuted === 0) {
      this.dispatchEvent(session.id, "started", { input });
    }

    const userMsg: AgentMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(userMsg);

    try {
      const result = await this.agent.executeStep(session, input);
      const latency = Date.now() - startTime;

      session.diagnostics.totalStepsExecuted++;
      session.diagnostics.totalLatencyMs += latency;
      session.diagnostics.tokensConsumed += Math.ceil((input.length + result.output.length) * 0.3);

      const assistantMsg: AgentMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: result.output,
        timestamp: new Date().toISOString(),
        metadata: result.metadata,
      };
      session.messages.push(assistantMsg);

      const targetStatus = result.newStatus ?? "completed";
      this.transitionState(session, targetStatus);

      this.dispatchEvent(session.id, "step_executed", {
        stepIndex: session.diagnostics.totalStepsExecuted,
        latencyMs: latency,
        status: targetStatus,
      });

      if (targetStatus === "completed") {
        session.diagnostics.endTime = new Date().toISOString();
        this.dispatchEvent(session.id, "completed", { output: result.output });
      }

      return result.output;
    } catch (err: any) {
      const latency = Date.now() - startTime;
      session.diagnostics.totalStepsExecuted++;
      session.diagnostics.totalLatencyMs += latency;
      session.diagnostics.errorsCount++;
      session.diagnostics.endTime = new Date().toISOString();

      const errorMsg: AgentMessage = {
        id: `msg-${Date.now()}-error`,
        role: "system",
        content: `Error during step execution: ${err.message}`,
        timestamp: new Date().toISOString(),
      };
      session.messages.push(errorMsg);

      this.transitionState(session, "failed");
      this.dispatchEvent(session.id, "failed", { error: err.message });
      throw err;
    }
  }

  /**
   * Pauses active execution step.
   */
  pause(session: AgentSession): void {
    if (session.status !== "running") {
      throw new Error(
        `Cannot pause agent session: Session is not in running state (current: ${session.status})`
      );
    }
    this.transitionState(session, "paused");
    this.dispatchEvent(session.id, "paused", {});
  }

  /**
   * Resumes paused execution step.
   */
  resume(session: AgentSession): void {
    if (session.status !== "paused") {
      throw new Error(
        `Cannot resume agent session: Session is not paused (current: ${session.status})`
      );
    }
    this.transitionState(session, "running");
    this.dispatchEvent(session.id, "resumed", {});
  }
}
