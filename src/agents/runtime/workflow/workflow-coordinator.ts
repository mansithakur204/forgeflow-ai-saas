import type { AgentWorkflowSession, WorkflowCheckpoint } from "../../types/workflow";
import type { ExecutionPlan } from "../../types/planning";
import type { AgentRuntimeCoordinator } from "../agent-runtime-coordinator";
import type { AgentMessageBus } from "../orchestration/message-bus";
import { WorkflowStateSynchronizer } from "./workflow-context";
import { WorkflowTaskExecutor } from "./task-executor";
import { CollaborationGraph } from "../planning/collaboration-graph";

export class AgentWorkflowCoordinator {
  private coordinator: AgentRuntimeCoordinator;
  private messageBus: AgentMessageBus;
  private synchronizer: WorkflowStateSynchronizer;
  private executor: WorkflowTaskExecutor;

  // Cache of active running sessions
  private activeSessions = new Map<string, AgentWorkflowSession>();

  constructor(coordinator: AgentRuntimeCoordinator, messageBus: AgentMessageBus) {
    this.coordinator = coordinator;
    this.messageBus = messageBus;
    this.synchronizer = new WorkflowStateSynchronizer();
    this.executor = new WorkflowTaskExecutor(coordinator);
  }

  /**
   * Instantiates a new AgentWorkflowSession.
   */
  createSession(
    workflowId: string,
    plan: ExecutionPlan,
    initialContext: Record<string, unknown> = {}
  ): AgentWorkflowSession {
    const session: AgentWorkflowSession = {
      id: `wf-sess-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      workflowId,
      status: "pending",
      plan,
      context: { ...initialContext },
      metrics: {
        totalTasks: plan.tasks.length,
        completedTasks: 0,
        failedTasks: 0,
        latencyMs: 0,
        progress: 0,
      },
      history: [],
      checkpoints: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    session.history.push({
      timestamp: new Date().toISOString(),
      taskId: "system",
      action: "created",
      status: "pending",
      details: `Workflow session initialized for: "${plan.objective}".`,
    });

    this.activeSessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): AgentWorkflowSession | null {
    return this.activeSessions.get(sessionId) ?? null;
  }

  /**
   * Pauses active workflow session.
   */
  pauseWorkflow(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Workflow session "${sessionId}" not found.`);
    }
    if (session.status !== "running") {
      throw new Error(
        `Cannot pause workflow: Session is not in running state (current: ${session.status})`
      );
    }

    session.status = "paused";
    session.history.push({
      timestamp: new Date().toISOString(),
      taskId: "system",
      action: "paused",
      status: "paused",
      details: "Workflow execution suspended by user request.",
    });
    session.updatedAt = new Date().toISOString();
    this.messageBus.publish("workflow:paused", "coordinator", { sessionId });
  }

  /**
   * Resumes paused workflow execution session.
   */
  async resumeWorkflow(sessionId: string, abortSignal?: AbortSignal): Promise<AgentWorkflowSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Workflow session "${sessionId}" not found.`);
    }
    if (session.status !== "paused") {
      throw new Error(
        `Cannot resume workflow: Session is not paused (current: ${session.status})`
      );
    }

    session.status = "running";
    session.history.push({
      timestamp: new Date().toISOString(),
      taskId: "system",
      action: "resumed",
      status: "running",
      details: "Resuming workflow execution sequence.",
    });
    session.updatedAt = new Date().toISOString();
    this.messageBus.publish("workflow:resumed", "coordinator", { sessionId });

    return this.runExecutionLoop(session, abortSignal);
  }

  /**
   * Rolls back execution to a specific checkpoint and resumes it.
   */
  rollbackWorkflow(sessionId: string, checkpointId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Workflow session "${sessionId}" not found.`);
    }
    this.synchronizer.rollbackToCheckpoint(session, checkpointId);
    this.messageBus.publish("workflow:rolled_back", "coordinator", { sessionId, checkpointId });
  }

  /**
   * Creates a checkpoint backup snapshot.
   */
  checkpointWorkflow(sessionId: string, checkpointId: string): WorkflowCheckpoint {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Workflow session "${sessionId}" not found.`);
    }
    const cp = this.synchronizer.createCheckpoint(session, checkpointId);
    this.messageBus.publish("workflow:checkpoint_created", "coordinator", {
      sessionId,
      checkpointId,
    });
    return cp;
  }

  /**
   * Executes the complete workflow plan.
   */
  async executeWorkflow(sessionId: string, abortSignal?: AbortSignal): Promise<AgentWorkflowSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Workflow session "${sessionId}" not found.`);
    }
    if (session.status !== "pending") {
      throw new Error(`Cannot start workflow: Session is already in status "${session.status}".`);
    }

    session.status = "running";
    session.history.push({
      timestamp: new Date().toISOString(),
      taskId: "system",
      action: "started",
      status: "running",
      details: "Workflow execution loop initiated.",
    });
    this.messageBus.publish("workflow:started", "coordinator", { sessionId });

    return this.runExecutionLoop(session, abortSignal);
  }

  private async runExecutionLoop(
    session: AgentWorkflowSession,
    abortSignal?: AbortSignal
  ): Promise<AgentWorkflowSession> {
    const graph = new CollaborationGraph(session.plan.tasks);

    try {
      while (true) {
        // Enforce abort signal cancellation check
        if (abortSignal?.aborted) {
          session.status = "cancelled";
          session.history.push({
            timestamp: new Date().toISOString(),
            taskId: "system",
            action: "cancelled",
            status: "cancelled",
            details: "Workflow execution cancelled via abort signal.",
          });
          this.messageBus.publish("workflow:cancelled", "coordinator", { sessionId: session.id });
          break;
        }

        // Check pause state
        if (session.status === "paused") {
          break;
        }

        // Check cycle safety
        if (graph.hasCycle()) {
          throw new Error("Deadlock: Graph dependencies contain a cycle blockage.");
        }

        // Get next runnable tasks
        const runnable = graph.getRunnableTasks();

        if (runnable.length === 0) {
          // Verify if everything finished
          const allTasks = graph.getAllTasks();
          const running = allTasks.some((t) => t.status === "running");
          const pending = allTasks.some((t) => t.status === "pending");

          if (running) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            continue;
          }

          if (pending) {
            // Deadlock check
            session.status = "failed";
            this.messageBus.publish("workflow:failed", "coordinator", {
              sessionId: session.id,
              error: "Deadlock: Pending tasks exist but none are runnable.",
            });
            break;
          }

          session.status = "completed";
          session.history.push({
            timestamp: new Date().toISOString(),
            taskId: "system",
            action: "completed",
            status: "completed",
            details: "Workflow execution plan completed successfully.",
          });
          this.messageBus.publish("workflow:completed", "coordinator", { sessionId: session.id });
          break;
        }

        // Run the current runnable tasks in parallel
        const promises = runnable.map(async (task) => {
          let retryAttempt = 0;
          const maxRetries = task.maxRetries;

          while (true) {
            if (abortSignal?.aborted) {
              return;
            }
            if (session.status === "paused") {
              return;
            }

            try {
              await this.executor.executeTask(task, session);
              break; // Success, exit retry loop
            } catch (err: any) {
              if (retryAttempt < maxRetries && task.recoveryStrategy === "retry") {
                retryAttempt++;
                task.retryCount = retryAttempt;
                const delayMs = retryAttempt * 50;
                await new Promise((resolve) => setTimeout(resolve, delayMs));

                session.history.push({
                  timestamp: new Date().toISOString(),
                  taskId: task.id,
                  action: "retrying",
                  status: "running",
                  details: `Task failed. Attempting retry ${retryAttempt}/${maxRetries} in ${delayMs}ms. Error: ${err.message}`,
                });
                continue;
              }

              // Failed completely
              throw err;
            }
          }
        });

        await Promise.all(promises);
        this.synchronizer.synchronizeMetrics(session);
      }
    } catch (err: any) {
      session.status = "failed";
      session.history.push({
        timestamp: new Date().toISOString(),
        taskId: "system",
        action: "failed",
        status: "failed",
        details: `Workflow failed: ${err.message}`,
      });
      this.messageBus.publish("workflow:failed", "coordinator", {
        sessionId: session.id,
        error: err.message,
      });
    }

    this.synchronizer.synchronizeMetrics(session);
    return session;
  }
}
