import type { AgentRegistry } from "../agent-registry";
import type { AgentRuntimeCoordinator } from "../agent-runtime-coordinator";
import type { AgentMessageBus } from "../orchestration/message-bus";
import type { ExecutionPlan, PlanningTask, TaskStatus, HandoffRequest } from "../../types/planning";
import { SharedPlanningContext } from "./shared-planning-context";
import { CollaborationGraph } from "./collaboration-graph";
import { ExecutionStrategyManager } from "./execution-strategy-manager";
import { AgentHandoffManager } from "./agent-handoff-manager";
import { FailureRecoveryStrategy } from "./failure-recovery-strategy";
import { RetryPlanning } from "./retry-planning";
import type { AgentSession } from "../../types/session";

export class PlanningCoordinator {
  private registry: AgentRegistry;
  private coordinator: AgentRuntimeCoordinator;
  private messageBus: AgentMessageBus;
  private strategyManager: ExecutionStrategyManager;
  private handoffManager: AgentHandoffManager;
  private recoveryStrategy: FailureRecoveryStrategy;
  private retryPlanner: RetryPlanning;

  constructor(
    registry: AgentRegistry,
    coordinator: AgentRuntimeCoordinator,
    messageBus: AgentMessageBus
  ) {
    this.registry = registry;
    this.coordinator = coordinator;
    this.messageBus = messageBus;
    this.strategyManager = new ExecutionStrategyManager();
    this.handoffManager = new AgentHandoffManager();
    this.recoveryStrategy = new FailureRecoveryStrategy();
    this.retryPlanner = new RetryPlanning(registry);
  }

  /**
   * Executes a multi-agent plan to completion, coordinating concurrency, telemetry, context handoffs, and recovery.
   */
  async executePlan(
    plan: ExecutionPlan,
    initialInputs?: Record<string, unknown>
  ): Promise<{
    plan: ExecutionPlan;
    context: SharedPlanningContext;
    status: "completed" | "failed";
  }> {
    const context = new SharedPlanningContext(initialInputs);
    let graph = new CollaborationGraph(plan.tasks);

    plan.status = "running";
    plan.updatedAt = new Date().toISOString();

    this.messageBus.publish("plan:started", "coordinator", { planId: plan.id });

    // Track active agent sessions mapped by agentId
    const agentSessions = new Map<string, AgentSession>();

    try {
      while (true) {
        const planStatus = this.strategyManager.checkPlanStatus(plan, graph);
        if (planStatus === "completed" || planStatus === "failed") {
          plan.status = planStatus;
          plan.updatedAt = new Date().toISOString();
          break;
        }

        const runnable = this.strategyManager.getNextBatch(plan, graph);
        if (runnable.length === 0) {
          // If tasks are still pending but none are runnable, we have a stall/deadlock
          plan.status = "failed";
          plan.updatedAt = new Date().toISOString();
          this.messageBus.publish("plan:failed", "coordinator", {
            planId: plan.id,
            error: "Deadlock: Pending tasks are not runnable due to unsatisfied dependencies.",
          });
          break;
        }

        // Execute batch tasks concurrently
        const promises = runnable.map(async (task) => {
          task.status = "running";
          task.updatedAt = new Date().toISOString();

          this.messageBus.publish("task:started", "coordinator", {
            planId: plan.id,
            taskId: task.id,
          });

          // Resolve assigned agent
          const agentId = task.assignedAgentId || "tool-agent";
          const runtime = this.coordinator.getRuntime(agentId);

          // Get or create agent execution session
          let session = agentSessions.get(agentId);
          if (!session || session.status === "failed" || session.status === "completed") {
            session = runtime.createSession(`sess-${plan.id}-${agentId}-${Date.now()}`);
            agentSessions.set(agentId, session);
          }

          // Inject current shared context variables into agent context
          session.context.variables = {
            ...session.context.variables,
            ...context.getAll(),
          };

          try {
            // Run execution step
            const output = await runtime.runStep(session, task.description);

            task.status = "completed";
            task.result = output;
            task.updatedAt = new Date().toISOString();

            // Save task outputs to context
            context.set(`task:${task.id}:result`, output);
            for (const outVar of task.outputVariables) {
              context.set(outVar, output);
            }

            context.logHistory({
              taskId: task.id,
              agentId,
              status: "completed",
              result: output,
            });

            this.messageBus.publish("task:completed", agentId, {
              planId: plan.id,
              taskId: task.id,
              output,
            });

            // Perform automatic handoffs to next dependent tasks
            const dependents = graph.getDependents(task.id);
            for (const depId of dependents) {
              const depTask = graph.getTask(depId);
              if (depTask && depTask.assignedAgentId && depTask.assignedAgentId !== agentId) {
                const handoffReq: HandoffRequest = {
                  fromAgentId: agentId,
                  toAgentId: depTask.assignedAgentId,
                  taskId: depTask.id,
                  payload: {
                    [`handoff:from:${task.id}:output`]: output,
                  },
                };
                await this.handoffManager.executeHandoff(handoffReq, context);
              }
            }
          } catch (err: any) {
            const errorMsg = err.message || "Unknown execution error";
            task.error = errorMsg;
            task.updatedAt = new Date().toISOString();

            context.logHistory({
              taskId: task.id,
              agentId,
              status: "failed",
              error: errorMsg,
            });

            this.messageBus.publish("task:failed", agentId, {
              planId: plan.id,
              taskId: task.id,
              error: errorMsg,
            });

            // Evaluate Failure Recovery Strategy
            const decision = this.recoveryStrategy.evaluate(task, errorMsg);

            if (decision.action === "retry") {
              if (decision.delayMs && decision.delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, decision.delayMs));
              }
              this.retryPlanner.prepareRetry(task);
              this.messageBus.publish("task:retry", "coordinator", {
                planId: plan.id,
                taskId: task.id,
                attempt: task.retryCount,
                reason: decision.reason,
              });
            } else if (decision.action === "replan") {
              this.retryPlanner.executeReplan(plan, task.id, errorMsg);
              // Recompute graph structure from mutated plan tasks list
              graph = new CollaborationGraph(plan.tasks);
              this.messageBus.publish("plan:replan", "coordinator", {
                planId: plan.id,
                failedTaskId: task.id,
                reason: decision.reason,
              });
            } else if (decision.action === "ignore") {
              task.status = "skipped" as TaskStatus;
              this.messageBus.publish("task:skipped", "coordinator", {
                planId: plan.id,
                taskId: task.id,
                reason: decision.reason,
              });
            } else {
              // fail action
              task.status = "failed";
              plan.status = "failed";
              plan.updatedAt = new Date().toISOString();
              throw new Error(`Plan execution terminated: Task "${task.title}" failed: ${errorMsg}`);
            }
          }
        });

        // Resolve current batch
        await Promise.all(promises);
      }
    } catch (err: any) {
      plan.status = "failed";
      plan.updatedAt = new Date().toISOString();
      this.messageBus.publish("plan:failed", "coordinator", {
        planId: plan.id,
        error: err.message,
      });
    }

    const finalStatus = plan.status === "completed" ? "completed" : "failed";
    this.messageBus.publish(`plan:${finalStatus}`, "coordinator", { planId: plan.id });

    return {
      plan,
      context,
      status: finalStatus,
    };
  }
}
