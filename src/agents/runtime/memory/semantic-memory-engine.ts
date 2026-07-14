// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Semantic Memory Engine
// Builds and traverses semantic relational graphs of memory node entities.
// ─────────────────────────────────────────────────────────────────────────────

import type { IMemoryRepository } from "./memory-repository.interface";
import type { MemoryEntry } from "../../types/memory";

export type SemanticLinkType =
  | "parent"
  | "child"
  | "related"
  | "derived"
  | "reference"
  | "contradiction"
  | "duplicate"
  | string;

export interface SemanticLink {
  sourceId: string;
  targetId: string;
  type: SemanticLinkType;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export type SemanticMemoryEventType =
  | "SEMANTIC_LINK_CREATED"
  | "SEMANTIC_LINK_REMOVED"
  | "SEMANTIC_GRAPH_UPDATED"
  | "SEMANTIC_MEMORY_MERGED";

export interface SemanticMemoryEvent {
  entryId: string;
  type: SemanticMemoryEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SemanticMemoryOptions {
  repository: IMemoryRepository;
  onEvent?: (event: SemanticMemoryEvent) => void;
}

export class SemanticMemoryEngine {
  private repository: IMemoryRepository;
  private links: SemanticLink[] = [];
  private onEvent?: (event: SemanticMemoryEvent) => void;

  constructor(options: SemanticMemoryOptions) {
    this.repository = options.repository;
    this.onEvent = options.onEvent;
  }

  private emit(entryId: string, type: SemanticMemoryEventType, metadata?: Record<string, unknown>): void {
    if (this.onEvent) {
      this.onEvent({
        entryId,
        type,
        timestamp: new Date().toISOString(),
        metadata,
      });
    }
  }

  /**
   * Task 12.5A: Create Semantic Memory node
   */
  async create(key: string, value: string, metadata: Record<string, unknown> = {}): Promise<MemoryEntry> {
    const now = new Date().toISOString();
    const entryId = `semantic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const entry: MemoryEntry = {
      id: entryId,
      scope: "global",
      key,
      value,
      type: "semantic",
      importance: 0.7,
      createdAt: now,
      updatedAt: now,
      expiresAt: null,
      metadata: {
        ...metadata,
        source: "semantic-memory-engine",
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
    };

    const saved = await this.repository.create(entry);
    this.emit(entryId, "SEMANTIC_GRAPH_UPDATED", { action: "create", key });
    return saved;
  }

  /**
   * Task 12.5A: Update Semantic Memory node
   */
  async update(id: string, value: string): Promise<MemoryEntry> {
    const now = new Date().toISOString();
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error(`Semantic memory entry "${id}" does not exist`);
    }

    const updated = await this.repository.update(id, {
      value,
      updatedAt: now,
      metadata: {
        ...existing.metadata,
        updatedAt: now,
        version: (existing.metadata?.version ?? 1) + 1,
      },
    });

    this.emit(id, "SEMANTIC_GRAPH_UPDATED", { action: "update" });
    return updated;
  }

  /**
   * Task 12.5A: Delete Semantic Memory node
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
    this.links = this.links.filter((link) => link.sourceId !== id && link.targetId !== id);
    this.emit(id, "SEMANTIC_GRAPH_UPDATED", { action: "delete" });
  }

  /**
   * Task 12.5A: Link Nodes
   */
  link(
    sourceId: string,
    targetId: string,
    type: SemanticLinkType,
    confidence = 1.0,
    metadata?: Record<string, unknown>
  ): void {
    const exists = this.links.some(
      (l) => l.sourceId === sourceId && l.targetId === targetId && l.type === type
    );
    if (exists) return;

    const newLink: SemanticLink = {
      sourceId,
      targetId,
      type,
      confidence,
      metadata,
    };
    this.links.push(newLink);
    this.emit(sourceId, "SEMANTIC_LINK_CREATED", { targetId, type, confidence });
  }

  /**
   * Task 12.5A: Unlink Nodes
   */
  unlink(sourceId: string, targetId: string, type?: SemanticLinkType): void {
    this.links = this.links.filter(
      (l) => !(l.sourceId === sourceId && l.targetId === targetId && (!type || l.type === type))
    );
    this.emit(sourceId, "SEMANTIC_LINK_REMOVED", { targetId, type });
  }

  /**
   * Task 12.5A: Merge Nodes
   */
  async merge(targetId: string, sourceId: string): Promise<MemoryEntry> {
    const target = await this.repository.getById(targetId);
    const source = await this.repository.getById(sourceId);

    if (!target || !source) {
      throw new Error("Target and source entries must exist to perform merge operations");
    }

    const mergedValue = `${target.value}\n[Merged Semantic Node]: ${source.value}`;
    const updated = await this.update(targetId, mergedValue);

    this.links = this.links.map((link) => {
      const updatedLink = { ...link };
      if (link.sourceId === sourceId) updatedLink.sourceId = targetId;
      if (link.targetId === sourceId) updatedLink.targetId = targetId;
      return updatedLink;
    });

    await this.delete(sourceId);
    this.emit(targetId, "SEMANTIC_MEMORY_MERGED", { sourceId });
    return updated;
  }

  /**
   * Task 12.5A: Split Node
   */
  async split(id: string, delimiter: string): Promise<MemoryEntry[]> {
    const target = await this.repository.getById(id);
    if (!target) {
      throw new Error(`Semantic memory entry "${id}" does not exist`);
    }

    const parts = target.value.split(delimiter);
    if (parts.length <= 1) return [target];

    const results: MemoryEntry[] = [];
    await this.delete(id);

    for (let i = 0; i < parts.length; i++) {
      const val = parts[i].trim();
      if (val === "") continue;
      const part = await this.create(`${target.key}_split_${i + 1}`, val);
      results.push(part);

      this.link(part.id, target.id, "derived", 0.9);
    }

    return results;
  }

  /**
   * Task 12.5C: Similarity Engine Architectural placeholder
   */
  calculateSimilarity(a: string, b: string): { embedding: number; graph: number; hybrid: number } {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    const wordSim = union.size > 0 ? intersection.size / union.size : 0.0;

    return {
      embedding: wordSim,
      graph: 0.5,
      hybrid: (wordSim + 0.5) / 2,
    };
  }

  /**
   * Task 12.5D: Neighbors traversal with depth limit
   */
  getNeighbors(nodeId: string, maxDepth = 2, currentDepth = 0, visited = new Set<string>()): SemanticLink[] {
    if (currentDepth >= maxDepth || visited.has(nodeId)) {
      return [];
    }

    visited.add(nodeId);
    const directLinks = this.links.filter((l) => l.sourceId === nodeId || l.targetId === nodeId);
    const allLinks = [...directLinks];

    for (const link of directLinks) {
      const neighborId = link.sourceId === nodeId ? link.targetId : link.sourceId;
      const nested = this.getNeighbors(neighborId, maxDepth, currentDepth + 1, visited);
      allLinks.push(...nested);
    }

    const unique = new Map<string, SemanticLink>();
    for (const link of allLinks) {
      unique.set(`${link.sourceId}-${link.targetId}-${link.type}`, link);
    }

    return Array.from(unique.values());
  }

  /**
   * Task 12.5D: Detect cycles
   */
  hasCycle(): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = this.links
        .filter((l) => l.sourceId === nodeId)
        .map((l) => l.targetId);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    const nodeIds = Array.from(
      new Set(this.links.flatMap((link) => [link.sourceId, link.targetId]))
    );

    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) return true;
      }
    }

    return false;
  }

  /**
   * Task 12.5D: Path Search using BFS shortest route
   */
  findPath(startId: string, endId: string): string[] | null {
    if (startId === endId) return [startId];

    const queue: string[][] = [[startId]];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const node = path[path.length - 1];

      const neighbors = this.links
        .filter((l) => l.sourceId === node || l.targetId === node)
        .map((l) => (l.sourceId === node ? l.targetId : l.sourceId));

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          const newPath = [...path, neighbor];
          if (neighbor === endId) {
            return newPath;
          }
          queue.push(newPath);
        }
      }
    }

    return null;
  }
}
