import type { PlanningTask } from "../../types/planning";
import type { AgentRuntimeCoordinator } from "../agent-runtime-coordinator";
import type { AgentWorkflowSession } from "../../types/workflow";

export class AgentTaskDispatcher {
  private coordinator: AgentRuntimeCoordinator;

  constructor(coordinator: AgentRuntimeCoordinator) {
    this.coordinator = coordinator;
  }

  /**
   * Dispatches a task to the assigned agent, running it inside a session context.
   */
  async dispatch(task: PlanningTask, session: AgentWorkflowSession): Promise<string> {
    const agentId = task.assignedAgentId || "tool-agent";
    const runtime = this.coordinator.getRuntime(agentId);

    // Resolve an agent session
    const agentSessionId = `sess-wf-${session.id}-${agentId}`;
    const agentSession = runtime.createSession(agentSessionId);

    // Copy context variables
    agentSession.context.variables = {
      ...agentSession.context.variables,
      ...session.context,
    };

    const output = await runtime.runStep(agentSession, task.description);
    return output;
  }
}

export class WorkflowTaskExecutor {
  private dispatcher: AgentTaskDispatcher;

  constructor(coordinator: AgentRuntimeCoordinator) {
    this.dispatcher = new AgentTaskDispatcher(coordinator);
  }

  /**
   * Executes a single task, writing logs directly into the workflow history.
   */
  async executeTask(task: PlanningTask, session: AgentWorkflowSession): Promise<string> {
    task.status = "running";
    task.updatedAt = new Date().toISOString();

    session.history.push({
      timestamp: new Date().toISOString(),
      taskId: task.id,
      action: "started",
      status: "running",
      details: `Execution started on agent: "${task.assignedAgentId}".`,
    });

    try {
      const output = await this.dispatcher.dispatch(task, session);

      task.status = "completed";
      task.result = output;
      task.updatedAt = new Date().toISOString();

      // Store results in context
      session.context[`task:${task.id}:result`] = output;

      session.history.push({
        timestamp: new Date().toISOString(),
        taskId: task.id,
        action: "completed",
        status: "completed",
        details: `Task completed successfully.`,
      });

      return output;
    } catch (err: any) {
      task.status = "failed";
      task.error = err.message;
      task.updatedAt = new Date().toISOString();

      session.history.push({
        timestamp: new Date().toISOString(),
        taskId: task.id,
        action: "failed",
        status: "failed",
        details: `Task execution failed: ${err.message}`,
      });

      throw err;
    }
  }
}
