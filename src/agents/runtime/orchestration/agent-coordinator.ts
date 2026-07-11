import { TaskQueue } from "./task-queue";
import { AgentRouter } from "./agent-router";
import type { AgentMessageBus } from "./message-bus";
import type { SharedMemory } from "./shared-memory";
import type { AgentRegistry } from "../agent-registry";
import type { AgentRuntimeCoordinator } from "../agent-runtime-coordinator";
import type { CollaborationSession, AgentTask } from "../../types/orchestration";
import type { AgentSession } from "../../types/session";

export class AgentCoordinator {
  private registry: AgentRegistry;
  private coordinator: AgentRuntimeCoordinator;
  private router: AgentRouter;
  private messageBus: AgentMessageBus;

  constructor(
    registry: AgentRegistry,
    coordinator: AgentRuntimeCoordinator,
    messageBus: AgentMessageBus
  ) {
    this.registry = registry;
    this.coordinator = coordinator;
    this.router = new AgentRouter(registry);
    this.messageBus = messageBus;
  }

  /**
   * Executes tasks list parallel batches. Compiles and updates shared context memory parameters.
   */
  async executeCollaboration(
    tasks: AgentTask[],
    sharedMemory: SharedMemory
  ): Promise<CollaborationSession> {
    const queue = new TaskQueue();
    for (const t of tasks) {
      queue.addTask(t);
    }

    const session: CollaborationSession = {
      id: `collab-${Date.now()}`,
      tasks: queue.getAllTasks(),
      sessions: new Map<string, AgentSession>(),
      sharedMemoryId: `mem-${Date.now()}`,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.messageBus.publish("collaboration:started", "coordinator", { sessionId: session.id });

    try {
      while (true) {
        const runnable = queue.getRunnableTasks();

        if (runnable.length === 0) {
          const all = queue.getAllTasks();
          const running = all.some((t) => t.status === "running");
          const pending = all.some((t) => t.status === "pending");

          if (running || pending) {
            session.status = "failed";
            this.messageBus.publish("collaboration:failed", "coordinator", {
              sessionId: session.id,
              error: "Deadlock: pending tasks have unresolvable dependency loops",
            });
            break;
          }

          session.status = "completed";
          this.messageBus.publish("collaboration:completed", "coordinator", {
            sessionId: session.id,
          });
          break;
        }

        // Parallel Execution batch loops
        const promises = runnable.map(async (task) => {
          task.status = "running";
          task.updatedAt = new Date().toISOString();

          this.messageBus.publish("task:started", "coordinator", { taskId: task.id });

          const agentId = task.assignedAgentId || this.router.route(task.description);
          task.assignedAgentId = agentId;

          const runtime = this.coordinator.getRuntime(agentId);
          let agentSession = session.sessions.get(agentId);
          if (!agentSession) {
            agentSession = runtime.createSession(`sess-${session.id}-${agentId}`);
            session.sessions.set(agentId, agentSession);
          }

          agentSession.context.variables = {
            ...agentSession.context.variables,
            ...sharedMemory.getAll(),
          };

          try {
            const output = await runtime.runStep(agentSession, task.description);

            task.status = "completed";
            task.result = output;
            task.updatedAt = new Date().toISOString();

            sharedMemory.set(`task:${task.id}:result`, output);

            this.messageBus.publish("task:completed", agentId, {
              taskId: task.id,
              output,
            });
          } catch (err: any) {
            task.status = "failed";
            task.error = err.message;
            task.updatedAt = new Date().toISOString();

            this.messageBus.publish("task:failed", agentId, {
              taskId: task.id,
              error: err.message,
            });
            throw err;
          }
        });

        await Promise.all(promises);
      }
    } catch (err: any) {
      session.status = "failed";
      this.messageBus.publish("collaboration:failed", "coordinator", {
        sessionId: session.id,
        error: err.message,
      });
    }

    session.updatedAt = new Date().toISOString();
    return session;
  }
}
