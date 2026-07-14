import type { IAgent } from "./agent.interface";
import type { AgentSession, AgentMessage } from "../types/session";
import type { AgentEvent, AgentStatus } from "../types/agent";

export class AgentRuntime {
  private agent: IAgent;
  private eventHandlers: ((event: AgentEvent) => void)[] = [];

  // Allowed state machine lifecycle transitions check (Task 14.1D)
  private static readonly VALID_TRANSITIONS: Record<AgentStatus, Set<AgentStatus>> = {
    created: new Set<AgentStatus>(["idle", "running", "cancelled"]),
    idle: new Set<AgentStatus>(["running", "cancelled"]),
    running: new Set<AgentStatus>(["waiting", "completed", "failed", "cancelled"]),
    waiting: new Set<AgentStatus>(["running", "completed", "failed", "cancelled"]),
    completed: new Set<AgentStatus>([]),
    failed: new Set<AgentStatus>([]),
    cancelled: new Set<AgentStatus>([]),
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
   * Standardized logging method for telemetry adapter events (Task 14.1F)
   */
  private logEvent(
    session: AgentSession,
    event: "AGENT_CREATED" | "AGENT_STARTED" | "AGENT_STOPPED" | "AGENT_FAILED" | "AGENT_HEARTBEAT",
    level: "info" | "error" = "info",
    extraProperties: Record<string, unknown> = {}
  ): void {
    const logger = session.context.variables.logger as any;
    const agentId = this.agent.getConfig().id;
    const msg = `[Agent ${agentId}] ${event}`;
    const payload = {
      event,
      agentId,
      sessionId: session.id,
      status: session.status,
      ...extraProperties,
    };
    if (logger && typeof logger.info === "function") {
      if (level === "error") {
        logger.error(msg, payload, agentId);
      } else {
        logger.info(msg, payload, agentId);
      }
    } else {
      console.log(`[Telemetry Event] ${event}`, payload);
    }
  }

  /**
   * Instantiates a new AgentSession layout context.
   */
  createSession(id: string): AgentSession {
    const session: AgentSession = {
      id,
      agentId: this.agent.getConfig().id,
      status: "created" as AgentStatus,
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

    // Emit AGENT_CREATED telemetry
    this.logEvent(session, "AGENT_CREATED");
    return session;
  }

  /**
   * Starts agent runtime session (Task 14.1C)
   */
  start(session: AgentSession): void {
    if (session.status === "created") {
      this.transitionState(session, "idle");
    }
    this.transitionState(session, "running");
    this.logEvent(session, "AGENT_STARTED");
  }

  /**
   * Stops active runtime execution (Task 14.1C)
   */
  stop(session: AgentSession): void {
    this.transitionState(session, "completed");
    session.diagnostics.endTime = new Date().toISOString();
    this.logEvent(session, "AGENT_STOPPED");
  }

  /**
   * Pauses active execution step (Task 14.1C)
   */
  pause(session: AgentSession): void {
    if (session.status !== "running") {
      throw new Error(
        `Cannot pause agent session: Session is not in running state (current: ${session.status})`
      );
    }
    this.transitionState(session, "waiting");
    this.dispatchEvent(session.id, "paused", {});
  }

  /**
   * Resumes waiting execution step (Task 14.1C)
   */
  resume(session: AgentSession): void {
    if (session.status !== "waiting") {
      throw new Error(
        `Cannot resume agent session: Session is not waiting (current: ${session.status})`
      );
    }
    this.transitionState(session, "running");
    this.dispatchEvent(session.id, "resumed", {});
  }

  /**
   * Cancels active execution step (Task 14.1C)
   */
  cancel(session: AgentSession): void {
    this.transitionState(session, "cancelled");
    session.diagnostics.endTime = new Date().toISOString();
    this.logEvent(session, "AGENT_STOPPED", "info", { reason: "cancelled" });
  }

  /**
   * Fires runtime heartbeat pulse (Task 14.1C)
   */
  heartbeat(session: AgentSession): void {
    session.updatedAt = new Date().toISOString();
    this.dispatchEvent(session.id, "heartbeat", { timestamp: session.updatedAt });
    this.logEvent(session, "AGENT_HEARTBEAT");
  }

  /**
   * Resolves runtime health status indicator (Task 14.1C)
   */
  healthStatus(session: AgentSession): "healthy" | "unhealthy" | "degraded" {
    if (session.status === "failed") {
      return "unhealthy";
    }
    const lastUpdate = Date.parse(session.updatedAt);
    const ageMs = Date.now() - lastUpdate;
    if (ageMs > 30000) {
      return "degraded"; // Missed heartbeat for > 30 seconds
    }
    return "healthy";
  }

  /**
   * Runs single execution step, logging diagnostics and rolling states.
   */
  async runStep(session: AgentSession, input: string): Promise<string> {
    const startTime = Date.now();

    if (session.status === "completed" || session.status === "failed" || session.status === "cancelled") {
      throw new Error(
        `Cannot run execution step: Agent session has already finished in status "${session.status}"`
      );
    }

    if (session.status === "created" || session.status === "idle") {
      this.start(session);
    } else if (session.status !== "running") {
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
      this.transitionState(session, targetStatus as AgentStatus);

      this.dispatchEvent(session.id, "step_executed", {
        stepIndex: session.diagnostics.totalStepsExecuted,
        latencyMs: latency,
        status: targetStatus,
      });

      if (targetStatus === "completed") {
        this.stop(session);
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
      this.logEvent(session, "AGENT_FAILED", "error", { error: err.message });
      throw err;
    }
  }
}
