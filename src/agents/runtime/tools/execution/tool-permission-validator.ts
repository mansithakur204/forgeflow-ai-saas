import type { ITool } from "../tool.interface";
import type { ToolExecutionContext } from "../../../types/tool";

export class ToolPermissionValidator {
  private readOnlyScopes = new Set<string>([
    "fs:read",
    "network:read",
    "db:query",
    "knowledge:retrieve",
    "search",
  ]);

  /**
   * Validates if the execution context satisfies permission rules and scopes for the tool.
   */
  validate(
    tool: ITool,
    context: ToolExecutionContext,
    approvedToolIds: Set<string> = new Set()
  ): void {
    const config = tool.getConfig();
    const permission = config.permission;

    // 1. Validate Scopes
    const clientScopes = (context.variables.userScopes as string[]) || [];
    for (const requiredScope of permission.scopes) {
      if (!clientScopes.includes(requiredScope)) {
        throw new Error(
          `Permission Denied: Context lacks required scope "${requiredScope}" for tool "${config.metadata.id}".`
        );
      }
    }

    // 2. Validate Approval Requirements
    if (permission.requiresApproval) {
      const isApproved =
        context.variables.approved === true ||
        context.variables.approvalToken !== undefined ||
        approvedToolIds.has(config.metadata.id);
      if (!isApproved) {
        throw new Error(
          `Approval Required: Execution of tool "${config.metadata.id}" is blocked pending user authorization.`
        );
      }
    }

    // 3. Execution Safety Policies
    const executionPolicy = context.variables.executionPolicy as string;
    if (executionPolicy === "read-only") {
      // Check if tool has write scopes
      const hasWriteScope = permission.scopes.some((s) => !this.readOnlyScopes.has(s));
      if (hasWriteScope) {
        throw new Error(
          `Safety Violation: Cannot execute writing tool "${config.metadata.id}" under read-only execution policy.`
        );
      }
    }
  }
}
