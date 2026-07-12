import type { ITool } from "./tool.interface";

export class ToolRegistry {
  private tools = new Map<string, ITool>();

  /**
   * Registers a tool instance. Throws if matching ID is already registered.
   */
  register(tool: ITool): void {
    const id = tool.getConfig().metadata.id.toLowerCase().trim();
    if (this.tools.has(id)) {
      throw new Error(
        `Duplicate tool registration: Tool with ID "${tool.getConfig().metadata.id}" is already registered`
      );
    }
    this.tools.set(id, tool);
  }

  /**
   * Resolves a registered tool instance.
   */
  resolve(id: string): ITool | null {
    return this.tools.get(id.toLowerCase().trim()) ?? null;
  }

  /**
   * Removes a registered tool.
   */
  unregister(id: string): void {
    this.tools.delete(id.toLowerCase().trim());
  }

  /**
   * Resets registry.
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Returns list of all registered tools.
   */
  list(): ITool[] {
    return Array.from(this.tools.values());
  }
}
