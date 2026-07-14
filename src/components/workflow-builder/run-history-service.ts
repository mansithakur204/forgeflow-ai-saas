import type { WorkflowRunSnapshot, ExecutionLogEntry, TimelineEntry } from "@/engine";

export interface RunHistoryEntry {
  snapshot: WorkflowRunSnapshot;
  logs: ExecutionLogEntry[];
  timelineEntries: TimelineEntry[];
}

export class RunHistoryService {
  private history: RunHistoryEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 20) {
    this.maxEntries = maxEntries;
  }

  add(snapshot: WorkflowRunSnapshot, logs: ExecutionLogEntry[], timelineEntries: TimelineEntry[]): void {
    // Add to the front so the list is ordered newest-runs first
    this.history.unshift({
      snapshot: JSON.parse(JSON.stringify(snapshot)), // deep clone to enforce read-only isolation
      logs: JSON.parse(JSON.stringify(logs)),
      timelineEntries: JSON.parse(JSON.stringify(timelineEntries)),
    });
    // Discard oldest entries beyond maxEntries
    if (this.history.length > this.maxEntries) {
      this.history = this.history.slice(0, this.maxEntries);
    }
  }

  getAll(): RunHistoryEntry[] {
    return [...this.history];
  }

  get(runId: string): RunHistoryEntry | undefined {
    return this.history.find((h) => h.snapshot.run.id === runId);
  }

  clear(): void {
    this.history = [];
  }
}
