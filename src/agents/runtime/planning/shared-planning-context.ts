import { SharedMemory } from "../orchestration/shared-memory";

export class SharedPlanningContext {
  private memory: SharedMemory;
  private history: Array<{
    taskId: string;
    agentId: string;
    status: string;
    timestamp: string;
    result?: string;
    error?: string;
  }> = [];

  constructor(initialData?: Record<string, unknown>) {
    this.memory = new SharedMemory();
    if (initialData) {
      for (const [key, value] of Object.entries(initialData)) {
        this.memory.set(key, value);
      }
    }
  }

  set(key: string, value: unknown): void {
    this.memory.set(key, value);
  }

  get<T>(key: string): T | null {
    return this.memory.get<T>(key);
  }

  has(key: string): boolean {
    return this.memory.has(key);
  }

  delete(key: string): void {
    this.memory.delete(key);
  }

  getAll(): Record<string, unknown> {
    return this.memory.getAll();
  }

  logHistory(entry: {
    taskId: string;
    agentId: string;
    status: string;
    result?: string;
    error?: string;
  }): void {
    this.history.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  getHistory() {
    return [...this.history];
  }

  clear(): void {
    this.memory.clear();
    this.history = [];
  }
}
