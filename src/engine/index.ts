// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Execution Engine Public API
// ─────────────────────────────────────────────────────────────────────────────

export { ExecutionContext } from "@/engine/context/execution-context";

export { ExecutionError } from "@/engine/errors/execution-errors";
export type {
  ExecutionErrorCode,
  GraphValidationIssue,
  GraphValidationResult,
} from "@/engine/errors/execution-errors";

export { RuntimeError } from "@/engine/errors/runtime-errors";
export type { RuntimeErrorCode } from "@/engine/errors/runtime-errors";

export type {
  ExecutionEvent,
  ExecutionEventBase,
  ExecutionEventType,
  NodeCompletedEvent,
  NodeEventType,
  NodeExecutionEvent,
  NodeFailedEvent,
  NodeRetryScheduledEvent,
  NodeSkippedEvent,
  NodeStartedEvent,
  NodeStatusEvent,
  WorkflowCancelledEvent,
  WorkflowCompletedEvent,
  WorkflowEventType,
  WorkflowExecutionEvent,
  WorkflowFailedEvent,
  WorkflowStartedEvent,
  WorkflowStatusEvent,
  WorkflowStoppedEvent,
} from "@/engine/events/execution-events";

export {
  parseWorkflowGraph,
  parseWorkflowGraphFromCanvas,
} from "@/engine/graph/parse-workflow-graph";
export { validateWorkflowGraph } from "@/engine/graph/validate-graph";

export { InMemoryExecutionLogger } from "@/engine/logging/in-memory-logger";
export { TimelineCollector } from "@/engine/logging/timeline-collector";
export { TimelineService, timelineService } from "@/engine/logging/timeline-service";

// Persistence Repositories & Models (Sprint 10.3)
export * from "@/engine/repository/interfaces";
export * from "@/engine/repository/models";
export * from "@/engine/repository/in-memory-repository";
export * from "@/engine/repository/postgres-repository";
export * from "@/engine/repository/factory";
export * from "@/engine/repository/provider";
export { RetentionEngine } from "@/engine/repository/retention-engine";
export * from "@/engine/repository/mappers";
export { RepositoryMonitoringService } from "@/engine/repository/monitoring-service";
export { NoOpTelemetryProvider, ConsoleTelemetryProvider } from "@/engine/repository/telemetry";

export type {
  TimelineEntry,
  TimelineLogLevel,
  TimelineEventType,
  TimelineEntryStatus,
  TimelineFilter,
  TimelineGrouping,
  ITimelineStorage,
} from "@/engine/types/timeline-types";
export { TIMELINE_LOG_LEVEL_SEVERITY } from "@/engine/types/timeline-types";

export { ExecutionQueue } from "@/engine/queue/execution-queue";

export { resolveExecutionOrder } from "@/engine/runtime/execution-order";
export { NodeRunner } from "@/engine/runtime/node-runner";
export type { ExecuteNodeParams, NodeRunnerOptions } from "@/engine/runtime/node-runner";
export { WorkflowRunner } from "@/engine/runtime/workflow-runner";

export {
  ExecutionStateMachine,
  executionStateMachine,
} from "@/engine/state/execution-state-machine";

export type {
  CreateExecutionContextInput,
  ExecutionContextSnapshot,
  ExecutionMetadata,
  ExecutionServices,
} from "@/engine/types/execution-context";

export type {
  ExecutionEnvironment,
  ExecutionTrigger,
  NodeExecution,
  NodeExecutionStatus,
  PortOutputValue,
  TriggerType,
  WorkflowRun,
  WorkflowRunStatus,
} from "@/engine/types/execution";

export type { ExecutionLogEntry, ExecutionLogger, LogLevel } from "@/engine/types/logs";

export type {
  ActiveRunControl,
  ExecutionQueueJob,
  ExecutionQueueJobType,
  ExecutionQueueOptions,
  ExecutionQueueStats,
  NodeExecutionInput,
  NodeExecutionResult,
  NodeExecutor,
  StartWorkflowInput,
  WorkflowRunSnapshot,
  WorkflowRunnerOptions,
} from "@/engine/types/runtime";

export type {
  ParseWorkflowGraphInput,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
} from "@/engine/types/workflow-graph";

// Executors and Registry API (Sprint 3)
export { BaseNodeExecutor } from "@/engine/executors/base/base-node-executor";
export { successResult, failureResult, cancelledResult } from "@/engine/executors/base/executor-result";
export {
  ExecutorRegistry,
  createExecutorRegistry,
  createDefaultExecutorRegistry,
} from "@/engine/executors/registry/executor-registry";
export { ManualTriggerExecutor } from "@/engine/executors/trigger/manual-trigger-executor";
export { ConditionExecutor } from "@/engine/executors/logic/condition-executor";
export { FilterExecutor } from "@/engine/executors/logic/filter-executor";
export { SwitchExecutor } from "@/engine/executors/logic/switch-executor";
export { TransformExecutor } from "@/engine/executors/logic/transform-executor";
export { HttpExecutor } from "@/engine/executors/http/http-executor";
export { BaseAiExecutor } from "@/engine/executors/ai/base-ai-executor";
export { AiExecutor } from "@/engine/executors/ai/ai-executor";
export type { AiExecutorConfig } from "@/engine/executors/ai/base-ai-executor";
export { AgentNodeExecutor } from "@/engine/executors/ai/agent-executor";
export { DiscordExecutor } from "@/engine/executors/discord/discord-executor";
export type {
  DiscordOperationType,
  DiscordAuthType,
  DiscordEmbed,
  DiscordAttachment,
  DiscordAllowedMentions,
  DiscordComponent,
} from "@/engine/executors/discord/discord-executor";
export { NotionExecutor } from "@/engine/executors/notion/notion-executor";
export type {
  NotionOperationType,
  NotionAuthType,
  NotionAnnotations,
  NotionRichTextText,
  NotionRichText,
  NotionParagraphBlock,
  NotionHeadingBlock,
  NotionCodeBlock,
  NotionTableRowBlock,
  NotionTableBlock,
  NotionImageBlock,
  NotionBlock,
} from "@/engine/executors/notion/notion-executor";
export {
  IntegrationConnectionManager,
  IntegrationAuthenticationManager,
  IntegrationRateLimiter,
  IntegrationTimeoutManager,
  IntegrationErrorMapper,
  IntegrationTelemetryAdapter,
} from "@/engine/executors/base/integration-sdk";
export type {
  IntegrationHealthStatus,
  IntegrationConnectionState,
  RateLimitBucket,
} from "@/engine/executors/base/integration-sdk";
export { IntegrationTestHarness } from "@/engine/executors/base/integration-test-harness";
export type {
  TestHarnessProviderConfig,
  TestHarnessRunResult,
} from "@/engine/executors/base/integration-test-harness";
export { RetryManager, DEFAULT_RETRY_OPTIONS } from "@/engine/runtime/retry-manager";
export type { RetryOptions } from "@/engine/runtime/retry-manager";
export type {
  ExecutorCategory,
  ExecutorPortDefinition,
  NodeExecutorMetadata,
  ExecutorValidationIssue,
  ExecutorValidationInput,
  ExecutorValidationResult,
  ExecutorAbortSignal,
  ExecutorExecutionInput,
  ExecutorErrorDetail,
  ExecutorExecutionResult,
  INodeExecutor,
  ReadonlyExecutorRegistry,
} from "@/engine/types/executor";
