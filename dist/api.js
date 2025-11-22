"use strict";
/**
 * HTTP API routes for the event broker
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRouter = createApiRouter;
const express_1 = __importDefault(require("express"));
const errors_1 = require("./errors");
function createApiRouter(broker) {
    const router = express_1.default.Router();
    // Request logging middleware
    router.use((req, res, next) => {
        const start = Date.now();
        res.on("finish", () => {
            const duration = Date.now() - start;
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        });
        next();
    });
    // Health check
    router.get("/health", async (req, res) => {
        res.json({
            status: "healthy",
            timestamp: Date.now(),
        });
    });
    // Enqueue event
    router.post("/events", async (req, res, next) => {
        try {
            const payload = req.body;
            // Validate payload
            if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
                return res.status(400).json({
                    error: "Payload must be a valid object",
                    code: "INVALID_PAYLOAD",
                });
            }
            const topic = req.query.topic;
            const result = await broker.enqueueEvent(payload, topic);
            res.status(202).json(result);
        }
        catch (error) {
            next(error);
        }
    });
    // Consume/poll events
    router.get("/events/consume", async (req, res, next) => {
        try {
            const maxEvents = Math.min(Math.max(1, parseInt(req.query.maxEvents) || 10), 100);
            const timeoutMs = Math.min(Math.max(0, parseInt(req.query.timeoutMs) || 5000), 30000);
            const topic = req.query.topic;
            const result = await broker.consumeEvents(maxEvents, timeoutMs, topic);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    // Acknowledge events
    router.post("/events/acknowledge", async (req, res, next) => {
        try {
            const body = req.body;
            if (!body.receiptIds || !Array.isArray(body.receiptIds)) {
                return res.status(400).json({
                    error: "Invalid request: receiptIds must be an array",
                    code: "INVALID_REQUEST",
                    timestamp: Date.now(),
                });
            }
            const result = await broker.acknowledgeEvents(body.receiptIds);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    // Negative acknowledge (nack) event
    router.post("/events/:receiptId/nack", async (req, res, next) => {
        try {
            const { receiptId } = req.params;
            const requeue = req.query.requeue !== "false"; // Default true
            await broker.nackEvent(receiptId, requeue);
            res.json({ success: true, receiptId });
        }
        catch (error) {
            next(error);
        }
    });
    // Get broker status
    router.get("/status", async (req, res, next) => {
        try {
            const status = broker.getStatus();
            const dlqCount = await broker.getDLQCount();
            status.dlq.count = dlqCount;
            res.json(status);
        }
        catch (error) {
            next(error);
        }
    });
    // Get metrics
    router.get("/metrics", async (req, res, next) => {
        try {
            const metrics = broker.getMetrics();
            res.json(metrics);
        }
        catch (error) {
            next(error);
        }
    });
    // Get DLQ entries
    router.get("/dlq", async (req, res, next) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
            const offset = parseInt(req.query.offset) || 0;
            const entries = await broker.getDLQEntries(limit, offset);
            const total = await broker.getDLQCount();
            res.json({
                entries,
                count: entries.length,
                total,
                limit,
                offset,
            });
        }
        catch (error) {
            next(error);
        }
    });
    // Reprocess DLQ entry (move back to queue)
    router.post("/dlq/:receiptId/reprocess", async (req, res, next) => {
        try {
            const { receiptId } = req.params;
            const dlqEntries = await broker.getDLQEntries(1000, 0);
            const entry = dlqEntries.find((e) => e.receiptId === receiptId);
            if (!entry) {
                return res.status(404).json({
                    error: "DLQ entry not found",
                    code: "DLQ_ENTRY_NOT_FOUND",
                    timestamp: Date.now(),
                });
            }
            // Re-enqueue the event
            const result = await broker.enqueueEvent(entry.record.payload, entry.record.topic);
            res.json({
                success: true,
                message: "Event reprocessed",
                eventId: result.id,
            });
        }
        catch (error) {
            next(error);
        }
    });
    // Error handling middleware
    router.use((error, req, res, next) => {
        if (error instanceof errors_1.BrokerError) {
            return res.status(error.statusCode).json({
                error: error.message,
                code: error.code,
                timestamp: Date.now(),
            });
        }
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] Unhandled error:`, error);
        res.status(500).json({
            error: "Internal server error",
            code: "INTERNAL_ERROR",
            timestamp: Date.now(),
        });
    });
    return router;
}
//# sourceMappingURL=api.js.map