/**
 * Type definitions for the event broker
 */

export type Payload = Record<string, any>;

export interface EventRecord {
  id: string;
  ts: number;
  payload: Payload;
  retries: number;
  topic?: string; // Optional topic/queue name
}

export interface InflightInfo {
  deadline: number; // epoch ms when visibility times out
  retries: number;
  record: EventRecord;
  workerId?: number;
}

export interface EnqueueResponse {
  id: string;
  timestamp: number;
  status: "queued";
}

export interface ConsumeResponse {
  events: Array<{
    id: string;
    payload: Payload;
    timestamp: number;
    retries: number;
    receiptId: string; // Used for acknowledgment
  }>;
  count: number;
}

export interface AcknowledgeRequest {
  receiptIds: string[];
}

export interface AcknowledgeResponse {
  acknowledged: string[];
  failed: Array<{ receiptId: string; reason: string }>;
}

export interface BrokerStatus {
  queue: {
    size: number;
    maxSize: number;
    utilizationPercent: number;
  };
  inflight: {
    count: number;
    events: Array<{
      id: string;
      deadline: number;
      retries: number;
    }>;
  };
  committed: {
    count: number;
  };
  dlq: {
    count: number;
  };
  workers: {
    active: number;
    total: number;
  };
  uptime: number;
}

export interface DLQEntry {
  receiptId: string;
  timestamp: number;
  reason: string;
  record: EventRecord;
  error?: string;
}

export interface Metrics {
  events: {
    enqueued: number;
    consumed: number;
    acknowledged: number;
    failed: number;
    dlq: number;
  };
  latency: {
    avgProcessingMs: number;
    maxProcessingMs: number;
  };
  timestamps: {
    startTime: number;
    lastEventTime: number;
  };
}
