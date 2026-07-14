// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Entity Mappers
// Decouples domain representations from database layouts (Prisma/Drizzle ready).
// ─────────────────────────────────────────────────────────────────────────────

import type { ExecutionLogEntry } from "@/engine/types/logs";
import type { TimelineEntry } from "@/engine/types/timeline-types";

// ── Execution Log Mapper ─────────────────────────────────────────────────────

export class LogEntityMapper {
  /**
   * Convert from Domain/Repository model to Database row layout.
   */
  static toDb(entry: ExecutionLogEntry): Record<string, unknown> {
    return {
      id: entry.id,
      run_id: entry.runId,
      node_id: entry.nodeId ?? null,
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp,
      data_json: entry.data ? JSON.stringify(entry.data) : null,
    };
  }

  /**
   * Convert from Database row layout back to Domain/Repository model.
   */
  static toDomain(row: Record<string, any>): ExecutionLogEntry {
    let parsedData: Record<string, unknown> | undefined = undefined;
    if (row.data_json) {
      parsedData = typeof row.data_json === "string" ? JSON.parse(row.data_json) : row.data_json;
    }

    return {
      id: String(row.id),
      runId: String(row.run_id),
      nodeId: row.node_id ? String(row.node_id) : undefined,
      level: row.level,
      message: String(row.message),
      timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : String(row.timestamp),
      data: parsedData,
    };
  }
}

// ── Timeline Entry Mapper ────────────────────────────────────────────────────

export class TimelineEntityMapper {
  /**
   * Convert from Domain/Repository model to Database row layout.
   */
  static toDb(entry: TimelineEntry): Record<string, unknown> {
    return {
      id: entry.id,
      workflow_id: entry.workflowId,
      execution_id: entry.executionId,
      node_id: entry.nodeId ?? null,
      timestamp: entry.timestamp,
      sequence_number: entry.sequenceNumber,
      level: entry.level,
      event_type: entry.eventType,
      message: entry.message,
      status: entry.status,
      duration_ms: entry.durationMs ?? null,
      metadata_json: entry.metadata ? JSON.stringify(entry.metadata) : null,
    };
  }

  /**
   * Convert from Database row layout back to Domain/Repository model.
   */
  static toDomain(row: Record<string, any>): TimelineEntry {
    let parsedMetadata: Record<string, unknown> = {};
    if (row.metadata_json) {
      parsedMetadata = typeof row.metadata_json === "string" ? JSON.parse(row.metadata_json) : row.metadata_json;
    }

    return {
      id: String(row.id),
      workflowId: String(row.workflow_id),
      executionId: String(row.execution_id),
      nodeId: row.node_id ? String(row.node_id) : null,
      timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : String(row.timestamp),
      sequenceNumber: Number(row.sequence_number),
      level: row.level,
      eventType: row.event_type,
      message: String(row.message),
      status: row.status,
      durationMs: row.duration_ms !== null && row.duration_ms !== undefined ? Number(row.duration_ms) : null,
      metadata: Object.freeze(parsedMetadata),
    };
  }
}
