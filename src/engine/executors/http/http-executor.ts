// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — HTTP Executor (Mock)
// Production architecture for REST calls with mock responses until networking layer.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseNodeExecutor } from "@/engine/executors/base/base-node-executor";
import { failureResult, successResult } from "@/engine/executors/base/executor-result";
import {
  DEFAULT_HTTP_RETRY,
  DEFAULT_HTTP_TIMEOUT,
  type HttpMethod,
  type HttpRequestConfig,
  type HttpResponseMetadata,
} from "@/engine/executors/http/http-types";
import type {
  ExecutorExecutionInput,
  ExecutorExecutionResult,
  ExecutorValidationInput,
  ExecutorValidationResult,
  NodeExecutorMetadata,
} from "@/engine/types/executor";

const NODE_TYPE_ID = "io_http";
const SUPPORTED_METHODS: readonly HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
];

function parseRequestConfig(config: Record<string, unknown>): HttpRequestConfig | null {
  const method = String(config.method ?? "GET").toUpperCase() as HttpMethod;
  if (!SUPPORTED_METHODS.includes(method)) {
    return null;
  }

  const url = typeof config.url === "string" ? config.url.trim() : "";
  if (!url) {
    return null;
  }

  const headers =
    config.headers && typeof config.headers === "object"
      ? (config.headers as Record<string, string>)
      : undefined;

  const auth =
    config.auth && typeof config.auth === "object"
      ? (config.auth as HttpRequestConfig["auth"])
      : undefined;

  const retry =
    config.retry && typeof config.retry === "object"
      ? { ...DEFAULT_HTTP_RETRY, ...(config.retry as HttpRequestConfig["retry"]) }
      : DEFAULT_HTTP_RETRY;

  const timeout =
    config.timeout && typeof config.timeout === "object"
      ? { ...DEFAULT_HTTP_TIMEOUT, ...(config.timeout as HttpRequestConfig["timeout"]) }
      : DEFAULT_HTTP_TIMEOUT;

  const streaming =
    config.streaming && typeof config.streaming === "object"
      ? (config.streaming as HttpRequestConfig["streaming"])
      : undefined;

  return {
    method,
    url,
    headers,
    body: config.body,
    auth,
    retry,
    timeout,
    streaming,
    query:
      config.query && typeof config.query === "object"
        ? (config.query as HttpRequestConfig["query"])
        : undefined,
  };
}

function buildMockResponse(
  request: HttpRequestConfig,
  inputPayload: unknown
): { body: unknown; metadata: HttpResponseMetadata } {
  const responseHeaders: Record<string, string> = {
    "content-type": "application/json",
    "x-forgeflow-mock": "true",
    ...(request.headers ?? {}),
  };

  if (request.auth?.type && request.auth.type !== "none") {
    responseHeaders["x-forgeflow-auth-type"] = request.auth.type;
  }

  const body = {
    mock: true,
    method: request.method,
    url: request.url,
    receivedInput: inputPayload,
    query: request.query ?? {},
    streamingEnabled: request.streaming?.enabled ?? false,
  };

  return {
    body,
    metadata: {
      status: 200,
      statusText: "OK",
      headers: responseHeaders,
      durationMs: 0,
      mock: true,
      method: request.method,
      url: request.url,
    },
  };
}

export class HttpExecutor extends BaseNodeExecutor {
  getMetadata(): NodeExecutorMetadata {
    return {
      nodeTypeId: NODE_TYPE_ID,
      category: "http",
      version: "1.0.0",
      displayName: "HTTP Request",
      description: "Execute REST API requests with auth, retry, timeout, and streaming support",
      inputPorts: [{ id: "in", label: "Trigger" }],
      outputPorts: [
        { id: "out", label: "Response" },
        { id: "err", label: "Error" },
      ],
      supportsCancellation: true,
      supportsRetry: true,
    };
  }

  validate(input: ExecutorValidationInput): ExecutorValidationResult {
    if (input.node.typeId !== NODE_TYPE_ID) {
      return {
        valid: false,
        errors: [
          {
            code: "EXECUTOR_CONFIG_INVALID",
            message: `Expected node type "${NODE_TYPE_ID}"`,
            field: "typeId",
          },
        ],
      };
    }

    const request = parseRequestConfig(input.node.config);
    if (!request) {
      return {
        valid: false,
        errors: [
          {
            code: "EXECUTOR_CONFIG_INVALID",
            message: "HTTP method and URL are required",
            field: "url",
          },
        ],
      };
    }

    return { valid: true, errors: [] };
  }

  protected run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const request = parseRequestConfig(input.node.config);
    if (!request) {
      return Promise.resolve(
        failureResult({
          code: "EXECUTOR_CONFIG_INVALID",
          message: "HTTP request configuration is invalid",
          retryable: false,
        })
      );
    }

    const triggerInput = input.inputs.in ?? input.inputs;
    const mock = buildMockResponse(request, triggerInput);

    const streamPreview = request.streaming?.enabled
      ? {
          chunks: [{ index: 0, data: JSON.stringify(mock.body), done: true }],
          aggregated: JSON.stringify(mock.body),
        }
      : undefined;

    return Promise.resolve(
      successResult(
        {
          out: mock.body,
          err: null,
        },
        {
          ...mock.metadata,
          retry: request.retry,
          timeout: request.timeout,
          streamPreview,
        }
      )
    );
  }
}
