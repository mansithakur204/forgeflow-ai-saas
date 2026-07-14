// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Repository Factory
// Instantiates repositories based on requested persistence providers.
// ─────────────────────────────────────────────────────────────────────────────

import type { IExecutionLogRepository, ITimelineRepository, IDatabaseAdapter } from "./interfaces";
import { InMemoryExecutionLogRepository, InMemoryTimelineRepository } from "./in-memory-repository";
import { PostgresExecutionLogRepository, PostgresTimelineRepository } from "./postgres-repository";

export type PersistenceProviderType = "inmemory" | "postgres" | "redis" | "azure";

export interface RepositoryFactoryConfig {
  providerType: PersistenceProviderType;
  connectionString?: string;
  dbAdapter?: IDatabaseAdapter;
}

export class RepositoryFactory {
  static createLogRepository(config: RepositoryFactoryConfig): IExecutionLogRepository {
    switch (config.providerType) {
      case "postgres":
        return new PostgresExecutionLogRepository(config.dbAdapter);
      case "redis":
      case "azure":
        console.warn(`[RepositoryFactory] Provider "${config.providerType}" is planned for future implementation. Falling back to InMemory.`);
        return new InMemoryExecutionLogRepository();
      case "inmemory":
      default:
        return new InMemoryExecutionLogRepository();
    }
  }

  static createTimelineRepository(config: RepositoryFactoryConfig): ITimelineRepository {
    switch (config.providerType) {
      case "postgres":
        return new PostgresTimelineRepository(config.dbAdapter);
      case "redis":
      case "azure":
        console.warn(`[RepositoryFactory] Provider "${config.providerType}" is planned for future implementation. Falling back to InMemory.`);
        return new InMemoryTimelineRepository();
      case "inmemory":
      default:
        return new InMemoryTimelineRepository();
    }
  }
}
