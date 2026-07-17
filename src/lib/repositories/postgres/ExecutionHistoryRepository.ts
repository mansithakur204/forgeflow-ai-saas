import { getDb } from "@/lib/db/connection";
import type { IExecutionHistoryRepository } from "../interfaces";
import type { WorkflowRunRecord, AgentRunRecord, ActivityEvent } from "@/lib/execution-history";
import { ExecutionHistoryStore } from "@/lib/execution-history";

export class PostgresExecutionHistoryRepository implements IExecutionHistoryRepository {
  async getWorkflowRuns(workflowId?: string): Promise<WorkflowRunRecord[]> {
    const db = getDb();
    const rows = workflowId
      ? await db`SELECT * FROM workflow_runs WHERE workflow_id = ${workflowId} ORDER BY started_at DESC`
      : await db`SELECT * FROM workflow_runs ORDER BY started_at DESC`;

    return rows.map((r: any) => ({
      id: r.id,
      workflowId: r.workflowId,
      workflowName: r.workflowName,
      status: r.status,
      durationMs: r.durationMs !== null ? Number(r.durationMs) : null,
      startedAt: new Date(r.startedAt).toISOString(),
      finishedAt: r.finishedAt ? new Date(r.finishedAt).toISOString() : null,
      executedNodes: typeof r.executedNodes === "string" ? JSON.parse(r.executedNodes) : r.executedNodes,
      errorMessage: r.errorMessage,
    }));
  }

  async recordWorkflowRun(run: WorkflowRunRecord): Promise<WorkflowRunRecord> {
    const db = getDb();
    await db`
      INSERT INTO workflow_runs (id, workflow_id, workflow_name, status, duration_ms, started_at, finished_at, executed_nodes, error_message)
      VALUES (${run.id}, ${run.workflowId}, ${run.workflowName}, ${run.status}, ${run.durationMs}, ${run.startedAt}, ${run.finishedAt}, ${db.json(run.executedNodes)}, ${run.errorMessage})
    `;
    return run;
  }

  async updateWorkflowRun(id: string, update: Partial<WorkflowRunRecord>): Promise<WorkflowRunRecord | null> {
    const db = getDb();
    const [row] = await db`SELECT * FROM workflow_runs WHERE id = ${id}`;
    if (!row) return null;

    const newStatus = update.status ?? row.status;
    const newDuration = update.durationMs !== undefined ? update.durationMs : (row.durationMs !== null ? Number(row.durationMs) : null);
    const newFinished = update.finishedAt ?? row.finishedAt;
    const newError = update.errorMessage !== undefined ? update.errorMessage : row.errorMessage;
    const newNodes = update.executedNodes ?? (typeof row.executedNodes === "string" ? JSON.parse(row.executedNodes) : row.executedNodes);

    await db`
      UPDATE workflow_runs
      SET status = ${newStatus},
          duration_ms = ${newDuration},
          finished_at = ${newFinished},
          error_message = ${newError},
          executed_nodes = ${db.json(newNodes)}
      WHERE id = ${id}
    `;

    return {
      id,
      workflowId: row.workflowId,
      workflowName: row.workflowName,
      status: newStatus,
      durationMs: newDuration,
      startedAt: new Date(row.startedAt).toISOString(),
      finishedAt: newFinished ? new Date(newFinished).toISOString() : null,
      executedNodes: newNodes,
      errorMessage: newError,
    };
  }

  async getAgentRuns(agentId?: string): Promise<AgentRunRecord[]> {
    const db = getDb();
    const rows = agentId
      ? await db`SELECT * FROM agent_runs WHERE agent_id = ${agentId} ORDER BY started_at DESC`
      : await db`SELECT * FROM agent_runs ORDER BY started_at DESC`;

    return rows.map((r: any) => ({
      id: r.id,
      agentId: r.agentId,
      agentName: r.agentName,
      objective: r.objective,
      status: r.status,
      durationMs: r.durationMs !== null ? Number(r.durationMs) : null,
      startedAt: new Date(r.startedAt).toISOString(),
      finishedAt: r.finishedAt ? new Date(r.finishedAt).toISOString() : null,
      toolsUsed: typeof r.toolsUsed === "string" ? JSON.parse(r.toolsUsed) : r.toolsUsed,
      memoryAccessed: typeof r.memoryAccessed === "string" ? JSON.parse(r.memoryAccessed) : r.memoryAccessed,
      outputSummary: r.outputSummary,
      errorMessage: r.errorMessage,
    }));
  }

  async recordAgentRun(run: AgentRunRecord): Promise<AgentRunRecord> {
    const db = getDb();
    await db`
      INSERT INTO agent_runs (id, agent_id, agent_name, objective, status, duration_ms, started_at, finished_at, tools_used, memory_accessed, output_summary, error_message)
      VALUES (${run.id}, ${run.agentId}, ${run.agentName}, ${run.objective}, ${run.status}, ${run.durationMs}, ${run.startedAt}, ${run.finishedAt}, ${db.json(run.toolsUsed)}, ${db.json(run.memoryAccessed)}, ${run.outputSummary}, ${run.errorMessage})
    `;
    return run;
  }

  async getActivity(limit = 20): Promise<ActivityEvent[]> {
    const db = getDb();
    const rows = await db`SELECT * FROM activity_events ORDER BY timestamp DESC LIMIT ${limit}`;
    return rows.map((r: any) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      timestamp: new Date(r.timestamp).toISOString(),
      status: r.status,
      actor: r.actor,
    }));
  }

  async recordActivity(event: ActivityEvent): Promise<ActivityEvent> {
    const db = getDb();
    await db`
      INSERT INTO activity_events (id, type, title, description, timestamp, status, actor)
      VALUES (${event.id}, ${event.type}, ${event.title}, ${event.description}, ${event.timestamp}, ${event.status}, ${event.actor})
    `;
    return event;
  }
}

export class PostgresExecutionHistoryStore extends ExecutionHistoryStore {
  constructor(private repo: IExecutionHistoryRepository) {
    super();
  }

  async loadFromDb() {
    try {
      const runs = await this.repo.getWorkflowRuns();
      const agRuns = await this.repo.getAgentRuns();
      const activities = await this.repo.getActivity(500);

      (this as any).workflowRuns = runs;
      (this as any).agentRuns = agRuns;
      (this as any).activityLog = activities;
    } catch (err) {
      console.error("[PostgresExecutionHistoryStore] Failed to load execution history from DB:", err);
    }
  }

  recordWorkflowRun(data: Omit<WorkflowRunRecord, "id">): WorkflowRunRecord {
    const record = super.recordWorkflowRun(data);
    this.repo.recordWorkflowRun(record).catch((err) =>
      console.error("[PostgresExecutionHistoryStore] Failed to persist workflow run:", err)
    );
    return record;
  }

  updateWorkflowRun(
    id: string,
    update: Partial<Pick<WorkflowRunRecord, "status" | "durationMs" | "finishedAt" | "errorMessage" | "executedNodes">>
  ): WorkflowRunRecord | null {
    const record = super.updateWorkflowRun(id, update);
    if (record) {
      this.repo.updateWorkflowRun(id, update).catch((err) =>
        console.error("[PostgresExecutionHistoryStore] Failed to update workflow run:", err)
      );
    }
    return record;
  }

  recordAgentRun(data: Omit<AgentRunRecord, "id">): AgentRunRecord {
    const record = super.recordAgentRun(data);
    this.repo.recordAgentRun(record).catch((err) =>
      console.error("[PostgresExecutionHistoryStore] Failed to persist agent run:", err)
    );
    return record;
  }

  appendActivity(data: Omit<ActivityEvent, "id">): ActivityEvent {
    const event = super.appendActivity(data);
    this.repo.recordActivity(event).catch((err) =>
      console.error("[PostgresExecutionHistoryStore] Failed to persist activity event:", err)
    );
    return event;
  }
}
