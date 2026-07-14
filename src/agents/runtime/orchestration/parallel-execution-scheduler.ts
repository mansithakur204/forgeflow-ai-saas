// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Parallel Execution Scheduler
// Schedules concurrent execution branches, checks barriers, and merges contexts.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ExecutionBranch,
  ExecutionBarrier,
  SynchronizationContext,
} from "../../types/parallel";

export class ParallelExecutionScheduler {
  private logger: any;

  constructor(logger: any = console) {
    this.logger = logger;
  }

  /**
   * Schedules and executes independent branches concurrently with barrier synchronization.
   */
  async execute(
    syncContext: SynchronizationContext,
    executeBranchFn: (branchId: string, vars: Record<string, unknown>) => Promise<Record<string, unknown>>,
    timeoutMs = 15000,
    maxRetries = 2
  ): Promise<Record<string, unknown>> {
    const startedAt = Date.now();
    const logger = this.logger;

    // ── Telemetry: Emit PARALLEL_EXECUTION_STARTED ──
    logger.info(`Parallel scheduler started execution`, {
      event: "PARALLEL_EXECUTION_STARTED",
      syncId: syncContext.syncId,
      branchCount: syncContext.activeBranches.length,
    });

    const completedBranchIds = new Set<string>();
    const failedBranchIds = new Set<string>();

    while (completedBranchIds.size + failedBranchIds.size < syncContext.activeBranches.length) {
      // Find runnable branches: status is "pending" and all dependencies in barriers are satisfied
      const runnableBranches = syncContext.activeBranches.filter((branch) => {
        if (branch.status !== "pending") return false;

        // Check if there are unsatisfied barriers holding back this branch
        const unsatisfiedDeps = syncContext.barriers.filter(
          (barrier) =>
            barrier.barrierId === branch.branchId &&
            !barrier.isSatisfied &&
            barrier.dependencyBranchIds.some((depId) => !completedBranchIds.has(depId))
        );

        return unsatisfiedDeps.length === 0;
      });

      if (runnableBranches.length === 0) {
        // Check for deadlock/circular dependency loops
        const activeOrPending = syncContext.activeBranches.some(
          (b) => b.status === "pending" || b.status === "running"
        );
        if (!activeOrPending && completedBranchIds.size < syncContext.activeBranches.length) {
          throw new Error("Parallel execution deadlock: unresolved branch dependencies detected.");
        }
        break;
      }

      // Execute runnable branches concurrently
      const branchPromises = runnableBranches.map(async (branch) => {
        const branchStart = Date.now();
        branch.status = "running";
        branch.startedAt = new Date().toISOString();

        // Telemetry: Emit BRANCH_STARTED
        logger.info(`Starting execution branch: ${branch.branchId}`, {
          event: "BRANCH_STARTED",
          branchId: branch.branchId,
        });

        let attempt = 0;
        let success = false;
        let branchResult: Record<string, unknown> = {};
        let lastError = "";

        while (attempt <= maxRetries) {
          try {
            // Task 15.2D: Timeout handling wrapping branch execution
            const branchPromise = executeBranchFn(branch.branchId, { ...syncContext.variables });
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout exceeded for branch: ${branch.branchId}`)), timeoutMs)
            );

            branchResult = await Promise.race([branchPromise, timeoutPromise]);
            success = true;
            break;
          } catch (err: any) {
            attempt++;
            lastError = err.message;
            if (attempt <= maxRetries) {
              logger.warn(`Retrying branch: ${branch.branchId}. Attempt ${attempt} failed: ${lastError}`);
            }
          }
        }

        branch.completedAt = new Date().toISOString();
        branch.durationMs = Date.now() - branchStart;

        if (success) {
          branch.status = "completed";
          completedBranchIds.add(branch.branchId);

          // Telemetry: Emit BRANCH_COMPLETED
          logger.info(`Branch completed successfully: ${branch.branchId}`, {
            event: "BRANCH_COMPLETED",
            branchId: branch.branchId,
            durationMs: branch.durationMs,
          });

          // Task 15.2C: Merge context variables from thread
          syncContext.variables = {
            ...syncContext.variables,
            ...branchResult,
          };

          // Update synchronization barriers
          syncContext.barriers.forEach((barrier) => {
            if (barrier.dependencyBranchIds.includes(branch.branchId)) {
              if (!barrier.satisfiedBranchIds.includes(branch.branchId)) {
                barrier.satisfiedBranchIds.push(branch.branchId);
              }
              const allDepsMet = barrier.dependencyBranchIds.every((depId) =>
                completedBranchIds.has(depId)
              );
              if (allDepsMet) {
                barrier.isSatisfied = true;
              }
            }
          });

        } else {
          branch.status = "failed";
          branch.error = lastError;
          failedBranchIds.add(branch.branchId);

          // Telemetry: Emit BRANCH_FAILED
          logger.error(`Branch execution failed: ${branch.branchId}`, {
            event: "BRANCH_FAILED",
            branchId: branch.branchId,
            error: lastError,
          });

          // Failure isolation check: propagate error immediately if strict scheduling is desired
          throw new Error(`Branch execution failed: ${branch.branchId}. Error: ${lastError}`);
        }
      });

      await Promise.all(branchPromises);
    }

    // Telemetry: Emit SYNCHRONIZATION_COMPLETED
    const durationMs = Date.now() - startedAt;
    logger.info(`Synchronization completed`, {
      event: "SYNCHRONIZATION_COMPLETED",
      syncId: syncContext.syncId,
      durationMs,
    });

    return syncContext.variables;
  }
}
