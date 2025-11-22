/**
 * Configuration management for the event broker
 */

export interface BrokerConfig {
  // Server
  port: number;
  dataDir: string;
  
  // Queue
  queueMaxSize: number;
  workerCount: number;
  
  // Event processing
  visibilityTimeoutMs: number;
  maxRetries: number;
  reaperIntervalMs: number;
  
  // Polling
  defaultPollTimeoutMs: number;
  maxPollTimeoutMs: number;
  maxEventsPerPoll: number;
  
  // Backoff
  baseBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
}

export const defaultConfig: BrokerConfig = {
  port: Number(process.env.PORT) || 3000,
  dataDir: process.env.DATA_DIR || "data",
  
  queueMaxSize: Number(process.env.QUEUE_MAX_SIZE) || 1000,
  workerCount: Number(process.env.WORKER_COUNT) || 4,
  
  visibilityTimeoutMs: Number(process.env.VISIBILITY_TIMEOUT_MS) || 10_000,
  maxRetries: Number(process.env.MAX_RETRIES) || 5,
  reaperIntervalMs: Number(process.env.REAPER_INTERVAL_MS) || 1000,
  
  defaultPollTimeoutMs: Number(process.env.DEFAULT_POLL_TIMEOUT_MS) || 5_000,
  maxPollTimeoutMs: Number(process.env.MAX_POLL_TIMEOUT_MS) || 30_000,
  maxEventsPerPoll: Number(process.env.MAX_EVENTS_PER_POLL) || 10,
  
  baseBackoffMs: Number(process.env.BASE_BACKOFF_MS) || 1000,
  maxBackoffMs: Number(process.env.MAX_BACKOFF_MS) || 30_000,
  backoffMultiplier: Number(process.env.BACKOFF_MULTIPLIER) || 2,
};

export function getConfig(): BrokerConfig {
  return defaultConfig;
}
