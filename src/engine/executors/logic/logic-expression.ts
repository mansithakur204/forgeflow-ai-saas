// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Logic Expression Utilities
// Safe value resolution and expression evaluation without dynamic code execution.
// ─────────────────────────────────────────────────────────────────────────────

import type { ExecutionContext } from "@/engine/context/execution-context";

export type ComparisonOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "exists"
  | "not_exists";

const OPERATOR_ALIASES: Record<string, ComparisonOperator> = {
  equals: "equals",
  eq: "equals",
  "==": "equals",
  not_equals: "not_equals",
  neq: "not_equals",
  "!=": "not_equals",
  greater_than: "greater_than",
  gt: "greater_than",
  ">": "greater_than",
  greater_than_or_equal: "greater_than_or_equal",
  gte: "greater_than_or_equal",
  ">=": "greater_than_or_equal",
  less_than: "less_than",
  lt: "less_than",
  "<": "less_than",
  less_than_or_equal: "less_than_or_equal",
  lte: "less_than_or_equal",
  "<=": "less_than_or_equal",
  contains: "contains",
  not_contains: "not_contains",
  starts_with: "starts_with",
  ends_with: "ends_with",
  exists: "exists",
  not_exists: "not_exists",
};

export function normalizeOperator(operator: string): ComparisonOperator | null {
  return OPERATOR_ALIASES[operator.trim().toLowerCase()] ?? null;
}

export function resolvePathValue(
  path: string,
  context: ExecutionContext,
  inputs: Record<string, unknown>
): unknown {
  const trimmed = path.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("trigger.")) {
    return readPath(context.trigger.payload, trimmed.slice("trigger.".length));
  }

  if (trimmed.startsWith("variables.")) {
    return readPath(context.getVariables(), trimmed.slice("variables.".length));
  }

  if (trimmed.startsWith("inputs.")) {
    return readPath(inputs, trimmed.slice("inputs.".length));
  }

  if (Object.prototype.hasOwnProperty.call(inputs, trimmed)) {
    return inputs[trimmed];
  }

  return readPath(inputs, trimmed);
}

export function readPath(source: unknown, path: string): unknown {
  if (!path) {
    return source;
  }

  const segments = path.split(".").filter(Boolean);
  let current: unknown = source;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function compareValues(
  left: unknown,
  operator: ComparisonOperator,
  right: unknown
): boolean {
  switch (operator) {
    case "exists":
      return left !== undefined && left !== null;
    case "not_exists":
      return left === undefined || left === null;
    case "equals":
      return looseEqual(left, right);
    case "not_equals":
      return !looseEqual(left, right);
    case "contains":
      return containsValue(left, right);
    case "not_contains":
      return !containsValue(left, right);
    case "starts_with":
      return typeof left === "string" && typeof right === "string" && left.startsWith(right);
    case "ends_with":
      return typeof left === "string" && typeof right === "string" && left.endsWith(right);
    case "greater_than":
      return toNumber(left) > toNumber(right);
    case "greater_than_or_equal":
      return toNumber(left) >= toNumber(right);
    case "less_than":
      return toNumber(left) < toNumber(right);
    case "less_than_or_equal":
      return toNumber(left) <= toNumber(right);
    default:
      return false;
  }
}

export function evaluateExpression(
  expression: string,
  context: ExecutionContext,
  inputs: Record<string, unknown>
): boolean {
  const trimmed = expression.trim();
  if (!trimmed) {
    return false;
  }

  const orParts = splitTopLevel(trimmed, "||");
  if (orParts.length > 1) {
    return orParts.some((part) => evaluateExpression(part, context, inputs));
  }

  const andParts = splitTopLevel(trimmed, "&&");
  if (andParts.length > 1) {
    return andParts.every((part) => evaluateExpression(part, context, inputs));
  }

  if (trimmed.startsWith("!")) {
    return !evaluateExpression(trimmed.slice(1).trim(), context, inputs);
  }

  const comparisonMatch = trimmed.match(/^(.+?)\s*(==|!=|>=|<=|>|<|contains|starts_with|ends_with)\s*(.+)$/i);
  if (comparisonMatch) {
    const leftPath = comparisonMatch[1].trim();
    const operatorToken = comparisonMatch[2].trim();
    const rightRaw = comparisonMatch[3].trim();
    const operator = normalizeOperator(operatorToken);
    if (!operator) {
      return false;
    }
    const left = resolvePathValue(leftPath, context, inputs);
    const right = parseLiteral(rightRaw);
    return compareValues(left, operator, right);
  }

  const resolved = resolvePathValue(trimmed, context, inputs);
  return Boolean(resolved);
}

export function coerceToArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}

function splitTopLevel(expression: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let inQuotes = false;
  let quoteChar = "";

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    const next = expression[index + 1];

    if ((char === '"' || char === "'") && expression[index - 1] !== "\\") {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
      }
      current += char;
      continue;
    }

    if (!inQuotes) {
      if (char === "(") {
        depth += 1;
      } else if (char === ")" && depth > 0) {
        depth -= 1;
      } else if (
        depth === 0 &&
        char === delimiter[0] &&
        (delimiter.length === 1 || next === delimiter[1])
      ) {
        parts.push(current.trim());
        current = "";
        if (delimiter.length > 1) {
          index += 1;
        }
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function parseLiteral(raw: string): unknown {
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw);
  }
  return raw;
}

function looseEqual(left: unknown, right: unknown): boolean {
  if (typeof left === "number" || typeof right === "number") {
    return toNumber(left) === toNumber(right);
  }
  return left === right;
}

function containsValue(left: unknown, right: unknown): boolean {
  if (Array.isArray(left)) {
    return left.some((item) => looseEqual(item, right));
  }
  if (typeof left === "string" && typeof right === "string") {
    return left.includes(right);
  }
  return false;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }
  return Number.NaN;
}

export function applyFieldMappings(
  source: Record<string, unknown>,
  mappings: Array<{ target: string; source?: string; value?: unknown }>
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const mapping of mappings) {
    if (!mapping.target) {
      continue;
    }
    if (mapping.source) {
      output[mapping.target] = readPath(source, mapping.source);
    } else {
      output[mapping.target] = mapping.value;
    }
  }
  return output;
}
