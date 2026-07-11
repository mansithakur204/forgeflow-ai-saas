export class SharedMemory {
  private store = new Map<string, unknown>();

  set(key: string, value: unknown): void {
    this.store.set(key.toLowerCase().trim(), value);
  }

  get<T>(key: string): T | null {
    return (this.store.get(key.toLowerCase().trim()) as T) ?? null;
  }

  has(key: string): boolean {
    return this.store.has(key.toLowerCase().trim());
  }

  delete(key: string): void {
    this.store.delete(key.toLowerCase().trim());
  }

  clear(): void {
    this.store.clear();
  }

  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, val] of this.store.entries()) {
      result[key] = val;
    }
    return result;
  }
}
