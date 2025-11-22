"use strict";
/**
 * Core event broker logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBroker = void 0;
const uuid_1 = require("uuid");
const queue_1 = require("./queue");
const errors_1 = require("./errors");
class EventBroker {
    constructor(config, storage, eventHandler) {
        this.config = config;
        this.storage = storage;
        this.eventHandler = eventHandler;
        this.inflight = new Map();
        this.committed = new Set();
        this.receiptToEventId = new Map(); // receiptId -> eventId
        this.workers = [];
        this.isShuttingDown = false;
        this.startTime = Date.now();
        // Metrics
        this.metrics = {
            events: {
                enqueued: 0,
                consumed: 0,
                acknowledged: 0,
                failed: 0,
                dlq: 0,
            },
            latency: {
                avgProcessingMs: 0,
                maxProcessingMs: 0,
            },
            timestamps: {
                startTime: Date.now(),
                lastEventTime: 0,
            },
        };
        this.processingTimes = [];
        this.queue = new queue_1.AsyncQueue(config.queueMaxSize);
    }
    async initialize() {
        console.log("[Broker] Loading committed event IDs...");
        this.committed = await this.storage.loadCommitted();
        console.log(`[Broker] Loaded ${this.committed.size} committed events`);
        console.log("[Broker] Restoring events from WAL...");
        let restoredCount = 0;
        await this.storage.restoreFromWAL(this.committed, async (rec) => {
            const pushed = this.queue.push(rec);
            if (!pushed) {
                // Queue full on startup - move to DLQ
                await this.storage.appendDLQ({
                    receiptId: (0, uuid_1.v4)(),
                    timestamp: Date.now(),
                    reason: "startup_queue_full",
                    record: rec,
                });
                this.metrics.events.dlq++;
                return false;
            }
            restoredCount++;
            return true;
        });
        console.log(`[Broker] Restored ${restoredCount} events from WAL`);
        // Start workers
        console.log(`[Broker] Starting ${this.config.workerCount} workers...`);
        for (let i = 0; i < this.config.workerCount; i++) {
            const workerPromise = this.workerLoop(i);
            this.workers.push(workerPromise);
            workerPromise.catch((e) => console.error(`[Worker ${i}] Crashed:`, e));
        }
        // Start reaper
        this.startInflightReaper();
        console.log("[Broker] Initialization complete");
    }
    async enqueueEvent(payload, topic) {
        if (!payload || typeof payload !== "object") {
            throw new errors_1.InvalidEventError("Payload must be a valid object");
        }
        const id = payload.id ?? (0, uuid_1.v4)();
        const record = {
            id,
            ts: Date.now(),
            payload,
            retries: 0,
            ...(topic && { topic }),
        };
        // Append to WAL
        await this.storage.appendWAL(record);
        // Push to queue
        const ok = this.queue.push(record);
        if (!ok) {
            // Backpressure: move to DLQ
            await this.storage.appendDLQ({
                receiptId: (0, uuid_1.v4)(),
                timestamp: Date.now(),
                reason: "queue_full_on_enqueue",
                record,
            });
            this.metrics.events.dlq++;
            throw new errors_1.QueueFullError("Queue full, event moved to DLQ");
        }
        this.metrics.events.enqueued++;
        this.metrics.timestamps.lastEventTime = Date.now();
        return {
            id,
            timestamp: record.ts,
            status: "queued",
        };
    }
    async consumeEvents(maxEvents = 10, timeoutMs = 5000, topic) {
        const events = [];
        const startTime = Date.now();
        const pollDeadline = startTime + Math.min(timeoutMs, this.config.maxPollTimeoutMs);
        while (events.length < maxEvents && Date.now() < pollDeadline) {
            const remainingTimeout = Math.max(0, pollDeadline - Date.now());
            const record = await this.queue.pop(remainingTimeout);
            if (!record) {
                // Timeout or no more events
                break;
            }
            // Filter by topic if specified
            if (topic && record.topic !== topic) {
                // Put back at front of queue to avoid starvation
                const pushed = this.queue.unshift(record);
                if (!pushed) {
                    // Queue full, put at end as fallback
                    const pushedEnd = this.queue.push(record);
                    if (!pushedEnd) {
                        console.warn(`[Broker] Queue full, skipping topic-filtered event ${record.id}`);
                    }
                }
                continue;
            }
            // Skip if already committed or already inflight
            if (this.committed.has(record.id) || this.inflight.has(record.id)) {
                continue;
            }
            // Mark as inflight
            const receiptId = (0, uuid_1.v4)();
            const visibilityDeadline = Date.now() + this.config.visibilityTimeoutMs;
            this.inflight.set(record.id, {
                deadline: visibilityDeadline,
                retries: record.retries,
                record,
            });
            this.receiptToEventId.set(receiptId, record.id);
            events.push({
                id: record.id,
                payload: record.payload,
                timestamp: record.ts,
                retries: record.retries,
                receiptId,
            });
            this.metrics.events.consumed++;
        }
        return {
            events,
            count: events.length,
        };
    }
    async acknowledgeEvents(receiptIds) {
        const acknowledged = [];
        const failed = [];
        for (const receiptId of receiptIds) {
            const eventId = this.receiptToEventId.get(receiptId);
            if (!eventId) {
                failed.push({ receiptId, reason: "Invalid receipt ID" });
                continue;
            }
            const inflightInfo = this.inflight.get(eventId);
            if (!inflightInfo) {
                failed.push({ receiptId, reason: "Event not in-flight" });
                continue;
            }
            // Mark as committed
            await this.storage.appendCommitted(eventId);
            this.committed.add(eventId);
            this.inflight.delete(eventId);
            this.receiptToEventId.delete(receiptId);
            acknowledged.push(receiptId);
            this.metrics.events.acknowledged++;
        }
        return { acknowledged, failed };
    }
    async nackEvent(receiptId, requeue = true) {
        const eventId = this.receiptToEventId.get(receiptId);
        if (!eventId) {
            throw new errors_1.EventNotFoundError(`Receipt ID: ${receiptId}`);
        }
        const inflightInfo = this.inflight.get(eventId);
        if (!inflightInfo) {
            throw new errors_1.EventNotInflightError(eventId);
        }
        const record = inflightInfo.record;
        this.inflight.delete(eventId);
        this.receiptToEventId.delete(receiptId);
        if (requeue) {
            record.retries = (record.retries ?? 0) + 1;
            if (record.retries > this.config.maxRetries) {
                // Move to DLQ
                await this.storage.appendDLQ({
                    receiptId: (0, uuid_1.v4)(),
                    timestamp: Date.now(),
                    reason: "max_retries_exceeded",
                    record,
                });
                this.metrics.events.dlq++;
            }
            else {
                // Requeue with backoff
                const backoffMs = this.calculateBackoff(record.retries);
                setTimeout(() => {
                    const pushed = this.queue.push(record);
                    if (!pushed) {
                        // Queue full on requeue
                        this.storage.appendDLQ({
                            receiptId: (0, uuid_1.v4)(),
                            timestamp: Date.now(),
                            reason: "queue_full_on_requeue",
                            record,
                        }).catch(console.error);
                        this.metrics.events.dlq++;
                    }
                }, backoffMs);
            }
        }
    }
    getStatus() {
        const inflightEvents = Array.from(this.inflight.entries()).map(([id, info]) => ({
            id,
            deadline: info.deadline,
            retries: info.retries,
        }));
        return {
            queue: {
                size: this.queue.size(),
                maxSize: this.config.queueMaxSize,
                utilizationPercent: (this.queue.size() / this.config.queueMaxSize) * 100,
            },
            inflight: {
                count: this.inflight.size,
                events: inflightEvents,
            },
            committed: {
                count: this.committed.size,
            },
            dlq: {
                count: 0, // Will be populated by API
            },
            workers: {
                active: this.workers.length,
                total: this.config.workerCount,
            },
            uptime: Date.now() - this.startTime,
        };
    }
    getMetrics() {
        // Calculate average processing time
        if (this.processingTimes.length > 0) {
            const sum = this.processingTimes.reduce((a, b) => a + b, 0);
            this.metrics.latency.avgProcessingMs = sum / this.processingTimes.length;
            this.metrics.latency.maxProcessingMs = Math.max(...this.processingTimes);
        }
        return { ...this.metrics };
    }
    async getDLQEntries(limit = 100, offset = 0) {
        return this.storage.readDLQ(limit, offset);
    }
    async getDLQCount() {
        return this.storage.countDLQ();
    }
    async shutdown() {
        console.log("[Broker] Shutting down broker...");
        this.isShuttingDown = true;
        // Wait for inflight events to complete (with timeout)
        const shutdownTimeout = 30000;
        const startTime = Date.now();
        while (this.inflight.size > 0 && Date.now() - startTime < shutdownTimeout) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (this.inflight.size > 0) {
            console.warn(`[Broker] Shutting down with ${this.inflight.size} inflight events`);
        }
        console.log("[Broker] Shutdown complete");
    }
    async workerLoop(workerIdx) {
        // Skip worker loop if no event handler (manual consumption only)
        if (!this.eventHandler) {
            console.log(`Worker ${workerIdx}: No event handler, skipping automatic processing`);
            return;
        }
        while (!this.isShuttingDown) {
            try {
                const rec = await this.queue.pop(1000); // Poll with 1s timeout
                if (!rec)
                    continue;
                // Skip if already committed
                if (this.committed.has(rec.id)) {
                    console.log(`Worker ${workerIdx}: skipping already committed ${rec.id}`);
                    continue;
                }
                // Skip if already inflight (might be consumed via API)
                if (this.inflight.has(rec.id)) {
                    continue;
                }
                const startTime = Date.now();
                // Mark as inflight
                const deadline = Date.now() + this.config.visibilityTimeoutMs;
                this.inflight.set(rec.id, {
                    deadline,
                    retries: rec.retries,
                    record: rec,
                    workerId: workerIdx,
                });
                try {
                    // Execute event handler
                    await this.eventHandler(rec);
                    // On success: mark committed
                    await this.storage.appendCommitted(rec.id);
                    this.committed.add(rec.id);
                    const processingTime = Date.now() - startTime;
                    this.processingTimes.push(processingTime);
                    if (this.processingTimes.length > 1000) {
                        this.processingTimes.shift(); // Keep last 1000
                    }
                    console.log(`Worker ${workerIdx}: executed ${rec.id} (${processingTime}ms)`);
                }
                catch (err) {
                    const errorMsg = err.message;
                    console.warn(`Worker ${workerIdx}: event ${rec.id} failed:`, errorMsg);
                    rec.retries = (rec.retries ?? 0) + 1;
                    this.metrics.events.failed++;
                    if (rec.retries > this.config.maxRetries) {
                        await this.storage.appendDLQ({
                            receiptId: (0, uuid_1.v4)(),
                            timestamp: Date.now(),
                            reason: "max_retries",
                            record: rec,
                            error: errorMsg,
                        });
                        this.metrics.events.dlq++;
                        console.warn(`Worker ${workerIdx}: moved ${rec.id} to DLQ after ${rec.retries} retries`);
                    }
                    else {
                        // Requeue with backoff
                        const backoffMs = this.calculateBackoff(rec.retries);
                        setTimeout(() => {
                            const pushed = this.queue.push(rec);
                            if (!pushed) {
                                this.storage.appendDLQ({
                                    receiptId: (0, uuid_1.v4)(),
                                    timestamp: Date.now(),
                                    reason: "queue_full_on_requeue",
                                    record: rec,
                                }).catch(console.error);
                                this.metrics.events.dlq++;
                                console.warn(`requeue: queue full, moved ${rec.id} to DLQ`);
                            }
                        }, backoffMs);
                    }
                }
                finally {
                    this.inflight.delete(rec.id);
                    this.queue.notifySpace();
                }
            }
            catch (error) {
                console.error(`Worker ${workerIdx} error:`, error);
                await this.sleep(1000); // Back off on error
            }
        }
    }
    startInflightReaper() {
        setInterval(async () => {
            const now = Date.now();
            for (const [id, info] of Array.from(this.inflight.entries())) {
                if (info.deadline <= now) {
                    // Timeout -> requeue
                    this.inflight.delete(id);
                    const rec = info.record;
                    rec.retries = (rec.retries ?? 0) + 1;
                    if (rec.retries > this.config.maxRetries) {
                        await this.storage.appendDLQ({
                            receiptId: (0, uuid_1.v4)(),
                            timestamp: Date.now(),
                            reason: "visibility_timeout_max_retries",
                            record: rec,
                        });
                        this.metrics.events.dlq++;
                        console.warn(`reaper: ${id} timed out and moved to DLQ`);
                    }
                    else {
                        const pushed = this.queue.push(rec);
                        if (!pushed) {
                            await this.storage.appendDLQ({
                                receiptId: (0, uuid_1.v4)(),
                                timestamp: Date.now(),
                                reason: "queue_full_on_reaper",
                                record: rec,
                            });
                            this.metrics.events.dlq++;
                            console.warn(`reaper: queue full; moved ${id} to DLQ`);
                        }
                        else {
                            console.warn(`reaper: re-queued timed-out ${id} (retries=${rec.retries})`);
                        }
                    }
                }
            }
        }, this.config.reaperIntervalMs);
    }
    calculateBackoff(retries) {
        const backoff = Math.min(this.config.baseBackoffMs * Math.pow(this.config.backoffMultiplier, retries), this.config.maxBackoffMs);
        return backoff;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.EventBroker = EventBroker;
//# sourceMappingURL=broker.js.map