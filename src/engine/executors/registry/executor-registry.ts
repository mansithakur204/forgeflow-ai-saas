// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Executor Registry
// Open/closed registry for unlimited node type executors.
// ─────────────────────────────────────────────────────────────────────────────

import { ExecutorError } from "@/engine/errors/executor-errors";
import type {
  ExecutorNodeTypeId,
  INodeExecutor,
  NodeExecutorMetadata,
  ReadonlyExecutorRegistry,
} from "@/engine/types/executor";
import { ManualTriggerExecutor } from "@/engine/executors/trigger/manual-trigger-executor";
import { ConditionExecutor } from "@/engine/executors/logic/condition-executor";
import { FilterExecutor } from "@/engine/executors/logic/filter-executor";
import { SwitchExecutor } from "@/engine/executors/logic/switch-executor";
import { TransformExecutor } from "@/engine/executors/logic/transform-executor";
import { HttpExecutor } from "@/engine/executors/http/http-executor";
import { AiExecutor } from "@/engine/executors/ai/ai-executor";
import { AgentNodeExecutor } from "@/engine/executors/ai/agent-executor";
import { DatabaseExecutor } from "@/engine/executors/database/database-executor";
import { EmailExecutor } from "@/engine/executors/email/email-executor";
import { SlackExecutor } from "@/engine/executors/slack/slack-executor";
import { DiscordExecutor } from "@/engine/executors/discord/discord-executor";
import { NotionExecutor } from "@/engine/executors/notion/notion-executor";
import { GoogleSheetsExecutor } from "@/engine/executors/sheets/google-sheets-executor";
import {
  WebhookTriggerExecutor,
  ScheduleTriggerExecutor,
  AiClassifierExecutor,
} from "@/engine/executors/stub-executors";

class ImmutableExecutorRegistryView implements ReadonlyExecutorRegistry {
  private readonly executors: ReadonlyMap<ExecutorNodeTypeId, INodeExecutor>;
  private readonly metadata: readonly NodeExecutorMetadata[];

  constructor(executors: ReadonlyMap<ExecutorNodeTypeId, INodeExecutor>) {
    this.executors = executors;
    this.metadata = Object.freeze(
      [...executors.values()].map((executor) => Object.freeze(executor.getMetadata()))
    );
  }

  get(nodeTypeId: ExecutorNodeTypeId): INodeExecutor | undefined {
    return this.executors.get(nodeTypeId);
  }

  has(nodeTypeId: ExecutorNodeTypeId): boolean {
    return this.executors.has(nodeTypeId);
  }

  list(): readonly NodeExecutorMetadata[] {
    return this.metadata;
  }

  size(): number {
    return this.executors.size;
  }
}

export class ExecutorRegistry {
  private readonly executors = new Map<ExecutorNodeTypeId, INodeExecutor>();

  register(executor: INodeExecutor): void {
    const nodeTypeId = executor.getMetadata().nodeTypeId;
    if (this.executors.has(nodeTypeId)) {
      throw new ExecutorError(
        "EXECUTOR_ALREADY_REGISTERED",
        `Executor for node type "${nodeTypeId}" is already registered`,
        { nodeTypeId }
      );
    }
    this.executors.set(nodeTypeId, executor);
  }

  unregister(nodeTypeId: ExecutorNodeTypeId): boolean {
    return this.executors.delete(nodeTypeId);
  }

  get(nodeTypeId: ExecutorNodeTypeId): INodeExecutor | undefined {
    return this.executors.get(nodeTypeId);
  }

  has(nodeTypeId: ExecutorNodeTypeId): boolean {
    return this.executors.has(nodeTypeId);
  }

  list(): readonly NodeExecutorMetadata[] {
    return [...this.executors.values()].map((executor) => executor.getMetadata());
  }

  size(): number {
    return this.executors.size;
  }

  asReadonly(): ReadonlyExecutorRegistry {
    return new ImmutableExecutorRegistryView(this.executors);
  }
}

export function createExecutorRegistry(executors: INodeExecutor[] = []): ExecutorRegistry {
  const registry = new ExecutorRegistry();
  for (const executor of executors) {
    registry.register(executor);
  }
  return registry;
}

export function createDefaultExecutorRegistry(): ExecutorRegistry {
  return createExecutorRegistry([
    // Trigger executors
    new ManualTriggerExecutor(),
    new WebhookTriggerExecutor(),
    new ScheduleTriggerExecutor(),
    // AI executors
    new AiExecutor(),
    new AgentNodeExecutor(),
    new AiClassifierExecutor(),
    // Logic executors
    new ConditionExecutor(),
    new FilterExecutor(),
    new SwitchExecutor(),
    new TransformExecutor(),
    // I/O executors
    new HttpExecutor(),
    new DatabaseExecutor(),
    new EmailExecutor(),
    new SlackExecutor(),
    new DiscordExecutor(),
    new NotionExecutor(),
    new GoogleSheetsExecutor(),
  ]);
}
