// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Memory Agent
// Orchestrates memory retrieval, CRUD operations, compression, and decay schedules.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAgent } from "../base-agent";
import type { AgentStatus, AgentRole } from "../../types/agent";
import type { AgentSession } from "../../types/session";
import type {
  MemoryConfiguration,
  MemoryContext,
  MemoryOperation,
  MemoryOperationResult,
  MemoryOperationStatus,
  MemoryEntry,
} from "../../types/memory";
import { UnifiedMemoryRetrievalEngine } from "./unified-memory-retrieval";

export class MemoryAgent extends BaseAgent {
  private configOverride: MemoryConfiguration = {};
  private unifiedRetrievalEngine?: UnifiedMemoryRetrievalEngine;
  private activeMemories = new Map<string, MemoryEntry>(); // mock long-term repository backup

  constructor() {
    super({
      id: "memory-agent",
      metadata: {
        id: "memory-agent",
        name: "Memory Agent",
        description: "Specialized agent for managing working, conversation, long-term, and semantic memories.",
        version: "2.0.0",
        author: "ForgeFlow AI",
      },
      capabilities: {
        canPlan: false,
        canExecute: false,
        canSearchCode: false,
        canEditCode: false,
        canAccessMemory: true,
        canUseTools: false,
      },
      role: "memory" as AgentRole,
    });

    // Populate with mock initial memories for search/retrieval checks
    this.activeMemories.set("mem-user-1", {
      id: "mem-user-1",
      scope: "global",
      key: "user_name",
      value: "Alex Johnson",
      type: "long-term",
      importance: 0.9,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: null,
    });
    this.activeMemories.set("mem-project-1", {
      id: "mem-project-1",
      scope: "workflow",
      key: "project_name",
      value: "ForgeFlow AI Platform",
      type: "long-term",
      importance: 0.8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: null,
    });
  }

  setConfiguration(config: MemoryConfiguration): void {
    this.configOverride = {
      enableAutoArchive: true,
      maxEntriesLimit: 1000,
      decayThreshold: 0.2,
      conflictResolutionStrategy: "merge",
      ...config,
    };
  }

  /**
   * Task 14.5B: Bind UnifiedMemoryRetrievalEngine
   */
  registerRetrievalEngine(engine: UnifiedMemoryRetrievalEngine): void {
    this.unifiedRetrievalEngine = engine;
  }

  async executeStep(session: AgentSession, input: string) {
    const logger: any = session.context.variables.logger || console;
    const agentId = this.getConfig().id;
    const startedAt = Date.now();

    // ── Telemetry: Emit MEMORY_AGENT_STARTED ──
    logger.info(`Memory agent started execution`, { event: "MEMORY_AGENT_STARTED" }, agentId);

    // 1. Resolve transaction payload
    let payload: MemoryOperation;
    try {
      payload = JSON.parse(input);
    } catch (e) {
      // Fallback to variables
      payload = {
        type: (session.context.variables.memoryOperation || "search") as any,
        scope: (session.context.variables.memoryScope || "global") as any,
        key: session.context.variables.memoryKey ? String(session.context.variables.memoryKey) : undefined,
        value: session.context.variables.memoryValue ? String(session.context.variables.memoryValue) : undefined,
        memoryId: session.context.variables.memoryId ? String(session.context.variables.memoryId) : undefined,
        targetMemoryIds: Array.isArray(session.context.variables.targetMemoryIds)
          ? (session.context.variables.targetMemoryIds as string[])
          : undefined,
      };
    }

    const { type: operationType, scope, key, value, memoryId, targetMemoryIds } = payload;

    const memoryContext: MemoryContext = {
      sessionId: session.id,
      variables: { ...session.context.variables },
      operationStatus: "running" as MemoryOperationStatus,
      affectedMemoryIds: [],
    };

    let outputText = "";
    const affectedMemoryIds: string[] = [];
    let importance = 0.5;
    const confidence = 0.95;
    const relationships: string[] = [];

    // 2. Dispatch Memory Operations (Task 14.5C)
    switch (operationType) {
      case "create": {
        const id = memoryId || `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const entry: MemoryEntry = {
          id,
          scope,
          key: key || "key",
          value: value || "value",
          type: "long-term",
          importance: 0.7,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: null,
          metadata: payload.metadata,
        };

        // Task 14.5D Optimization: Conflict Resolution & Duplicate Detection
        const existingConflict = Array.from(this.activeMemories.values()).find(
          (m) => m.key === entry.key && m.scope === entry.scope
        );

        if (existingConflict) {
          const strategy = this.configOverride.conflictResolutionStrategy || "merge";
          if (strategy === "merge") {
            const mergedVal = `${existingConflict.value} | ${entry.value}`;
            existingConflict.value = mergedVal;
            existingConflict.updatedAt = new Date().toISOString();
            existingConflict.importance = Math.min(1.0, existingConflict.importance + 0.1); // Importance Recalculation
            affectedMemoryIds.push(existingConflict.id);
            // Telemetry: Emit MEMORY_MERGED
            logger.info(`Conflicting memories merged`, { event: "MEMORY_MERGED", memoryId: existingConflict.id }, agentId);
            outputText = `Merged conflicting memory entry "${entry.key}".`;
          } else if (strategy === "overwrite") {
            this.activeMemories.set(existingConflict.id, {
              ...existingConflict,
              value: entry.value,
              updatedAt: new Date().toISOString(),
            });
            affectedMemoryIds.push(existingConflict.id);
            // Telemetry: Emit MEMORY_UPDATED
            logger.info(`Memory entry overwritten`, { event: "MEMORY_UPDATED", memoryId: existingConflict.id }, agentId);
            outputText = `Overwrote existing memory entry "${entry.key}".`;
          } else {
            // ignore
            outputText = `Ignored new memory entry "${entry.key}" due to conflict resolution configuration.`;
          }
        } else {
          this.activeMemories.set(id, entry);
          affectedMemoryIds.push(id);
          // Telemetry: Emit MEMORY_CREATED
          logger.info(`New memory entry created`, { event: "MEMORY_CREATED", memoryId: id }, agentId);
          outputText = `Created memory entry "${entry.key}".`;
        }
        break;
      }

      case "update": {
        if (!memoryId) throw new Error("Memory ID is required for update operation.");
        const existing = this.activeMemories.get(memoryId);
        if (!existing) throw new Error(`Memory entry not found matching ID: "${memoryId}"`);

        existing.value = value || existing.value;
        existing.updatedAt = new Date().toISOString();
        existing.importance = Math.min(1.0, existing.importance + 0.05); // Recalculate importance on updates
        affectedMemoryIds.push(memoryId);

        // Telemetry: Emit MEMORY_UPDATED
        logger.info(`Memory entry updated`, { event: "MEMORY_UPDATED", memoryId }, agentId);
        outputText = `Updated memory entry "${existing.key}".`;
        break;
      }

      case "delete": {
        if (!memoryId) throw new Error("Memory ID is required for delete operation.");
        const exists = this.activeMemories.has(memoryId);
        if (exists) {
          this.activeMemories.delete(memoryId);
          affectedMemoryIds.push(memoryId);
        }
        outputText = `Deleted memory entry ID "${memoryId}".`;
        break;
      }

      case "archive": {
        if (!memoryId) throw new Error("Memory ID is required for archive operation.");
        const existing = this.activeMemories.get(memoryId);
        if (existing) {
          existing.metadata = { ...existing.metadata, archived: true };
          existing.updatedAt = new Date().toISOString();
          affectedMemoryIds.push(memoryId);
          // Telemetry: Emit MEMORY_ARCHIVED
          logger.info(`Memory entry archived`, { event: "MEMORY_ARCHIVED", memoryId }, agentId);
        }
        outputText = `Archived memory entry ID "${memoryId}".`;
        break;
      }

      case "restore": {
        if (!memoryId) throw new Error("Memory ID is required for restore operation.");
        const existing = this.activeMemories.get(memoryId);
        if (existing) {
          existing.metadata = { ...existing.metadata, archived: false };
          existing.updatedAt = new Date().toISOString();
          affectedMemoryIds.push(memoryId);
          // Telemetry: Emit MEMORY_RESTORED
          logger.info(`Memory entry restored`, { event: "MEMORY_RESTORED", memoryId }, agentId);
        }
        outputText = `Restored memory entry ID "${memoryId}".`;
        break;
      }

      case "merge": {
        if (!targetMemoryIds || targetMemoryIds.length < 2) {
          throw new Error("Target Memory IDs array containing at least two keys is required for merge.");
        }
        const values: string[] = [];
        const mergedKeys: string[] = [];
        let maxImportance = 0.1;

        for (const id of targetMemoryIds) {
          const entry = this.activeMemories.get(id);
          if (entry) {
            values.push(entry.value);
            mergedKeys.push(entry.key);
            maxImportance = Math.max(maxImportance, entry.importance);
            this.activeMemories.delete(id); // delete original entry
            affectedMemoryIds.push(id);
          }
        }

        const newId = `merged-${Date.now()}`;
        const mergedEntry: MemoryEntry = {
          id: newId,
          scope: scope || "global",
          key: `merged_keys:_${mergedKeys.join("_and_")}`,
          value: values.join(" | "),
          type: "long-term",
          importance: Math.min(1.0, maxImportance + 0.1),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: null,
          metadata: { mergedSources: targetMemoryIds },
        };

        this.activeMemories.set(newId, mergedEntry);
        affectedMemoryIds.push(newId);

        // Telemetry: Emit MEMORY_MERGED
        logger.info(`Multiple memories merged`, { event: "MEMORY_MERGED", memoryId: newId, sources: targetMemoryIds }, agentId);
        outputText = `Merged target memory IDs into new ID "${newId}".`;
        break;
      }

      case "split": {
        if (!memoryId) throw new Error("Memory ID is required for split operation.");
        const existing = this.activeMemories.get(memoryId);
        if (!existing) throw new Error(`Memory entry not found matching ID: "${memoryId}"`);

        const parts = existing.value.split("|").map(p => p.trim());
        this.activeMemories.delete(memoryId);
        affectedMemoryIds.push(memoryId);

        parts.forEach((part, index) => {
          const splitId = `${memoryId}-split-${index}`;
          this.activeMemories.set(splitId, {
            id: splitId,
            scope: existing.scope,
            key: `${existing.key}_part_${index}`,
            value: part,
            type: existing.type,
            importance: Math.max(0.1, existing.importance - 0.1), // Split memory importance decay
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            expiresAt: null,
            metadata: { splitFrom: memoryId },
          });
          affectedMemoryIds.push(splitId);
        });

        outputText = `Split memory entry ID "${memoryId}" into ${parts.length} smaller segments.`;
        break;
      }

      case "expire": {
        // Enforce decay scheduling & TTL sweep (Task 14.5D Optimization)
        const threshold = this.configOverride.decayThreshold || 0.2;
        let expiredCount = 0;

        for (const [id, entry] of this.activeMemories.entries()) {
          // Check decay: reduce importance slightly over time (simulated decay scan)
          entry.importance = Math.max(0.0, Number((entry.importance - 0.05).toFixed(2)));
          if (entry.importance <= threshold) {
            this.activeMemories.delete(id);
            affectedMemoryIds.push(id);
            expiredCount++;
          }
        }
        outputText = `TTL expiration sweep completed. Removed ${expiredCount} decayed memories.`;
        break;
      }

      case "search":
      default: {
        const queryText = key || value || input;
        let searchResults: MemoryEntry[] = [];

        if (this.unifiedRetrievalEngine) {
          searchResults = await this.unifiedRetrievalEngine.retrieve(queryText, { minImportance: 0.1 }, {}, 10);
        } else {
          // Fallback search through active local backups
          searchResults = Array.from(this.activeMemories.values()).filter(
            (m) =>
              m.key.toLowerCase().includes(queryText.toLowerCase()) ||
              m.value.toLowerCase().includes(queryText.toLowerCase())
          );
        }

        searchResults.forEach((res) => affectedMemoryIds.push(res.id));

        // Telemetry: Emit MEMORY_SEARCH_COMPLETED
        logger.info(`Memory search query finished`, { event: "MEMORY_SEARCH_COMPLETED", query: queryText, count: searchResults.length }, agentId);
        outputText = `Found ${searchResults.length} memories matching search query.`;
        break;
      }
    }

    const durationMs = Date.now() - startedAt;
    memoryContext.operationStatus = "completed";
    memoryContext.affectedMemoryIds = affectedMemoryIds;

    // 3. Expose details to Execution Inspector (Task 14.5F)
    const memoryResult: MemoryResultWrapper = {
      operation: operationType,
      success: true,
      affectedMemoryIds,
      importance,
      confidence,
      relationships,
      durationMs,
    };

    // ── Telemetry: Emit MEMORY_AGENT_COMPLETED ──
    logger.info(`Memory agent finished execution`, { event: "MEMORY_AGENT_COMPLETED" }, agentId);

    return {
      output: outputText,
      newStatus: "completed" as AgentStatus,
      metadata: {
        memoryResult,
        memoryContext,
      },
    };
  }
}

// Helper wrapper to enforce type checks on return metadata values
interface MemoryResultWrapper extends MemoryOperationResult {
  relationships: string[];
}
