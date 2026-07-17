// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1 — OpenAPI Specification (Swagger JSON)
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "ForgeFlow AI Public API",
    version: "1.0.0",
    description: "Production REST API for ForgeFlow AI. Authenticate with a Bearer Personal Access Token.",
    contact: { name: "ForgeFlow Support", email: "api@forgeflow.ai" },
    license: { name: "MIT" },
  },
  servers: [{ url: "/api/v1", description: "Production" }],
  components: {
    securitySchemes: {
      BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "PAT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          total: { type: "integer" },
          page: { type: "integer" },
          pageSize: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      Workflow: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["draft", "active", "paused", "archived"] },
          nodeCount: { type: "integer" },
          runCount: { type: "integer" },
          lastRun: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      Execution: {
        type: "object",
        properties: {
          id: { type: "string" },
          workflowId: { type: "string" },
          workflowName: { type: "string" },
          status: { type: "string", enum: ["completed", "failed", "running", "pending"] },
          durationMs: { type: "integer", nullable: true },
          startedAt: { type: "string", format: "date-time" },
          finishedAt: { type: "string", format: "date-time", nullable: true },
          errorMessage: { type: "string", nullable: true },
        },
      },
      SecretMeta: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          type: { type: "string" },
          folder: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          version: { type: "integer" },
          archived: { type: "boolean" },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          lastRotatedAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          usageCount: { type: "integer" },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    "/workflows": {
      get: {
        operationId: "listWorkflows",
        summary: "List workflows",
        tags: ["Workflows"],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "array", items: { "$ref": "#/components/schemas/Workflow" } }, meta: { "$ref": "#/components/schemas/Pagination" } } } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } },
        },
      },
    },
    "/workflows/{id}": {
      get: {
        operationId: "getWorkflow",
        summary: "Get a single workflow",
        tags: ["Workflows"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not found", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } },
        },
      },
    },
    "/executions": {
      get: {
        operationId: "listExecutions",
        summary: "List execution history",
        tags: ["Executions"],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "workflowId", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Success" }, "401": { description: "Unauthorized" } },
      },
    },
    "/secrets": {
      get: {
        operationId: "listSecrets",
        summary: "List secret metadata (values never exposed)",
        tags: ["Secrets"],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "folder", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Success" }, "401": { description: "Unauthorized" } },
      },
    },
    "/integrations": {
      get: {
        operationId: "listIntegrations",
        summary: "List integration statuses",
        tags: ["Integrations"],
        responses: { "200": { description: "Success" }, "401": { description: "Unauthorized" } },
      },
    },
    "/templates": {
      get: {
        operationId: "listTemplates",
        summary: "List workflow templates",
        tags: ["Templates"],
        responses: { "200": { description: "Success" }, "401": { description: "Unauthorized" } },
      },
    },
    "/marketplace": {
      get: {
        operationId: "listMarketplace",
        summary: "List marketplace entries",
        tags: ["Marketplace"],
        responses: { "200": { description: "Success" }, "401": { description: "Unauthorized" } },
      },
    },
    "/billing": {
      get: {
        operationId: "getBilling",
        summary: "Get subscription and usage summary",
        tags: ["Billing"],
        responses: { "200": { description: "Success" }, "401": { description: "Unauthorized" } },
      },
    },
    "/organizations": {
      get: {
        operationId: "getOrganization",
        summary: "Get workspace organization info",
        tags: ["Organizations"],
        responses: { "200": { description: "Success" }, "401": { description: "Unauthorized" } },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: { "Content-Type": "application/json" },
  });
}

export const dynamic = "force-dynamic";
