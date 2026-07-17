// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Agent Analytics Service
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AgentExecutionMetrics,
  TokenUsage,
  DetailedTokenUsage,
  CostRecord,
  LatencyMetrics,
  AggregatedAnalytics,
  ModelProvider
} from "../types";
import { CostEstimator } from "../cost/cost-estimator";

export class AgentAnalyticsService {
  private metrics: AgentExecutionMetrics[] = [];
  private tokenUsages: DetailedTokenUsage[] = [];
  private costRecords: CostRecord[] = [];
  private latencies: (LatencyMetrics & { workflowId: string; agentId: string; timestamp: string })[] = [];
  private logger: any;

  constructor(logger: any = console) {
    this.logger = logger;
  }

  // --- Task 1 Metrics Trackers ---

  trackAgentStart(
    executionId: string,
    workflowId: string,
    agentId: string,
    agentName: string,
    queueWaitTime: number
  ): void {
    const record: AgentExecutionMetrics = {
      executionId,
      workflowId,
      agentId,
      agentName,
      executionStart: new Date().toISOString(),
      queueWaitTime,
      retryCount: 0,
      memoryUsage: process.memoryUsage ? process.memoryUsage().heapUsed : 0,
      cpuTime: 0, // placeholder
      status: "running",
      errorCount: 0,
    };
    this.metrics.push(record);

    // Telemetry: AGENT_STARTED
    this.logger.info(`Agent execution started: ${agentName} (ID: ${agentId})`, {
      event: "AGENT_STARTED",
      executionId,
      workflowId,
      agentId,
      agentName,
      queueWaitTime,
    });
  }

  trackAgentComplete(
    executionId: string,
    agentId: string,
    status: "completed" | "failed" | "paused",
    errorCount = 0,
    retryCount = 0
  ): void {
    const metric = this.metrics.find((m) => m.executionId === executionId && m.agentId === agentId);
    if (metric) {
      metric.executionEnd = new Date().toISOString();
      metric.totalDuration = new Date(metric.executionEnd).getTime() - new Date(metric.executionStart).getTime();
      metric.status = status;
      metric.errorCount = errorCount;
      metric.retryCount = retryCount;
      metric.memoryUsage = process.memoryUsage ? process.memoryUsage().heapUsed : 0;

      // Telemetry: AGENT_COMPLETED
      this.logger.info(`Agent execution completed: ${metric.agentName} (ID: ${agentId}) with status ${status}`, {
        event: "AGENT_COMPLETED",
        executionId,
        agentId,
        status,
        durationMs: metric.totalDuration,
        errorCount,
        retryCount,
      });

      // Emit ANALYTICS_UPDATED
      this.emitAnalyticsUpdate(metric.workflowId);
    }
  }

  // --- Task 2 Token Usage Tracker ---

  trackTokenUsage(
    executionId: string,
    workflowId: string,
    agentId: string,
    provider: ModelProvider,
    usage: TokenUsage
  ): void {
    const detailed: DetailedTokenUsage = {
      usage,
      agentId,
      workflowId,
      provider,
      timestamp: new Date().toISOString(),
    };
    this.tokenUsages.push(detailed);

    // Estimate cost immediately
    const cost = CostEstimator.estimate(provider, usage.promptTokens, usage.completionTokens);
    this.trackCost(
      `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workflowId,
      agentId,
      provider,
      cost
    );

    // Telemetry: TOKEN_USAGE_UPDATED
    this.logger.info(`Token usage updated for agent: ${agentId} on provider ${provider}`, {
      event: "TOKEN_USAGE_UPDATED",
      executionId,
      workflowId,
      agentId,
      provider,
      ...usage,
    });
  }

  // --- Task 3 Cost Tracker ---

  trackCost(
    requestId: string,
    workflowId: string,
    agentId: string,
    provider: ModelProvider,
    cost: number
  ): void {
    const record: CostRecord = {
      requestId,
      workflowId,
      agentId,
      provider,
      cost,
      timestamp: new Date().toISOString(),
    };
    this.costRecords.push(record);

    // Telemetry: COST_UPDATED
    this.logger.info(`Cost record added: $${cost.toFixed(6)} for request ${requestId} (Agent: ${agentId})`, {
      event: "COST_UPDATED",
      requestId,
      workflowId,
      agentId,
      provider,
      cost,
    });
  }

  // --- Task 4 Latency Tracker ---

  trackLatency(
    workflowId: string,
    agentId: string,
    latency: LatencyMetrics
  ): void {
    this.latencies.push({
      ...latency,
      workflowId,
      agentId,
      timestamp: new Date().toISOString(),
    });

    // Telemetry: LATENCY_UPDATED
    this.logger.info(`Latency metrics updated for agent ${agentId}`, {
      event: "LATENCY_UPDATED",
      workflowId,
      agentId,
      ...latency,
    });
  }

  // --- Task 5 Analytics Calculations ---

  getAggregatedAnalytics(workflowId?: string, agentId?: string): AggregatedAnalytics {
    let filteredMetrics = this.metrics;
    let filteredUsages = this.tokenUsages;
    let filteredCosts = this.costRecords;
    let filteredLatencies = this.latencies;

    if (workflowId) {
      filteredMetrics = filteredMetrics.filter((m) => m.workflowId === workflowId);
      filteredUsages = filteredUsages.filter((u) => u.workflowId === workflowId);
      filteredCosts = filteredCosts.filter((c) => c.workflowId === workflowId);
      filteredLatencies = filteredLatencies.filter((l) => l.workflowId === workflowId);
    }

    if (agentId) {
      filteredMetrics = filteredMetrics.filter((m) => m.agentId === agentId);
      filteredUsages = filteredUsages.filter((u) => u.agentId === agentId);
      filteredCosts = filteredCosts.filter((c) => c.agentId === agentId);
      filteredLatencies = filteredLatencies.filter((l) => l.agentId === agentId);
    }

    // Calculations
    const totalRuns = filteredMetrics.length;
    const completedRuns = filteredMetrics.filter((m) => m.status === "completed").length;
    const failedRuns = filteredMetrics.filter((m) => m.status === "failed").length;
    const retriedRuns = filteredMetrics.filter((m) => m.retryCount > 0).length;

    const successRate = totalRuns > 0 ? completedRuns / totalRuns : 0.0;
    const failureRate = totalRuns > 0 ? failedRuns / totalRuns : 0.0;
    const retryRate = totalRuns > 0 ? retriedRuns / totalRuns : 0.0;

    let totalDuration = 0;
    let totalQueueWait = 0;
    let runCountWithDuration = 0;

    filteredMetrics.forEach((m) => {
      if (m.totalDuration !== undefined) {
        totalDuration += m.totalDuration;
        runCountWithDuration++;
      }
      totalQueueWait += m.queueWaitTime;
    });

    const averageExecutionTime = runCountWithDuration > 0 ? totalDuration / runCountWithDuration : 0;
    const averageQueueTime = totalRuns > 0 ? totalQueueWait / totalRuns : 0;

    // Latency Averages
    let sumLatency = 0;
    filteredLatencies.forEach((l) => {
      sumLatency += l.overallWorkflowLatency || l.providerLatency || 0;
    });
    const averageLatency = filteredLatencies.length > 0 ? sumLatency / filteredLatencies.length : 0;

    // Tokens Average
    let sumTokens = 0;
    filteredUsages.forEach((u) => {
      sumTokens += u.usage.totalTokens;
    });
    const averageTokens = filteredUsages.length > 0 ? sumTokens / filteredUsages.length : 0;

    // Cost Average
    let sumCost = 0;
    filteredCosts.forEach((c) => {
      sumCost += c.cost;
    });
    const averageCost = totalRuns > 0 ? sumCost / totalRuns : 0;

    return {
      averageLatency: Number(averageLatency.toFixed(2)),
      successRate: Number(successRate.toFixed(4)),
      failureRate: Number(failureRate.toFixed(4)),
      retryRate: Number(retryRate.toFixed(4)),
      averageCost: Number(averageCost.toFixed(6)),
      averageTokens: Math.round(averageTokens),
      averageQueueTime: Number(averageQueueTime.toFixed(2)),
      averageExecutionTime: Number(averageExecutionTime.toFixed(2)),
    };
  }

  // Cost Aggregators (Task 3)

  getCostPerRequest(requestId: string): number {
    const record = this.costRecords.find((c) => c.requestId === requestId);
    return record ? record.cost : 0.0;
  }

  getCostPerWorkflow(workflowId: string): number {
    return this.costRecords
      .filter((c) => c.workflowId === workflowId)
      .reduce((sum, c) => sum + c.cost, 0.0);
  }

  getCostPerAgent(agentId: string): number {
    return this.costRecords
      .filter((c) => c.agentId === agentId)
      .reduce((sum, c) => sum + c.cost, 0.0);
  }

  getDailyCost(): number {
    const limit = Date.now() - 24 * 60 * 60 * 1000;
    return this.costRecords
      .filter((c) => new Date(c.timestamp).getTime() >= limit)
      .reduce((sum, c) => sum + c.cost, 0.0);
  }

  getMonthlyCost(): number {
    const limit = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return this.costRecords
      .filter((c) => new Date(c.timestamp).getTime() >= limit)
      .reduce((sum, c) => sum + c.cost, 0.0);
  }

  // --- Task 7 Execution Inspector Details ---

  getExecutionInspectorDetails(orchestrationId: string) {
    const agentMetrics = this.metrics.filter((m) => m.executionId === orchestrationId);
    
    // Sum costs
    const totalCost = this.costRecords
      .filter((c) => c.workflowId === orchestrationId || c.requestId.startsWith(orchestrationId))
      .reduce((sum, c) => sum + c.cost, 0.0);

    // Sum tokens
    let promptTokens = 0;
    let completionTokens = 0;
    let cachedTokens = 0;
    let reasoningTokens = 0;
    let totalTokens = 0;

    const usages = this.tokenUsages.filter((u) => u.workflowId === orchestrationId);
    usages.forEach((u) => {
      promptTokens += u.usage.promptTokens;
      completionTokens += u.usage.completionTokens;
      cachedTokens += u.usage.cachedTokens;
      reasoningTokens += u.usage.reasoningTokens;
      totalTokens += u.usage.totalTokens;
    });

    // Latency
    const runLatencies = this.latencies.filter((l) => l.workflowId === orchestrationId);
    let providerLatency = 0;
    let embeddingLatency = 0;
    let memoryRetrievalLatency = 0;
    let ragLatency = 0;
    let toolLatency = 0;

    runLatencies.forEach((l) => {
      providerLatency += l.providerLatency;
      embeddingLatency += l.embeddingLatency;
      memoryRetrievalLatency += l.memoryRetrievalLatency;
      ragLatency += l.ragLatency;
      toolLatency += l.toolLatency;
    });

    const retries = agentMetrics.reduce((sum, m) => sum + m.retryCount, 0);
    const queueWait = agentMetrics.reduce((sum, m) => sum + m.queueWaitTime, 0);
    const duration = agentMetrics.reduce((sum, m) => sum + (m.totalDuration || 0), 0);
    const memoryUsage = agentMetrics.reduce((max, m) => Math.max(max, m.memoryUsage || 0), 0);

    return {
      orchestrationId,
      agentMetrics,
      cost: totalCost,
      tokenUsage: {
        promptTokens,
        completionTokens,
        cachedTokens,
        reasoningTokens,
        totalTokens,
      },
      executionTime: duration,
      retries,
      queueWait,
      latency: {
        providerLatency,
        embeddingLatency,
        memoryRetrievalLatency,
        ragLatency,
        toolLatency,
        overallWorkflowLatency: duration,
      },
      memoryUsage,
      knowledgeUsage: {
        ragCallsCount: runLatencies.filter(l => l.ragLatency > 0).length,
      },
    };
  }

  // --- Private Helpers ---

  private emitAnalyticsUpdate(workflowId: string): void {
    const stats = this.getAggregatedAnalytics(workflowId);
    this.logger.info(`Analytics aggregated for workflow: ${workflowId}`, {
      event: "ANALYTICS_UPDATED",
      workflowId,
      ...stats,
    });
  }
}
