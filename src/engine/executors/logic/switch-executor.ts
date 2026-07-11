// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Switch Executor
// Routes input to branch outputs based on field value matching.
// ─────────────────────────────────────────────────────────────────────────────

import { BaseNodeExecutor } from "@/engine/executors/base/base-node-executor";
import { failureResult, successResult } from "@/engine/executors/base/executor-result";
import { readPath } from "@/engine/executors/logic/logic-expression";
import type {
  ExecutorExecutionInput,
  ExecutorExecutionResult,
  ExecutorValidationInput,
  ExecutorValidationResult,
  NodeExecutorMetadata,
} from "@/engine/types/executor";

const NODE_TYPE_ID = "logic_switch";

interface SwitchCase {
  value: unknown;
  outputPort: string;
}

function parseSwitchCases(config: Record<string, unknown>): SwitchCase[] {
  const raw = config.cases;
  if (!Array.isArray(raw)) {
    return [];
  }

  const cases: SwitchCase[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const entry = item as Record<string, unknown>;
    if (typeof entry.outputPort !== "string" || entry.outputPort.length === 0) {
      continue;
    }
    cases.push({
      value: entry.value,
      outputPort: entry.outputPort,
    });
  }
  return cases;
}

export class SwitchExecutor extends BaseNodeExecutor {
  getMetadata(): NodeExecutorMetadata {
    return {
      nodeTypeId: NODE_TYPE_ID,
      category: "logic",
      version: "1.0.0",
      displayName: "Switch",
      description: "Route input to branch outputs based on field value matching",
      inputPorts: [{ id: "in", label: "Input" }],
      outputPorts: [
        { id: "default", label: "Default" },
        { id: "branch", label: "Branch" },
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
    if (typeof field !== "string" || field.trim().length === 0) {
      return {
        valid: false,
        errors: [
          {
            code: "EXECUTOR_CONFIG_INVALID",
            message: "Switch field is required",
            field: "field",
          },
        ],
      };
    }

    const cases = parseSwitchCases(input.node.config);
    if (cases.length === 0) {
      return {
        valid: false,
        errors: [
          {
            code: "EXECUTOR_CONFIG_INVALID",
            message: "At least one switch case is required",
            field: "cases",
          },
        ],
      };
    }

    return { valid: true, errors: [] };
  }

  protected run(input: ExecutorExecutionInput): Promise<ExecutorExecutionResult> {
    const field = String(input.node.config.field ?? "");
    const defaultPort =
      typeof input.node.config.defaultPort === "string"
        ? input.node.config.defaultPort
        : "default";
    const cases = parseSwitchCases(input.node.config);
    const sourceValue = input.inputs.in ?? input.inputs;
    const source =
      sourceValue && typeof sourceValue === "object"
        ? (sourceValue as Record<string, unknown>)
        : { value: sourceValue };
    const actualValue = readPath(source, field);

    let selectedPort = defaultPort;
    for (const switchCase of cases) {
      if (Object.is(switchCase.value, actualValue) || switchCase.value === actualValue) {
        selectedPort = switchCase.outputPort;
        break;
      }
    }

    const outputs: Record<string, unknown> = { [selectedPort]: sourceValue };
    if (selectedPort !== defaultPort) {
      outputs.default = null;
    }

    return Promise.resolve(
      successResult(outputs, {
        field,
        selectedPort,
        matchedValue: actualValue,
        caseCount: cases.length,
      })
    );
  }
}
