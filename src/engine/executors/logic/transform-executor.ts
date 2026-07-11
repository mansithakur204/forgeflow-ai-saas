// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Transform Executor
// Maps and reshapes data using ExecutionContext-resolved field mappings.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseNodeExecutor } from "@/engine/executors/base/base-node-executor";
import { failureResult, successResult } from "@/engine/executors/base/executor-result";
import { applyFieldMappings } from "@/engine/executors/logic/logic-expression";
import type {
  ExecutorExecutionInput,
  ExecutorExecutionResult,
  ExecutorValidationInput,
  ExecutorValidationResult,
  NodeExecutorMetadata,
} from "@/engine/types/executor";

const NODE_TYPE_ID = "logic_transform";

interface TransformMapping {
  target: string;
  source?: string;
  value?: unknown;
}

function parseMappings(config: Record<string, unknown>): TransformMapping[] {
  const raw = config.mappings;
  if (!Array.isArray(raw)) {
    return [];
  }

  const mappings: TransformMapping[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const mapping = item as Record<string, unknown>;
    if (typeof mapping.target !== "string" || mapping.target.length === 0) {
      continue;
    }
    mappings.push({
      target: mapping.target,
      source: typeof mapping.source === "string" ? mapping.source : undefined,
      value: mapping.value,
    });
  }
  return mappings;
}

export class TransformExecutor extends BaseNodeExecutor {
  getMetadata(): NodeExecutorMetadata {
    return {
      nodeTypeId: NODE_TYPE_ID,
      category: "logic",
      version: "1.0.0",
      displayName: "Transform",
      description: "Map, reshape, or compute new output fields from input data",
      inputPorts: [{ id: "in", label: "Input" }],
      outputPorts: [{ id: "out", label: "Output" }],
      supportsCancellation: true,
      supportsRetry: false,
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

    const mappings = parseMappings(input.node.config);
    if (mappings.length === 0) {
      return {
        valid: false,
        errors: [
          {
            code: "EXECUTOR_CONFIG_INVALID",
            message: "At least one transform mapping is required",
            field: "mappings",
          },
        ],
      };
    }

    return { valid: true, errors: [] };
  }

  protected run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const mappings = parseMappings(input.node.config);
    const sourceValue = input.inputs.in ?? input.inputs;
    const source =
      sourceValue && typeof sourceValue === "object"
        ? (sourceValue as Record<string, unknown>)
        : { value: sourceValue };

    const transformed = applyFieldMappings(source, mappings);
    if (Object.keys(transformed).length === 0) {
      return Promise.resolve(
        failureResult({
          code: "EXECUTOR_EXECUTION_FAILED",
          message: "Transform produced no output fields",
          retryable: false,
        })
      );
    }

    return Promise.resolve(
      successResult(
        { out: transformed },
        {
          mappingCount: mappings.length,
        }
      )
    );
  }
}
