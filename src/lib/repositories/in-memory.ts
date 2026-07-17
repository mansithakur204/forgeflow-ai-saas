import type { IWorkflowRepository, IExecutionHistoryRepository } from "./interfaces";
import type { Workflow } from "@/lib/workflow-data";
import type { WorkflowRunRecord, AgentRunRecord, ActivityEvent } from "@/lib/execution-history";
import { executionHistory } from "@/lib/execution-history";

export class InMemoryWorkflowRepository implements IWorkflowRepository {
  constructor(private workflows: Workflow[]) {}

  async findAll(): Promise<Workflow[]> {
    return [...this.workflows];
  }

  async findById(id: string): Promise<Workflow | undefined> {
    return this.workflows.find((w) => w.id === id);
  }

  async save(workflow: Workflow): Promise<Workflow> {
    const idx = this.workflows.findIndex((w) => w.id === workflow.id);
    if (idx > -1) {
      this.workflows[idx] = workflow;
    } else {
      this.workflows.push(workflow);
    }
    return workflow;
  }

  async delete(id: string): Promise<boolean> {
    const idx = this.workflows.findIndex((w) => w.id === id);
    if (idx > -1) {
      this.workflows.splice(idx, 1);
      return true;
    }
    return false;
  }
}

export class InMemoryExecutionHistoryRepository implements IExecutionHistoryRepository {
  async getWorkflowRuns(workflowId?: string): Promise<WorkflowRunRecord[]> {
    return executionHistory.getWorkflowRuns(workflowId);
  }

  async recordWorkflowRun(run: WorkflowRunRecord): Promise<WorkflowRunRecord> {
    return executionHistory.recordWorkflowRun(run);
  }

  async updateWorkflowRun(id: string, update: Partial<WorkflowRunRecord>): Promise<WorkflowRunRecord | null> {
    return executionHistory.updateWorkflowRun(id, update);
  }

  async getAgentRuns(agentId?: string): Promise<AgentRunRecord[]> {
    return executionHistory.getAgentRuns(agentId);
  }

  async recordAgentRun(run: AgentRunRecord): Promise<AgentRunRecord> {
    return executionHistory.recordAgentRun(run);
  }

  async getActivity(limit?: number): Promise<ActivityEvent[]> {
    return executionHistory.getActivity(limit);
  }

  async recordActivity(event: ActivityEvent): Promise<ActivityEvent> {
    return executionHistory.appendActivity(event);
  }
}
