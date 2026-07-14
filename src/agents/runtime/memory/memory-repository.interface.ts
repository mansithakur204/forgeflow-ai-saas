// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Memory Repository Interface
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoryEntry, MemorySearchQuery } from "../../types/memory";

export interface IMemoryRepository {
  create(
    entry: Omit<MemoryEntry, "createdAt" | "updatedAt" | "expiresAt"> & { expiresAt?: string | null }
  ): Promise<MemoryEntry>;
  
  update(
    id: string,
    updates: Partial<Omit<MemoryEntry, "id" | "scope" | "type" | "createdAt">>
  ): Promise<MemoryEntry>;
  
  delete(id: string): Promise<void>;
  
  getById(id: string): Promise<MemoryEntry | null>;
  
  search(query: MemorySearchQuery): Promise<MemoryEntry[]>;
  
  createMany(
    entries: (Omit<MemoryEntry, "createdAt" | "updatedAt" | "expiresAt"> & { expiresAt?: string | null })[]
  ): Promise<MemoryEntry[]>;
  
  deleteMany(ids: string[]): Promise<void>;
  
  clear(): Promise<void>;

  // Lifecycle operations (Task 12.1D)
  archive(id: string): Promise<MemoryEntry>;
  expire(id: string): Promise<MemoryEntry>;
}
