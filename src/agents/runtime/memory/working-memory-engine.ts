// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Working Memory Engine Service
// Orchestrates execution-scoped memory transactions, scopes, snapshottings and TTLs.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoryEntry, MemoryImportance } from "../../types/memory";

export type WorkingMemoryEventType =
  | "WORKING_MEMORY_CREATED"
  | "WORKING_MEMORY_UPDATED"
  | "WORKING_MEMORY_CLEARED"
  | "WORKING_MEMORY_EXPIRED";

export interface WorkingMemoryEvent {
  sessionId: string;
  type: WorkingMemoryEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface WorkingMemoryPolicy {
  maxSize?: number;
  ttlMs?: number;
  evictionPolicy?: "LRU" | "FIFO" | "none";
}

export interface WorkingMemorySession {
  id: string;
  scope: "workflow" | "agent" | "tool";
  parentId?: string;
  entries: Map<string, MemoryEntry>;
  lruOrder: string[];
  policy: WorkingMemoryPolicy;
  transactionStack: Map<string, MemoryEntry>[];
}

export class WorkingMemoryEngine {
  private sessions = new Map<string, WorkingMemorySession>();
  private onEvent?: (event: WorkingMemoryEvent) => void;

  constructor(onEvent?: (event: WorkingMemoryEvent) => void) {
    this.onEvent = onEvent;
  }

  private emit(sessionId: string, type: WorkingMemoryEventType, metadata?: Record<string, unknown>): void {
    if (this.onEvent) {
      this.onEvent({
        sessionId,
        type,
        timestamp: new Date().toISOString(),
        metadata,
      });
    }
  }

  /**
   * Task 12.2A: Create Session
   */
  createSession(
    sessionId: string,
    scope: "workflow" | "agent" | "tool",
    parentId?: string,
    policy: WorkingMemoryPolicy = {}
  ): WorkingMemorySession {
    const session: WorkingMemorySession = {
      id: sessionId,
      scope,
      parentId,
      entries: new Map(),
      lruOrder: [],
      policy: {
        maxSize: policy.maxSize ?? 1000,
        ttlMs: policy.ttlMs,
        evictionPolicy: policy.evictionPolicy ?? "LRU",
      },
      transactionStack: [],
    };
    this.sessions.set(sessionId, session);
    this.emit(sessionId, "WORKING_MEMORY_CREATED", { scope, parentId });
    return session;
  }

  /**
   * Task 12.2A: Read
   */
  async read(sessionId: string, key: string): Promise<MemoryEntry | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    await this.applyTtlChecks(session);

    let entry: MemoryEntry | null = session.entries.get(key) ?? null;

    if (!entry && session.parentId) {
      entry = await this.read(session.parentId, key);
    }

    if (entry) {
      this.updateLruOrder(session, key);
      if (entry.metadata) {
        entry.metadata.accessCount = (Number(entry.metadata.accessCount ?? 0)) + 1;
        entry.metadata.lastAccessAt = new Date().toISOString();
      }
    }

    return entry;
  }

  /**
   * Task 12.2A: Write
   */
  async write(
    sessionId: string,
    key: string,
    value: string,
    importance: MemoryImportance = "medium",
    tags: string[] = []
  ): Promise<MemoryEntry> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Working memory session "${sessionId}" does not exist`);
    }

    this.enforceEvictionPolicy(session);

    const now = new Date().toISOString();
    const expiresAt = session.policy.ttlMs ? new Date(Date.now() + session.policy.ttlMs).toISOString() : null;

    const entry: MemoryEntry = {
      id: `working-${sessionId}-${key}-${Date.now()}`,
      scope: session.scope,
      key,
      value,
      type: "working",
      importance: importance === "high" ? 0.9 : importance === "medium" ? 0.5 : 0.2,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      metadata: {
        source: `working-memory-${session.scope}`,
        importance,
        createdAt: now,
        updatedAt: now,
        accessCount: 1,
        lastAccessAt: now,
        tags,
        version: 1,
      },
    };

    session.entries.set(key, entry);
    this.updateLruOrder(session, key);

    this.emit(sessionId, "WORKING_MEMORY_UPDATED", { key, valueSize: value.length });
    return entry;
  }

  /**
   * Task 12.2A: Update
   */
  async update(sessionId: string, key: string, value: string): Promise<MemoryEntry> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Working memory session "${sessionId}" does not exist`);
    }

    const existing = session.entries.get(key);
    if (!existing) {
      return this.write(sessionId, key, value);
    }

    const now = new Date().toISOString();
    const updated: MemoryEntry = {
      ...existing,
      value,
      updatedAt: now,
      metadata: {
        ...existing.metadata,
        updatedAt: now,
        version: (existing.metadata?.version ?? 1) + 1,
      },
    };

    session.entries.set(key, updated);
    this.updateLruOrder(session, key);

    this.emit(sessionId, "WORKING_MEMORY_UPDATED", { key, operation: "update" });
    return updated;
  }

  /**
   * Task 12.2A: Delete
   */
  async delete(sessionId: string, key: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.entries.delete(key);
    session.lruOrder = session.lruOrder.filter((k) => k !== key);
    this.emit(sessionId, "WORKING_MEMORY_UPDATED", { key, operation: "delete" });
  }

  /**
   * Task 12.2A: Clear
   */
  async clear(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.entries.clear();
    session.lruOrder = [];
    this.emit(sessionId, "WORKING_MEMORY_CLEARED");
  }

  /**
   * Task 12.2A: Snapshot
   */
  snapshot(sessionId: string): Record<string, string> {
    const session = this.sessions.get(sessionId);
    if (!session) return {};

    const snapshotData: Record<string, string> = {};
    for (const [key, entry] of session.entries.entries()) {
      snapshotData[key] = entry.value;
    }
    return snapshotData;
  }

  /**
   * Task 12.2A: Restore
   */
  async restore(sessionId: string, snapshotData: Record<string, string>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    await this.clear(sessionId);
    for (const [key, value] of Object.entries(snapshotData)) {
      await this.write(sessionId, key, value);
    }
  }

  /**
   * Task 12.2C: Begin Transaction
   */
  begin(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const backup = new Map<string, MemoryEntry>();
    for (const [k, v] of session.entries.entries()) {
      backup.set(k, { ...v });
    }
    session.transactionStack.push(backup);
  }

  /**
   * Task 12.2C: Commit Transaction
   */
  commit(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.transactionStack.pop();
  }

  /**
   * Task 12.2C: Rollback Transaction
   */
  rollback(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.transactionStack.length === 0) return;

    const backup = session.transactionStack.pop();
    if (backup) {
      session.entries = backup;
      session.lruOrder = Array.from(backup.keys());
    }
  }

  /**
   * Task 12.2C: Checkpoint state
   */
  checkpoint(sessionId: string): void {
    this.begin(sessionId);
  }

  private updateLruOrder(session: WorkingMemorySession, key: string): void {
    session.lruOrder = session.lruOrder.filter((k) => k !== key);
    session.lruOrder.push(key);
  }

  private enforceEvictionPolicy(session: WorkingMemorySession): void {
    if (!session.policy.maxSize || session.entries.size < session.policy.maxSize) {
      return;
    }

    if (session.policy.evictionPolicy === "LRU") {
      const oldestKey = session.lruOrder.shift();
      if (oldestKey) {
        session.entries.delete(oldestKey);
      }
    } else if (session.policy.evictionPolicy === "FIFO") {
      const oldestKey = Array.from(session.entries.keys()).shift();
      if (oldestKey) {
        session.entries.delete(oldestKey);
        session.lruOrder = session.lruOrder.filter((k) => k !== oldestKey);
      }
    }
  }

  private async applyTtlChecks(session: WorkingMemorySession): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of session.entries.entries()) {
      if (entry.expiresAt && new Date(entry.expiresAt).getTime() < now) {
        session.entries.delete(key);
        session.lruOrder = session.lruOrder.filter((k) => k !== key);
        this.emit(session.id, "WORKING_MEMORY_EXPIRED", { key });
      }
    }
  }
}
