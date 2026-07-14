// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Retrieval Augmented Generation (RAG) Pipeline
// Orchestrates multi-stage query embeds, vector search, context composition, and LLM query.
// ─────────────────────────────────────────────────────────────────────────────

import type { IEmbeddingProvider } from "../embedding/embedding-provider.interface";
import type { IVectorStore, VectorSearchResult, SimilarityMetric } from "../vector-store/vector-store.interface";
import type { ILLMProvider } from "../llm/llm-provider.interface";
import type { Citation } from "../types/query";
import { ContextBuilder, ContextOrderingType } from "./context-builder";
import { PromptComposer } from "../prompt/prompt-composer";
import { QueryCache } from "./query-cache";
import { DocumentProcessingError } from "../errors/processing-error";

export type RetrievalPipelineEventType =
  | "RETRIEVAL_STARTED"
  | "RETRIEVAL_COMPLETED"
  | "CONTEXT_BUILT"
  | "PROMPT_COMPOSED"
  | "RAG_COMPLETED"
  | "RETRIEVAL_FAILED";

export interface RetrievalPipelineEvent {
  queryText: string;
  type: RetrievalPipelineEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface RAGResponse {
  answer: string;
  citations: Citation[];
  diagnostics: {
    queryText: string;
    searchDurationMs: number;
    completionDurationMs: number;
    totalDurationMs: number;
    tokensUsed: number;
  };
}

export interface RetrievalOptions {
  limit?: number;
  offset?: number;
  minScore?: number;
  namespace?: string;
  collection?: string;
  metadataFilter?: Record<string, unknown>;
  metric?: SimilarityMetric;
  ordering?: ContextOrderingType;
  tokenBudget?: number;
  instructions?: string;
}

export class RetrievalPipeline {
  private embeddingProvider: IEmbeddingProvider;
  private vectorStore: IVectorStore;
  private llmProvider: ILLMProvider;
  private contextBuilder: ContextBuilder;
  private promptComposer: PromptComposer;
  private queryCache: QueryCache;
  private onEvent?: (event: RetrievalPipelineEvent) => void;

  constructor(
    embeddingProvider: IEmbeddingProvider,
    vectorStore: IVectorStore,
    llmProvider: ILLMProvider,
    onEvent?: (event: RetrievalPipelineEvent) => void
  ) {
    this.embeddingProvider = embeddingProvider;
    this.vectorStore = vectorStore;
    this.llmProvider = llmProvider;
    this.contextBuilder = new ContextBuilder();
    this.promptComposer = new PromptComposer();
    this.queryCache = new QueryCache();
    this.onEvent = onEvent;
  }

  private emit(queryText: string, type: RetrievalPipelineEventType, metadata?: Record<string, unknown>): void {
    if (this.onEvent) {
      this.onEvent({
        queryText,
        type,
        timestamp: new Date().toISOString(),
        metadata,
      });
    }
  }

  /**
   * Executes the full RAG Pipeline: Embedding -> Search -> Rank -> Context -> Compose -> LLM -> Response.
   */
  async queryRAG(queryText: string, options: RetrievalOptions = {}): Promise<RAGResponse> {
    const totalStart = Date.now();
    this.emit(queryText, "RETRIEVAL_STARTED", { options });

    try {
      // 1. Generate query vector embedding representation
      const embedStart = Date.now();
      const queryVector = await this.embeddingProvider.embedSingle(queryText);
      const embeddingDurationMs = Date.now() - embedStart;

      // 2. Perform Vector Search Similarity Retrieval
      const searchStart = Date.now();
      const searchResults = await this.vectorStore.search({
        vector: queryVector,
        limit: options.limit ?? 5,
        offset: options.offset ?? 0,
        minScore: options.minScore ?? 0.0,
        namespace: options.namespace,
        collection: options.collection,
        metric: options.metric,
        metadataFilter: options.metadataFilter,
      });
      const searchDurationMs = Date.now() - searchStart;
      this.emit(queryText, "RETRIEVAL_COMPLETED", { resultsCount: searchResults.length, searchDurationMs });

      // 3. Merges, orders and builds deduplicated Context text
      const contextStart = Date.now();
      const contextResult = this.contextBuilder.buildContext(searchResults, {
        tokenBudget: options.tokenBudget ?? 2000,
        ordering: options.ordering ?? "similarity",
      });
      const contextDurationMs = Date.now() - contextStart;
      this.emit(queryText, "CONTEXT_BUILT", { tokensUsed: contextResult.tokensUsed });

      // 4. Structured Prompts Composition
      const composeStart = Date.now();
      const promptChunks = contextResult.citations.map((cit, idx) => ({
        content: cit.content,
        documentId: cit.documentId,
        chunkId: cit.chunkId,
        index: idx,
      }));

      const messages = this.promptComposer.compose(
        queryText,
        promptChunks,
        options.instructions ?? "Focus on accuracy and clear source attributions."
      );
      const composeDurationMs = Date.now() - composeStart;
      this.emit(queryText, "PROMPT_COMPOSED", { messagesCount: messages.length });

      // 5. Query LLM Generation Response
      const completionStart = Date.now();
      const completionResponse = await this.llmProvider.generateCompletion(messages);
      const completionDurationMs = Date.now() - completionStart;

      const totalDurationMs = Date.now() - totalStart;

      const response: RAGResponse = {
        answer: completionResponse.text,
        citations: contextResult.citations,
        diagnostics: {
          queryText,
          searchDurationMs: embeddingDurationMs + searchDurationMs + contextDurationMs + composeDurationMs,
          completionDurationMs,
          totalDurationMs,
          tokensUsed: contextResult.tokensUsed + (completionResponse.usage?.completionTokens ?? 0),
        },
      };

      this.emit(queryText, "RAG_COMPLETED", { totalDurationMs });

      return response;

    } catch (err: any) {
      this.emit(queryText, "RETRIEVAL_FAILED", { error: err.message });
      throw new DocumentProcessingError(`RAG retrieval query failed: ${err.message}`);
    }
  }

  /**
   * Task 11.6G Performance Optimizations placeholders
   */
  async runHybridSearch(queryText: string, searchResults: VectorSearchResult[]): Promise<VectorSearchResult[]> {
    console.log("[RetrievalPipeline] Running hybrid keywords + vector merge scoring placeholder");
    return searchResults;
  }

  async runReRanking(queryText: string, results: VectorSearchResult[]): Promise<VectorSearchResult[]> {
    console.log("[RetrievalPipeline] Running cross-encoder re-ranking placeholders");
    return results;
  }

  async fetchGraphRetrieval(queryText: string): Promise<unknown> {
    console.log("[RetrievalPipeline] Resolving entity relational graphs context placeholder");
    return null;
  }
}

export class RankingEngine {
  /**
   * Sorts vector search results by score and filters out any item falling below the minScore threshold.
   */
  rank(results: VectorSearchResult[], minScore = 0.0): VectorSearchResult[] {
    return results
      .filter((r) => r.score >= minScore)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.record.id.localeCompare(b.record.id);
      });
  }
}
