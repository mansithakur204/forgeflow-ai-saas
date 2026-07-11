export interface ProcessingResult {
  documentId: string;
  status: "success" | "failed";
  chunksCount: number;
  durationMs: number;
  errorMessage?: string | null;
}

export type ProcessingEventType =
  | "started"
  | "queued"
  | "parsing_started"
  | "parsing_completed"
  | "chunking_started"
  | "chunking_completed"
  | "failed"
  | "completed";

export interface ProcessingEvent {
  documentId: string;
  type: ProcessingEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
