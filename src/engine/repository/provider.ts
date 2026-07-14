// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Repository Provider (Dependency Injection Registry)
// Central registry providing loose-coupling lookup of active repository instances.
// ─────────────────────────────────────────────────────────────────────────────

import type { IExecutionLogRepository, ITimelineRepository, ITelemetryProvider } from "./interfaces";
import { RepositoryFactory, type PersistenceProviderType } from "./factory";
import { NoOpTelemetryProvider } from "./telemetry";

export class RepositoryProvider {
  private static logRepository: IExecutionLogRepository | null = null;
  private static timelineRepository: ITimelineRepository | null = null;
  private static telemetryProvider: ITelemetryProvider | null = null;
  private static activeProvider: PersistenceProviderType = "inmemory";

  /**
   * Configures the repositories globally. Usually called on app start or test setup.
   */
  static configure(config: {
    logRepo?: IExecutionLogRepository;
    timelineRepo?: ITimelineRepository;
    providerName?: PersistenceProviderType;
    telemetry?: ITelemetryProvider;
  }): void {
    if (config.logRepo) this.logRepository = config.logRepo;
    if (config.timelineRepo) this.timelineRepository = config.timelineRepo;
    if (config.providerName) this.activeProvider = config.providerName;
    if (config.telemetry) this.telemetryProvider = config.telemetry;
  }

  /**
   * Configures repositories dynamically using environment variables or configuration states.
   */
  static configureFromConfig(config: {
    provider: PersistenceProviderType;
    connectionString?: string;
  }): void {
    this.activeProvider = config.provider;
    this.logRepository = RepositoryFactory.createLogRepository({
      providerType: config.provider,
      connectionString: config.connectionString,
    });
    this.timelineRepository = RepositoryFactory.createTimelineRepository({
      providerType: config.provider,
      connectionString: config.connectionString,
    });
  }

  /**
   * Retrieves the active execution log repository. Falls back to InMemory if not configured.
   */
  static getLogRepository(): IExecutionLogRepository {
    if (!this.logRepository) {
      this.logRepository = RepositoryFactory.createLogRepository({ providerType: "inmemory" });
      this.activeProvider = "inmemory";
    }
    return this.logRepository;
  }

  /**
   * Retrieves the active timeline repository. Falls back to InMemory if not configured.
   */
  static getTimelineRepository(): ITimelineRepository {
    if (!this.timelineRepository) {
      this.timelineRepository = RepositoryFactory.createTimelineRepository({ providerType: "inmemory" });
      this.activeProvider = "inmemory";
    }
    return this.timelineRepository;
  }

  /**
   * Retrieves the registered telemetry provider. Defaults to NoOp.
   */
  static getTelemetryProvider(): ITelemetryProvider {
    if (!this.telemetryProvider) {
      this.telemetryProvider = new NoOpTelemetryProvider();
    }
    return this.telemetryProvider;
  }

  /**
   * Registers a global telemetry provider.
   */
  static setTelemetryProvider(provider: ITelemetryProvider): void {
    this.telemetryProvider = provider;
  }

  /**
   * Gets the name of the active configured provider.
   */
  static getActiveProviderName(): PersistenceProviderType {
    return this.activeProvider;
  }

  /**
   * Resets active provider references (useful for unit tests).
   */
  static reset(): void {
    this.logRepository = null;
    this.timelineRepository = null;
    this.telemetryProvider = null;
    this.activeProvider = "inmemory";
  }
}
