import type { AgentAction, ActionContext } from "../../types/action";

export class PermissionEnforcer {
  /**
   * Validates target scopes and user approval credentials.
   */
  enforce(action: AgentAction, context: ActionContext): void {
    // 1. Enforce scope policies
    for (const required of action.requiredScopes) {
      if (!context.scopes.includes(required)) {
        throw new Error(
          `Permission Denied: Context lacks required scope "${required}" for action "${action.id}".`
        );
      }
    }

    // 2. Enforce approval workflows
    if (action.requiresApproval) {
      const expectedToken = `approval:${action.id}`;
      if (!context.approvedTokens.includes(expectedToken)) {
        throw new Error(
          `Approval Required: Action "${action.id}" execution is blocked pending user authorization.`
        );
      }
    }
  }
}
