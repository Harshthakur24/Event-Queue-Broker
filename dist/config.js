"use strict";
/**
 * Configuration management for the event broker
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = void 0;
exports.getConfig = getConfig;
exports.defaultConfig = {
    port: Number(process.env.PORT) || 3000,
    dataDir: process.env.DATA_DIR || "data",
    queueMaxSize: Number(process.env.QUEUE_MAX_SIZE) || 1000,
    workerCount: Number(process.env.WORKER_COUNT) || 4,
    visibilityTimeoutMs: Number(process.env.VISIBILITY_TIMEOUT_MS) || 10000,
    maxRetries: Number(process.env.MAX_RETRIES) || 5,
    reaperIntervalMs: Number(process.env.REAPER_INTERVAL_MS) || 1000,
    defaultPollTimeoutMs: Number(process.env.DEFAULT_POLL_TIMEOUT_MS) || 5000,
    maxPollTimeoutMs: Number(process.env.MAX_POLL_TIMEOUT_MS) || 30000,
    maxEventsPerPoll: Number(process.env.MAX_EVENTS_PER_POLL) || 10,
    baseBackoffMs: Number(process.env.BASE_BACKOFF_MS) || 1000,
    maxBackoffMs: Number(process.env.MAX_BACKOFF_MS) || 30000,
    backoffMultiplier: Number(process.env.BACKOFF_MULTIPLIER) || 2,
};
function getConfig() {
    return exports.defaultConfig;
}
//# sourceMappingURL=config.js.map