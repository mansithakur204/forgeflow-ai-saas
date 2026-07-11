// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Filter Executor
// Splits records into pass and fail outputs based on field conditions.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseNodeExecutor } from "@/engine/executors/base/base-node-executor";
import { failureResult, successResult } from "@/engine/executors/base/executor-result";
import {
  coerceToArray,
  compareValues,
  normalizeOperator,
  readPath,
} from "@/engine/executors/logic/logic-expression";
import type {
  ExecutorExecutionInput,
  ExecutorExecutionResult,
  ExecutorValidationInput,
  ExecutorValidationResult,
  NodeExecutorMetadata,
} from "@/engine/types/executor";

const NODE_TYPE_ID = "logic_filter";

export class FilterExecutor extends BaseNodeExecutor {
  getMetadata(): NodeExecutorMetadata {
    return {
      nodeTypeId: NODE_TYPE_ID,
      category: "logic",
      version: "1.0.0",
      displayName: "Filter",
      description: "Pass records matching a field condition to separate outputs",
      inputPorts: [{ id: "in", label: "Records", multiple: true }],
      outputPorts: [
        { id: "pass", label: "Matches" },
        { id: "fail", label: "Rejected" },
      ],
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

    const field = input.node.config.field;
    const operator = input.node.config.operator;
    if (typeof field !== "string" || field.trim().length === 0) {
      return {
        valid: false,
        errors: [
          {
            code: "EXECUTOR_CONFIG_INVALID",
            message: "Filter field is required",
            field: "field",
          },
        ],
      };
    }
    if (typeof operator !== "string" || normalizeOperator(operator) === null) {
      return {
        valid: false,
        errors: [
          {
            code: "EXECUTOR_CONFIG_INVALID",
            message: "Filter operator is invalid",
            field: "operator",
          },
        ],
      };
    }

    return { valid: true, errors: [] };
  }

  protected run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const field = String(input.node.config.field ?? "");
    const operator = normalizeOperator(String(input.node.config.operator ?? ""));
    const expectedValue = input.node.config.value;

    if (!operator) {
      return Promise.resolve(
        failureResult({
          code: "EXECUTOR_CONFIG_INVALID",
          message: "Filter operator is invalid",
          retryable: false,
        })
      );
    }

    const records = coerceToArray(input.inputs.in ?? input.inputs);
    const pass: unknown[] = [];
    const fail: unknown[] = [];

    for (const record of records) {
      const left =
        record && typeof record === "object"
          ? readPath(record as Record<string, unknown>, field)
          : record;
      if (compareValues(left, operator, expectedValue)) {
        pass.push(record);
      } else {
        fail.push(record);
      }
    }

    return Promise.resolve(
      successResult(
        { pass, fail },
        {
          field,
          operator,
          passCount: pass.length,
          failCount: fail.length,
        }
      )
    );
  }
}
