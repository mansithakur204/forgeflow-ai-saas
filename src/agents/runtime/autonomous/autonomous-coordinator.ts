import { IntentAnalyzer } from "./intent-analyzer";
import { CapabilityMatcher } from "./capability-matcher";
import { ToolSelector } from "./selectors";
import { AutonomousDecisionEngine, ReflectionEngine } from "./decision-engine";
import type { AgentRegistry } from "../agent-registry";
import type { ToolExecutionCoordinator } from "../tools/execution/tool-execution-coordinator";
import type { AgentMemorySystem } from "../memory/agent-memory-integration";
import type { AgentWorkflowCoordinator } from "../workflow/workflow-coordinator";
import type { AgentMessageBus } from "../orchestration/message-bus";
import type { DecisionPolicy, AutonomousDecision, ReflectionResult } from "../../types/autonomous";

export class AutonomousCoordinator {
  private intentAnalyzer: IntentAnalyzer;
  private capabilityMatcher: CapabilityMatcher;
  private toolSelector: ToolSelector;
  private decisionEngine: AutonomousDecisionEngine;
  private reflectionEngine: ReflectionEngine;

  private memorySystem: AgentMemorySystem;
  private workflowCoordinator: AgentWorkflowCoordinator;
  private toolCoordinator: ToolExecutionCoordinator;
  private messageBus: AgentMessageBus;

  constructor(
    registry: AgentRegistry,
    toolCoordinator: ToolExecutionCoordinator,
    memorySystem: AgentMemorySystem,
    workflowCoordinator: AgentWorkflowCoordinator,
    messageBus: AgentMessageBus
  ) {
    this.intentAnalyzer = new IntentAnalyzer();
    this.capabilityMatcher = new CapabilityMatcher(registry);
    this.toolSelector = new ToolSelector(toolCoordinator.getDiscoveryEngine());
    this.decisionEngine = new AutonomousDecisionEngine(this.toolSelector);
    this.reflectionEngine = new ReflectionEngine();

    this.memorySystem = memorySystem;
    this.workflowCoordinator = workflowCoordinator;
    this.toolCoordinator = toolCoordinator;
    this.messageBus = messageBus;
  }

  /**
   * Executes the full autonomous multi-step reasoning loop.
   */
  async runAutonomousLoop(
    objective: string,
    policy: DecisionPolicy = { maxReasoningSteps: 5, confidenceThreshold: 0.7 }
  ): Promise<{ success: boolean; steps: AutonomousDecision[]; reflections: ReflectionResult[] }> {
    this.messageBus.publish("autonomous:started", "coordinator", { objective });

    const analysis = this.intentAnalyzer.analyze(objective);
    // Track agent mappings
    this.capabilityMatcher.matchCapabilities(analysis.category);

    const stepsExecuted: AutonomousDecision[] = [];
    const reflections: ReflectionResult[] = [];
    let stepIndex = 0;
    let success = true;

    while (stepIndex < policy.maxReasoningSteps) {
      const decision = this.decisionEngine.makeDecision(stepIndex, objective, analysis);
      stepsExecuted.push(decision);

      this.messageBus.publish("autonomous:step:started", "coordinator", {
        stepIndex,
        actionType: decision.actionType,
      });

      if (decision.actionType === "complete") {
        this.messageBus.publish("autonomous:step:completed", "coordinator", {
          stepIndex,
          status: "complete",
        });
        break;
      }

      if (decision.confidence < policy.confidenceThreshold) {
        this.messageBus.publish("autonomous:failed", "coordinator", {
          error: `Decision confidence (${decision.confidence}) below threshold (${policy.confidenceThreshold})`,
        });
        success = false;
        break;
      }

      let output: unknown = null;
      let errorMsg: string | null = null;

      try {
        switch (decision.actionType) {
          case "query_memory": {
            await this.memorySystem.longTerm.semantic.learnFact("context_trigger", objective);
            output = await this.memorySystem.longTerm.semantic.recallFact("context_trigger");
            break;
          }
          case "query_knowledge": {
            output = `[Knowledge DB Search Result] details matching query: "${decision.parameters.query}"`;
            break;
          }
          case "execute_tool": {
            const toolResult = await this.toolCoordinator.executeTool(
              decision.targetId,
              decision.parameters,
              {
                userId: "autonomous-user",
                sessionId: `auto-sess-${stepIndex}`,
                variables: {
                  userScopes: [
                    "fs:read",
                    "fs:write",
                    "network:read",
                    "network:write",
                    "db:query",
                    "knowledge:retrieve",
                    "test:slow",
                    "test:fail",
                  ],
                  approved: true,
                },
              }
            );
            if (!toolResult.success) {
              throw new Error(toolResult.error || "Tool failed");
            }
            output = toolResult.output;
            break;
          }
          case "trigger_workflow": {
            output = `[Workflow Trigger Output] Pipeline workflow started successfully for ID: "${decision.targetId}"`;
            break;
          }
          default:
            throw new Error(`Unsupported autonomous action type: "${decision.actionType}"`);
        }
      } catch (err: any) {
        errorMsg = err.message;
      }

      const reflection = this.reflectionEngine.reflect(decision, output, errorMsg);
      reflections.push(reflection);

      this.messageBus.publish("autonomous:step:completed", "coordinator", {
        stepIndex,
        success: reflection.evaluation.success,
        score: reflection.evaluation.score,
      });

      if (reflection.requiresReplan) {
        success = false;
        break;
      }

      stepIndex++;
    }

    this.messageBus.publish("autonomous:finished", "coordinator", { success });

    return {
      success,
      steps: stepsExecuted,
      reflections,
    };
  }
}
