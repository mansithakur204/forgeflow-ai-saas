// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Execution History Store
// In-memory store for workflow runs, agent runs, and the unified activity log.
// Consumed by the Dashboard API to drive live statistics and the activity feed.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

export type RunStatus = "completed" | "failed" | "running" | "pending";

export interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  workflowName: string;
  status: RunStatus;
  /** Duration in milliseconds — null when still running */
  durationMs: number | null;
  startedAt: string; // ISO 8601
  finishedAt: string | null; // ISO 8601
  executedNodes: string[];
  errorMessage: string | null;
}

export interface AgentRunRecord {
  id: string;
  agentId: string;
  agentName: string;
  objective: string;
  status: RunStatus;
  /** Duration in milliseconds — null when still running */
  durationMs: number | null;
  startedAt: string; // ISO 8601
  finishedAt: string | null; // ISO 8601
  toolsUsed: string[];
  memoryAccessed: string[];
  outputSummary: string;
  errorMessage: string | null;
}

export type ActivityEventType =
  | "workflow_run"
  | "agent_run"
  | "knowledge_upload"
  | "knowledge_delete"
  | "memory_cache_purge";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  timestamp: string; // ISO 8601
  status: RunStatus;
  actor: string;
}

// ─── Execution History Store ──────────────────────────────────────────────────

let _runCounter = 0;
function nextId(prefix: string): string {
  _runCounter += 1;
  return `${prefix}-${Date.now()}-${_runCounter}`;
}

const MAX_RECORDS = 500; // cap to avoid unbounded growth

class ExecutionHistoryStore {
  private workflowRuns: WorkflowRunRecord[] = [];
  private agentRuns: AgentRunRecord[] = [];
  private activityLog: ActivityEvent[] = [];

  // ─── Workflow Runs ─────────────────────────────────────────────────────────

  recordWorkflowRun(data: Omit<WorkflowRunRecord, "id">): WorkflowRunRecord {
    const record: WorkflowRunRecord = { id: nextId("wfrun"), ...data };
    this.workflowRuns.unshift(record); // newest first
    if (this.workflowRuns.length > MAX_RECORDS) {
      this.workflowRuns.length = MAX_RECORDS;
    }
    // Mirror to unified activity log
    this.appendActivity({
      type: "workflow_run",
      title: `${record.workflowName} ${record.status === "completed" ? "completed" : record.status === "failed" ? "failed" : "started"}`,
      description:
        record.status === "failed" && record.errorMessage
          ? record.errorMessage
          : record.durationMs !== null
          ? `Completed in ${(record.durationMs / 1000).toFixed(1)}s across ${record.executedNodes.length} node(s)`
          : `Running workflow with ${record.executedNodes.length} node(s)`,
      timestamp: record.finishedAt ?? record.startedAt,
      status: record.status,
      actor: "Automated",
    });
    return record;
  }

  updateWorkflowRun(
    id: string,
    update: Partial<Pick<WorkflowRunRecord, "status" | "durationMs" | "finishedAt" | "errorMessage" | "executedNodes">>
  ): WorkflowRunRecord | null {
    const run = this.workflowRuns.find((r) => r.id === id);
    if (!run) return null;
    Object.assign(run, update);
    return run;
  }

  getWorkflowRuns(workflowId?: string): WorkflowRunRecord[] {
    if (workflowId) return this.workflowRuns.filter((r) => r.workflowId === workflowId);
    return [...this.workflowRuns];
  }

  // ─── Agent Runs ────────────────────────────────────────────────────────────

  recordAgentRun(data: Omit<AgentRunRecord, "id">): AgentRunRecord {
    const record: AgentRunRecord = { id: nextId("agrun"), ...data };
    this.agentRuns.unshift(record);
    if (this.agentRuns.length > MAX_RECORDS) {
      this.agentRuns.length = MAX_RECORDS;
    }
    this.appendActivity({
      type: "agent_run",
      title: `${record.agentName} ${record.status === "completed" ? "completed task" : record.status === "failed" ? "failed" : "started"}`,
      description:
        record.status === "failed" && record.errorMessage
          ? record.errorMessage
          : record.outputSummary || `Agent used ${record.toolsUsed.length} tool(s)`,
      timestamp: record.finishedAt ?? record.startedAt,
      status: record.status,
      actor: record.agentName,
    });
    return record;
  }

  getAgentRuns(agentId?: string): AgentRunRecord[] {
    if (agentId) return this.agentRuns.filter((r) => r.agentId === agentId);
    return [...this.agentRuns];
  }

  // ─── Activity Log ──────────────────────────────────────────────────────────

  appendActivity(data: Omit<ActivityEvent, "id">): ActivityEvent {
    const event: ActivityEvent = { id: nextId("act"), ...data };
    this.activityLog.unshift(event); // newest first
    if (this.activityLog.length > MAX_RECORDS) {
      this.activityLog.length = MAX_RECORDS;
    }
    return event;
  }

  getActivity(limit = 20): ActivityEvent[] {
    return this.activityLog.slice(0, limit);
  }

  // ─── Aggregate Metrics ────────────────────────────────────────────────────

  getWorkflowRunStats() {
    const total = this.workflowRuns.length;
    const completed = this.workflowRuns.filter((r) => r.status === "completed").length;
    const failed = this.workflowRuns.filter((r) => r.status === "failed").length;
    const running = this.workflowRuns.filter((r) => r.status === "running").length;

    const successRate = total > 0 ? Math.round((completed / (completed + failed || 1)) * 100) : 0;

    const completedWithDuration = this.workflowRuns.filter(
      (r) => r.status === "completed" && r.durationMs !== null
    );
    const avgDurationMs =
      completedWithDuration.length > 0
        ? completedWithDuration.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) /
          completedWithDuration.length
        : 0;

    return { total, completed, failed, running, successRate, avgDurationMs };
  }

  getAgentRunStats() {
    const total = this.agentRuns.length;
    const completed = this.agentRuns.filter((r) => r.status === "completed").length;
    const failed = this.agentRuns.filter((r) => r.status === "failed").length;
    const running = this.agentRuns.filter((r) => r.status === "running").length;

    const successRate = total > 0 ? Math.round((completed / (completed + failed || 1)) * 100) : 0;

    return { total, completed, failed, running, successRate };
  }

  /** Returns counts per day for the last N days (workflow + agent runs) */
  getDailyRunTrend(days = 7): { date: string; runs: number; failures: number }[] {
    const result: { date: string; runs: number; failures: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const wfRuns = this.workflowRuns.filter(
        (r) => r.startedAt.startsWith(dateStr)
      );
      const agRuns = this.agentRuns.filter(
        (r) => r.startedAt.startsWith(dateStr)
      );
      const allRuns = [...wfRuns, ...agRuns];
      result.push({
        date: dateStr,
        runs: allRuns.length,
        failures: allRuns.filter((r) => r.status === "failed").length,
      });
    }
    return result;
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

const globalStore = globalThis as unknown as {
  executionHistory: ExecutionHistoryStore | undefined;
};

export const executionHistory: ExecutionHistoryStore =
  globalStore.executionHistory ?? new ExecutionHistoryStore();

if (process.env.NODE_ENV !== "production") {
  globalStore.executionHistory = executionHistory;
}
