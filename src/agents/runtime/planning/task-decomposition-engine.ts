import type { PlanningTask, TaskStatus } from "../../types/planning";

export interface IDecompositionStrategy {
  decompose(objective: string): PlanningTask[];
}

export class DefaultDecompositionStrategy implements IDecompositionStrategy {
  decompose(objective: string): PlanningTask[] {
    const cleaned = objective.toLowerCase();
    const tasks: PlanningTask[] = [];

    // Simple rule-based decomposition for standard workflows
    if (cleaned.includes("build") && cleaned.includes("deploy")) {
      tasks.push(
        this.createTask(
          "task-1",
          "Retrieve Source",
          "Search repositories for source code matching the objective",
          "research-agent",
          [],
          ["source_code"]
        ),
        this.createTask(
          "task-2",
          "Generate Module",
          "Implement code modules according to the project objective",
          "coding-agent",
          ["task-1"],
          ["compiled_code"]
        ),
        this.createTask(
          "task-3",
          "Test Assembly",
          "Run tests and verify correctness of generated modules",
          "executor-agent",
          ["task-2"],
          ["test_results"]
        ),
        this.createTask(
          "task-4",
          "Deploy Application",
          "Execute deployment sequence for the compiled codebase",
          "tool-agent",
          ["task-3"],
          ["deployment_status"]
        )
      );
    } else if (cleaned.includes("research") || cleaned.includes("analyze")) {
      tasks.push(
        this.createTask(
          "task-1",
          "Gather Information",
          "Search documentation, web indexes, and APIs for topic information",
          "research-agent",
          [],
          ["knowledge_base"]
        ),
        this.createTask(
          "task-2",
          "Analyze & Summarize",
          "Evaluate gathered data and produce a structured analysis",
          "planner-agent",
          ["task-1"],
          ["analysis_summary"]
        ),
        this.createTask(
          "task-3",
          "Store Insights",
          "Persist structured report to the system memory cache",
          "memory-agent",
          ["task-2"],
          ["storage_status"]
        )
      );
    } else if (cleaned.includes("refactor") || cleaned.includes("code")) {
      tasks.push(
        this.createTask(
          "task-1",
          "Scan Codebase",
          "Search codebase and files to locate target code blocks",
          "research-agent",
          [],
          ["code_blocks"]
        ),
        this.createTask(
          "task-2",
          "Refactor Code",
          "Edit code and write structural improvements",
          "coding-agent",
          ["task-1"],
          ["refactored_code"]
        ),
        this.createTask(
          "task-3",
          "Verify Code Changes",
          "Execute code and compile to confirm build passes",
          "executor-agent",
          ["task-2"],
          ["build_status"]
        )
      );
    } else {
      // General fall-back sequential pipeline
      tasks.push(
        this.createTask(
          "task-1",
          "Planning & Strategy",
          `Analyze objective: "${objective}" and formulate steps.`,
          "planner-agent",
          [],
          ["execution_strategy"]
        ),
        this.createTask(
          "task-2",
          "Information Discovery",
          "Discover resources and query context parameters.",
          "research-agent",
          ["task-1"],
          ["discovery_data"]
        ),
        this.createTask(
          "task-3",
          "Core Operations",
          "Perform computation, run scripts, or compile modifications.",
          "executor-agent",
          ["task-2"],
          ["execution_result"]
        ),
        this.createTask(
          "task-4",
          "Save Context",
          "Verify output status and store persistent context.",
          "memory-agent",
          ["task-3"],
          ["final_status"]
        )
      );
    }

    return tasks;
  }

  private createTask(
    id: string,
    title: string,
    description: string,
    agentId: string,
    dependencies: string[],
    outputVars: string[] = []
  ): PlanningTask {
    const timestamp = new Date().toISOString();
    return {
      id,
      title,
      description,
      assignedAgentId: agentId,
      status: "pending" as TaskStatus,
      dependencies,
      retryCount: 0,
      maxRetries: 3,
      recoveryStrategy: "retry",
      inputVariables: [],
      outputVariables: outputVars,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }
}

export class TaskDecompositionEngine {
  private strategy: IDecompositionStrategy;

  constructor(strategy: IDecompositionStrategy = new DefaultDecompositionStrategy()) {
    this.strategy = strategy;
  }

  setStrategy(strategy: IDecompositionStrategy): void {
    this.strategy = strategy;
  }

  decomposeObjective(objective: string): PlanningTask[] {
    if (!objective || objective.trim() === "") {
      throw new Error("Cannot decompose empty objective.");
    }
    return this.strategy.decompose(objective);
  }
}
