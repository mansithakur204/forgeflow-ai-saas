// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Condition Executor
// Evaluates boolean expressions against ExecutionContext and node inputs.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseNodeExecutor } from "@/engine/executors/base/base-node-executor";
import { failureResult, successResult } from "@/engine/executors/base/executor-result";
import { evaluateExpression } from "@/engine/executors/logic/logic-expression";
import type {
  ExecutorExecutionInput,
  ExecutorExecutionResult,
  ExecutorValidationInput,
  ExecutorValidationResult,
  NodeExecutorMetadata,
} from "@/engine/types/executor";

const NODE_TYPE_ID = "logic_condition";

export class ConditionExecutor extends BaseNodeExecutor {
  getMetadata(): NodeExecutorMetadata {
    return {
      nodeTypeId: NODE_TYPE_ID,
      category: "logic",
      version: "1.0.0",
      displayName: "Condition",
      description: "Branch workflow execution based on a boolean expression",
      inputPorts: [{ id: "in", label: "Input" }],
      outputPorts: [
        { id: "true", label: "True" },
        { id: "false", label: "False" },
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

    const expression = input.node.config.expression;
    if (typeof expression !== "string" || expression.trim().length === 0) {
      return {
        valid: false,
        errors: [
          {
            code: "EXECUTOR_CONFIG_INVALID",
            message: "Condition expression is required",
            field: "expression",
          },
        ],
      };
    }

    return { valid: true, errors: [] };
  }

  protected run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const expression = String(input.node.config.expression ?? "");
    const primaryInput = input.inputs.in ?? input.inputs;

    const matched = evaluateExpression(expression, input.context, {
      in: primaryInput,
      ...input.inputs,
    });

    const outputs = matched
      ? { true: primaryInput, false: null }
      : { true: null, false: primaryInput };

    return Promise.resolve(
      successResult(outputs, {
        expression,
        matched,
      })
    );
  }
}
