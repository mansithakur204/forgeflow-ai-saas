import type { ToolRegistry } from "../tool-registry";
import type { ToolExecutionContext, ToolResult } from "../../../types/tool";
import type {
  ToolChainConfig,
  ToolChainStep,
  ToolChainResult,
} from "../../../types/tool-execution";
import { ToolRuntime } from "../tool-runtime";
import { ParameterResolver } from "./parameter-resolver";

export class ToolChainExecutor {
  private registry: ToolRegistry;
  private parameterResolver: ParameterResolver;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
    this.parameterResolver = new ParameterResolver();
  }

  /**
   * Executes a tool chain based on dependency order and execution strategy.
   */
  async executeChain(
    config: ToolChainConfig,
    context: ToolExecutionContext,
    abortSignal?: AbortSignal
  ): Promise<ToolChainResult> {
    const stepResults = new Map<string, ToolResult>();
    const aggregatedOutputs: Record<string, unknown> = {};

    try {
      // 1. Validate dependencies and detect cycles
      this.validateChain(config.steps);

      // 2. Determine execution order (Topological sort)
      const orderedSteps = this.sortSteps(config.steps);

      // 3. Execution based on mode
      if (config.executionMode === "sequential") {
        for (const step of orderedSteps) {
          if (abortSignal?.aborted) {
            throw new Error("Execution Cancelled: The tool chain execution was aborted.");
          }

          const result = await this.executeStep(step, context, stepResults, abortSignal);
          stepResults.set(step.id, result);
          if (!result.success) {
            throw new Error(`Step execution failed for "${step.id}": ${result.error}`);
          }
          aggregatedOutputs[step.id] = result.output;
        }
      } else {
        // Parallel / Hybrid Execution
        const executionGraph = new Map<string, ToolChainStep>();
        const inDegree = new Map<string, number>();
        const dependents = new Map<string, string[]>();

        for (const step of config.steps) {
          executionGraph.set(step.id, step);
          inDegree.set(step.id, step.dependencies.length);
          for (const dep of step.dependencies) {
            if (!dependents.has(dep)) {
              dependents.set(dep, []);
            }
            dependents.get(dep)!.push(step.id);
          }
        }

        const queue: string[] = [];
        for (const [id, degree] of inDegree.entries()) {
          if (degree === 0) {
            queue.push(id);
          }
        }

        while (queue.length > 0) {
          if (abortSignal?.aborted) {
            throw new Error("Execution Cancelled: The tool chain execution was aborted.");
          }

          const batch = [...queue];
          queue.length = 0; // Clear queue for next level

          const promises = batch.map(async (stepId) => {
            const step = executionGraph.get(stepId)!;
            const result = await this.executeStep(step, context, stepResults, abortSignal);
            stepResults.set(step.id, result);
            if (!result.success) {
              throw new Error(`Step execution failed for "${step.id}": ${result.error}`);
            }
            aggregatedOutputs[step.id] = result.output;

            // Reduce indegree of dependents
            const deps = dependents.get(stepId) || [];
            for (const depId of deps) {
              const currentDegree = inDegree.get(depId)! - 1;
              inDegree.set(depId, currentDegree);
              if (currentDegree === 0) {
                queue.push(depId);
              }
            }
          });

          await Promise.all(promises);
        }
      }

      return {
        success: true,
        stepResults,
        aggregatedOutputs,
      };
    } catch (err: any) {
      return {
        success: false,
        stepResults,
        aggregatedOutputs,
        error: err.message,
      };
    }
  }

  private async executeStep(
    step: ToolChainStep,
    context: ToolExecutionContext,
    stepResults: Map<string, ToolResult>,
    abortSignal?: AbortSignal
  ): Promise<ToolResult> {
    if (abortSignal?.aborted) {
      throw new Error("Execution Cancelled: The tool chain execution was aborted.");
    }

    const tool = this.registry.resolve(step.toolId);
    if (!tool) {
      throw new Error(
        `Step compilation failed: Tool with ID "${step.toolId}" not found in registry.`
      );
    }

    // Resolve parameter templates
    const resolvedParams = this.parameterResolver.resolve(
      step.parametersTemplate,
      context.variables,
      stepResults
    );

    // Build context overrides
    const stepContext: ToolExecutionContext = {
      userId: context.userId,
      sessionId: context.sessionId,
      variables: context.variables,
      timeoutMs: step.timeoutMs ?? context.timeoutMs ?? 10000,
      maxRetries: step.maxRetries ?? context.maxRetries ?? 0,
    };

    const runtime = new ToolRuntime(tool);

    // Support cancellation during tool runtime wait
    if (abortSignal) {
      let resolveCancel: () => void;
      const abortPromise = new Promise<never>((_, reject) => {
        const handler = () => {
          reject(new Error("Execution Cancelled: The tool chain execution was aborted."));
        };
        abortSignal.addEventListener("abort", handler);
        resolveCancel = () => abortSignal.removeEventListener("abort", handler);
      });

      try {
        const result = await Promise.race([
          runtime.invoke(resolvedParams, stepContext),
          abortPromise,
        ]);
        resolveCancel!();
        return result;
      } catch (err) {
        resolveCancel!();
        throw err;
      }
    }

    return runtime.invoke(resolvedParams, stepContext);
  }

  private sortSteps(steps: ToolChainStep[]): ToolChainStep[] {
    const sorted: ToolChainStep[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return;
      if (temp.has(stepId)) {
        throw new Error("Cycle detected in tool dependencies.");
      }

      temp.add(stepId);
      const step = steps.find((s) => s.id === stepId);
      if (step) {
        for (const depId of step.dependencies) {
          visit(depId);
        }
        sorted.push(step);
      }
      temp.delete(stepId);
      visited.add(stepId);
    };

    for (const step of steps) {
      visit(step.id);
    }

    return sorted;
  }

  private validateChain(steps: ToolChainStep[]): void {
    const ids = new Set(steps.map((s) => s.id));
    for (const step of steps) {
      for (const depId of step.dependencies) {
        if (!ids.has(depId)) {
          throw new Error(
            `Dependency Error: Step "${step.id}" depends on undefined step "${depId}".`
          );
        }
      }
    }
  }
}
