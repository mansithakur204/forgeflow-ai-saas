import type { ActionExecutionRequest, ActionExecutionResult, ActionAuditLog } from "../../types/action";

export interface ActionMiddleware {
  beforeExecute?(request: ActionExecutionRequest): Promise<void>;
  afterExecute?(request: ActionExecutionRequest, result: ActionExecutionResult): Promise<void>;
  onError?(request: ActionExecutionRequest, error: Error): Promise<void>;
}

export class ActionPipeline {
  private middlewares: ActionMiddleware[] = [];
  private auditLogs: ActionAuditLog[] = [];

  addMiddleware(mw: ActionMiddleware): void {
    this.middlewares.push(mw);
  }

  getAuditLogs(): ActionAuditLog[] {
    return [...this.auditLogs];
  }

  logAudit(log: ActionAuditLog): void {
    this.auditLogs.push(log);
  }

  async runBefore(request: ActionExecutionRequest): Promise<void> {
    for (const mw of this.middlewares) {
      if (mw.beforeExecute) {
        await mw.beforeExecute(request);
      }
    }
  }

  async runAfter(request: ActionExecutionRequest, result: ActionExecutionResult): Promise<void> {
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const mw = this.middlewares[i];
      if (mw.afterExecute) {
        await mw.afterExecute(request, result);
      }
    }
  }

  async runError(request: ActionExecutionRequest, error: Error): Promise<void> {
    for (const mw of this.middlewares) {
      if (mw.onError) {
        await mw.onError(request, error);
      }
    }
  }

  clear(): void {
    this.middlewares = [];
    this.auditLogs = [];
  }
}
