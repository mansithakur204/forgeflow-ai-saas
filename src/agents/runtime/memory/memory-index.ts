import type { MemoryEntry } from "../../types/memory";

export class MemoryIndex {
  private keyMap = new Map<string, Set<string>>(); // key.toLowerCase() -> Set of entry IDs
  private typeMap = new Map<string, Set<string>>(); // type -> Set of entry IDs

  /**
   * Index an entry for fast lookups.
   */
  index(entry: MemoryEntry): void {
    const key = entry.key.toLowerCase().trim();
    if (!this.keyMap.has(key)) {
      this.keyMap.set(key, new Set<string>());
    }
    this.keyMap.get(key)!.add(entry.id);

    if (!this.typeMap.has(entry.type)) {
      this.typeMap.set(entry.type, new Set<string>());
    }
    this.typeMap.get(entry.type)!.add(entry.id);
  }

  /**
   * De-index an entry on deletion.
   */
  deindex(entry: MemoryEntry): void {
    const key = entry.key.toLowerCase().trim();
    if (this.keyMap.has(key)) {
      this.keyMap.get(key)!.delete(entry.id);
      if (this.keyMap.get(key)!.size === 0) {
        this.keyMap.delete(key);
      }
    }

    if (this.typeMap.has(entry.type)) {
      this.typeMap.get(entry.type)!.delete(entry.id);
      if (this.typeMap.get(entry.type)!.size === 0) {
        this.typeMap.delete(entry.type);
      }
    }
  }

  resolveIdsByKey(key: string): string[] {
    return Array.from(this.keyMap.get(key.toLowerCase().trim()) || []);
  }

  resolveIdsByType(type: string): string[] {
    return Array.from(this.typeMap.get(type) || []);
  }

  clear(): void {
    this.keyMap.clear();
    this.typeMap.clear();
  }

  /**
   * Deduplicates a list of memory entries by matching keys.
   */
  deduplicate(entries: MemoryEntry[]): MemoryEntry[] {
    const unique = new Map<string, MemoryEntry>();

    for (const entry of entries) {
      const matchKey = `${entry.type}:${entry.key.toLowerCase().trim()}`;
      const existing = unique.get(matchKey);

      if (existing) {
        const existingTime = new Date(existing.updatedAt).getTime();
        const entryTime = new Date(entry.updatedAt).getTime();

        if (entry.importance > existing.importance) {
          unique.set(matchKey, entry);
        } else if (entry.importance === existing.importance && entryTime > existingTime) {
          unique.set(matchKey, entry);
        }
      } else {
        unique.set(matchKey, entry);
      }
    }

    return Array.from(unique.values());
  }

  /**
   * Checks if an incoming value is a duplicate of an existing value.
   */
  isDuplicateValue(existingValue: string, newValue: string): boolean {
    const v1 = existingValue.toLowerCase().trim();
    const v2 = newValue.toLowerCase().trim();
    if (v1 === v2) return true;

    // Fuzzy comparison similarity check
    const similarity = this.calculateSimilarity(v1, v2);
    return similarity > 0.85; // 85% similarity threshold
  }

  private calculateSimilarity(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    if (len1 === 0) {
      return len2 === 0 ? 1 : 0;
    }
    if (len2 === 0) {
      return 0;
    }

    const costs = new Array<number>();
    for (let j = 0; j <= len2; j++) {
      costs[j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      costs[0] = i;
      let nw = i - 1;
      for (let j = 1; j <= len2; j++) {
        const cj = Math.min(
          1 + Math.min(costs[j], costs[j - 1]),
          s1[i - 1] === s2[j - 1] ? nw : nw + 1
        );
        nw = costs[j];
        costs[j] = cj;
      }
    }

    const editDistance = costs[len2];
    return 1 - editDistance / Math.max(len1, len2);
  }
}
