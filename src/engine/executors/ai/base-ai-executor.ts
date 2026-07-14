// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Base AI Executor Abstraction
// Generic validation, prompt rendering, and lifecycle for AI model execution.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseNodeExecutor } from "@/engine/executors/base/base-node-executor";
import { failureResult, successResult } from "@/engine/executors/base/executor-result";
import { resolvePathValue } from "@/engine/executors/logic/logic-expression";
import type { ExecutionContext } from "@/engine/context/execution-context";
import type {
  ExecutorAbortSignal,
  ExecutorExecutionInput,
  ExecutorExecutionResult,
  ExecutorValidationInput,
  ExecutorValidationResult,
  NodeExecutorMetadata,
} from "@/engine/types/executor";

import { forgeFlowService } from "@/lib/forgeflow-service";
import { EmbeddingFactory } from "@/knowledge/embedding/embedding-factory";
import { MockLLMProvider } from "@/knowledge/llm/mock-llm-provider";
import { RetrievalPipeline } from "@/knowledge/retrieval/retrieval-pipeline";
import { ContextBuilder } from "@/knowledge/retrieval/context-builder";
import { PromptComposer } from "@/knowledge/prompt/prompt-composer";

export interface AiExecutorConfig {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}

export abstract class BaseAiExecutor extends BaseNodeExecutor {
  protected abstract get nodeTypeId(): string;
  protected abstract get displayName(): string;
  protected abstract get description(): string;

  getMetadata(): NodeExecutorMetadata {
    return {
      nodeTypeId: this.nodeTypeId,
      category: "ai",
      version: "1.0.0",
      displayName: this.displayName,
      description: this.description,
      inputPorts: [{ id: "in", label: "Input" }],
      outputPorts: [
        { id: "out", label: "Response" },
        { id: "err", label: "Error" },
      ],
      supportsCancellation: true,
      supportsRetry: true,
    };
  }

  validate(input: ExecutorValidationInput): ExecutorValidationResult {
    if (input.node.typeId !== this.nodeTypeId) {
      return {
        valid: false,
        errors: [
          {
            code: "EXECUTOR_CONFIG_INVALID",
            message: `Expected node type "${this.nodeTypeId}"`,
            field: "typeId",
          },
        ],
      };
    }

    const { model, prompt, temperature, maxTokens } = input.node.config;
    const errors: { code: string; message: string; field: string }[] = [];

    if (typeof model !== "string" || model.trim().length === 0) {
      errors.push({
        code: "EXECUTOR_CONFIG_INVALID",
        message: "Model identifier is required",
        field: "model",
      });
    }

    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      errors.push({
        code: "EXECUTOR_CONFIG_INVALID",
        message: "Prompt template is required",
        field: "prompt",
      });
    }

    if (temperature !== undefined && temperature !== null) {
      const tempVal = Number(temperature);
      if (isNaN(tempVal) || tempVal < 0 || tempVal > 2) {
        errors.push({
          code: "EXECUTOR_CONFIG_INVALID",
          message: "Temperature must be a number between 0 and 2",
          field: "temperature",
        });
      }
    }

    if (maxTokens !== undefined && maxTokens !== null) {
      const maxTokVal = Number(maxTokens);
      if (isNaN(maxTokVal) || maxTokVal <= 0 || !Number.isInteger(maxTokVal)) {
        errors.push({
          code: "EXECUTOR_CONFIG_INVALID",
          message: "Max tokens must be a positive integer",
          field: "maxTokens",
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  protected renderPrompt(
    template: string,
    context: ExecutionContext,
    inputs: Record<string, unknown>
  ): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const val = resolvePathValue(path, context, inputs);
      return val !== undefined && val !== null ? String(val) : "";
    });
  }

  protected abstract callModel(
    config: AiExecutorConfig,
    renderedPrompt: string,
    renderedSystemPrompt?: string,
    signal?: ExecutorAbortSignal
  ): Promise<{
    text: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    raw: unknown;
    metrics?: any;
    events?: any;
  }>;

  protected async run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const model = String(input.node.config.model ?? "");
    const prompt = String(input.node.config.prompt ?? "");
    const systemPrompt = input.node.config.systemPrompt ? String(input.node.config.systemPrompt) : undefined;
    
    const temperature =
      input.node.config.temperature !== undefined && input.node.config.temperature !== null
        ? Number(input.node.config.temperature)
        : undefined;
        
    const maxTokens =
      input.node.config.maxTokens !== undefined && input.node.config.maxTokens !== null
        ? Number(input.node.config.maxTokens)
        : undefined;

    const responseFormat = input.node.config.responseFormat === "json" ? "json" : "text";

    const config: AiExecutorConfig = {
      model,
      prompt,
      systemPrompt,
      temperature,
      maxTokens,
      responseFormat,
    };

    const triggerInput = input.inputs.in ?? input.inputs;
    const resolvedInputs =
      typeof triggerInput === "object" && triggerInput !== null
        ? (triggerInput as Record<string, unknown>)
        : { value: triggerInput };

    const renderedPrompt = this.renderPrompt(prompt, input.context, resolvedInputs);
    const renderedSystemPrompt = systemPrompt
      ? this.renderPrompt(systemPrompt, input.context, resolvedInputs)
      : undefined;

    input.context.services.logger.info(
      `AI request started (model: ${config.model})`,
      { event: "AI_REQUEST_STARTED", model: config.model },
      input.node.id
    );

    const knowledgeEnabled = !!input.node.config.knowledgeEnabled;
    const knowledgeCollection = input.node.config.knowledgeCollectionId ? String(input.node.config.knowledgeCollectionId) : undefined;
    const topK = input.node.config.topK !== undefined ? Number(input.node.config.topK) : 5;
    const similarityThreshold = input.node.config.similarityThreshold !== undefined ? Number(input.node.config.similarityThreshold) : 0.0;
    const maxContextTokens = input.node.config.maxContextTokens !== undefined ? Number(input.node.config.maxContextTokens) : 2000;
    const searchStrategy = input.node.config.searchStrategy ? String(input.node.config.searchStrategy) : "cosine";
    const citationVisibility = input.node.config.citationVisibility !== false;

    const memoryEnabled = !!input.node.config.memoryEnabled;
    const executionMode = input.node.config.executionMode
      ? String(input.node.config.executionMode)
      : (memoryEnabled ? "memory" : (knowledgeEnabled ? "knowledge" : "standard"));

    const memoryTypes = Array.isArray(input.node.config.memoryTypes)
      ? input.node.config.memoryTypes
      : ["working", "conversation", "long-term", "semantic"];

    const maxMemories = input.node.config.maxMemories !== undefined ? Number(input.node.config.maxMemories) : 5;
    const importanceThreshold = input.node.config.importanceThreshold !== undefined ? Number(input.node.config.importanceThreshold) : 0.0;
    const recencyBias = input.node.config.recencyBias !== undefined ? Number(input.node.config.recencyBias) : 0.25;
    const confidenceThreshold = input.node.config.confidenceThreshold !== undefined ? Number(input.node.config.confidenceThreshold) : 0.0;
    const memoryScope = input.node.config.memoryScope ? String(input.node.config.memoryScope) : "workflow";

    try {
      if (executionMode === "memory") {
        input.context.services.logger.info(
          `Memory search started`,
          { event: "MEMORY_SEARCH_STARTED", scope: memoryScope },
          input.node.id
        );

        const filters = {
          conversationId: String(
            input.context.getVariable("sessionId") ||
            input.context.getVariable("conversationId") ||
            input.context.runId ||
            "default-session"
          ),
          memoryTypes: memoryTypes as any[],
          minImportance: importanceThreshold,
        };

        const weights = {
          recency: recencyBias,
          importance: 1 - recencyBias,
          confidence: confidenceThreshold,
        };

        const searchResults = await forgeFlowService.memoryRetrievalEngine.retrieve(
          renderedPrompt,
          filters,
          weights,
          maxMemories
        );

        input.context.services.logger.info(
          `Memory search completed`,
          { event: "MEMORY_SEARCH_COMPLETED", count: searchResults.length },
          input.node.id
        );

        const retrievedContext = searchResults
          .map((m) => `[${m.type} Memory - ${m.key}]: ${m.value}`)
          .join("\n\n");

        input.context.services.logger.info(
          `Memory context ready`,
          { event: "MEMORY_CONTEXT_READY" },
          input.node.id
        );

        const composer = new PromptComposer();
        const messages = composer.compose(
          renderedPrompt,
          searchResults.map((m, idx) => ({
            content: m.value,
            documentId: m.id,
            chunkId: m.id,
            index: idx,
          })),
          renderedSystemPrompt ?? "Use the retrieved memories to contextualize query."
        );

        const finalSystemContent = messages.find(m => m.role === "system")?.content ?? "";
        const finalUserContent = messages.find(m => m.role === "user")?.content ?? "";

        input.context.services.logger.info(
          `Memory prompt built`,
          { event: "MEMORY_PROMPT_BUILT" },
          input.node.id
        );

        const response = await this.callModel(config, finalUserContent, finalSystemContent, input.signal);

        input.context.services.logger.info(
          `Memory response received`,
          { event: "MEMORY_RESPONSE_RECEIVED" },
          input.node.id
        );

        return successResult(
          {
            out: response.text,
            err: null,
          },
          {
            model: config.model,
            promptTokens: response.usage?.promptTokens ?? 0,
            completionTokens: response.usage?.completionTokens ?? 0,
            totalTokens: response.usage?.totalTokens ?? 0,
            rawResponse: response.raw,
            retrievedMemories: searchResults.map((m) => ({
              id: m.id,
              key: m.key,
              value: m.value,
              type: m.type,
              importance: m.importance,
              confidence: Number(m.metadata?.confidenceScore ?? 0.8),
              source: String(m.metadata?.source ?? "unknown"),
            })),
            retrievedContext,
            promptPreview: renderedPrompt,
            finalPrompt: finalSystemContent + "\n\n" + finalUserContent,
            metrics: response.metrics,
            events: response.events,
          }
        );
      } else if (executionMode === "knowledge") {
        input.context.services.logger.info(
          `Knowledge search started`,
          { event: "KNOWLEDGE_SEARCH_STARTED", collection: knowledgeCollection },
          input.node.id
        );

        const embedProvider = EmbeddingFactory.create("mock");
        const vectorStore = forgeFlowService.vectorStore;

        const queryVector = await embedProvider.embedSingle(renderedPrompt);
        const searchResults = await vectorStore.search({
          vector: queryVector,
          limit: topK,
          minScore: similarityThreshold,
          collection: knowledgeCollection,
          metric: searchStrategy as any,
        });

        input.context.services.logger.info(
          `Knowledge search completed`,
          { event: "KNOWLEDGE_SEARCH_COMPLETED", count: searchResults.length },
          input.node.id
        );

        const builder = new ContextBuilder();
        const contextResult = builder.buildContext(searchResults, {
          tokenBudget: maxContextTokens,
          ordering: "similarity",
        });

        input.context.services.logger.info(
          `RAG context ready`,
          { event: "RAG_CONTEXT_READY", tokensUsed: contextResult.tokensUsed },
          input.node.id
        );

        const composer = new PromptComposer();
        const messages = composer.compose(
          renderedPrompt,
          contextResult.citations.map((cit, idx) => ({
            content: cit.content,
            documentId: cit.documentId,
            chunkId: cit.chunkId,
            index: idx,
          })),
          renderedSystemPrompt ?? "Use the provided context to answer query."
        );

        const finalSystemContent = messages.find(m => m.role === "system")?.content ?? "";
        const finalUserContent = messages.find(m => m.role === "user")?.content ?? "";

        input.context.services.logger.info(
          `Prompt sent to LLM model`,
          { event: "PROMPT_SENT", model: config.model },
          input.node.id
        );

        const response = await this.callModel(config, finalUserContent, finalSystemContent, input.signal);

        input.context.services.logger.info(
          `LLM Response received`,
          { event: "RESPONSE_RECEIVED", model: config.model },
          input.node.id
        );

        return successResult(
          {
            out: response.text,
            err: null,
          },
          {
            model: config.model,
            promptTokens: response.usage?.promptTokens ?? 0,
            completionTokens: response.usage?.completionTokens ?? 0,
            totalTokens: response.usage?.totalTokens ?? 0,
            rawResponse: response.raw,
            retrievedChunks: contextResult.citations.map((c) => ({
              chunkId: c.chunkId,
              documentId: c.documentId,
              score: c.score,
              content: c.content,
              source: c.metadata.source ?? "unknown",
              section: c.metadata.section ?? "Root",
            })),
            tokensUsed: contextResult.tokensUsed,
            promptPreview: renderedPrompt,
            finalPrompt: finalSystemContent + "\n\n" + finalUserContent,
            citationVisibility,
            metrics: response.metrics,
            events: response.events,
          }
        );
      } else {
        const response = await this.callModel(config, renderedPrompt, renderedSystemPrompt, input.signal);
        
        input.context.services.logger.info(
          `AI response received`,
          {
            event: "AI_RESPONSE_RECEIVED",
            model: config.model,
            promptTokens: response.usage?.promptTokens ?? 0,
            completionTokens: response.usage?.completionTokens ?? 0,
            totalTokens: response.usage?.totalTokens ?? 0,
          },
          input.node.id
        );

        return successResult(
          {
            out: response.text,
            err: null,
          },
          {
            model: config.model,
            promptTokens: response.usage?.promptTokens ?? 0,
            completionTokens: response.usage?.completionTokens ?? 0,
            totalTokens: response.usage?.totalTokens ?? 0,
            rawResponse: response.raw,
            metrics: response.metrics,
            events: response.events,
          }
        );
      }
    } catch (error: any) {
      const isTimeout = error?.message?.toLowerCase().includes("timeout") || error?.message?.toLowerCase().includes("cancelled");
      if (isTimeout) {
        input.context.services.logger.error(
          `AI request timed out`,
          { event: "AI_TIMEOUT", model: config.model },
          input.node.id
        );
      }
      return failureResult({
        code: "AI_MODEL_EXECUTION_FAILED",
        message: error?.message || "Failed to execute AI model request",
        retryable: error?.retryable !== false,
      });
    }
  }
}
