"use strict";
/**
 * Event Broker Server
 *
 * A production-ready event broker with:
 * - WAL (Write-Ahead Log) for durability
 * - In-memory queue with backpressure
 * - Worker pool for event processing
 * - Visibility timeout and retry logic
 * - Dead Letter Queue (DLQ)
 * - RESTful API for event management
 * - Health checks and metrics
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const config_1 = require("./config");
const storage_1 = require("./storage");
const broker_1 = require("./broker");
const api_1 = require("./api");
function log(message, ...args) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, ...args);
}
async function startServer() {
    const config = (0, config_1.getConfig)();
    log("Starting Event Broker with config:", {
        port: config.port,
        workers: config.workerCount,
        queueMaxSize: config.queueMaxSize,
        visibilityTimeout: config.visibilityTimeoutMs,
        maxRetries: config.maxRetries,
    });
    // Initialize storage
    const storage = new storage_1.Storage(config);
    await storage.initialize();
    log("Storage initialized");
    // Optional: Custom event handler for automatic processing
    // Set to undefined to disable automatic processing and use manual consumption only
    // You can replace this with your own event processing logic
    const eventHandler = async (record) => {
        // Example: Process the event
        // In a real system, this might call an external API, write to a database, etc.
        console.log(`[Worker] Processing event ${record.id}:`, record.payload);
        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 50));
        // Example: Fail if payload has fail flag
        if (record.payload?.fail) {
            throw new Error("Event processing failed");
        }
    };
    // Initialize broker
    const broker = new broker_1.EventBroker(config, storage, eventHandler);
    await broker.initialize();
    log("Broker initialized");
    // Create Express app
    const app = (0, express_1.default)();
    // Middleware
    app.use(body_parser_1.default.json({ limit: "10mb" }));
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    // CORS support
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        if (req.method === "OPTIONS") {
            return res.sendStatus(200);
        }
        next();
    });
    // API routes
    const apiRouter = (0, api_1.createApiRouter)(broker);
    app.use("/api", apiRouter);
    // Root endpoint
    app.get("/", (req, res) => {
        res.json({
            name: "Event Broker",
            version: "2.0.0",
            description: "A production-ready event broker with WAL persistence, worker pools, and DLQ support",
            endpoints: {
                health: "GET /api/health",
                enqueue: "POST /api/events",
                consume: "GET /api/events/consume",
                acknowledge: "POST /api/events/acknowledge",
                nack: "POST /api/events/:receiptId/nack",
                status: "GET /api/status",
                metrics: "GET /api/metrics",
                dlq: "GET /api/dlq",
                reprocessDlq: "POST /api/dlq/:receiptId/reprocess",
            },
            docs: "See README.md for comprehensive API documentation",
            timestamp: Date.now(),
        });
    });
    // Start server
    const server = app.listen(config.port, () => {
        console.log(`\n🚀 Event Broker server listening on http://localhost:${config.port}`);
        console.log(`📊 Status: http://localhost:${config.port}/api/status`);
        console.log(`❤️  Health: http://localhost:${config.port}/api/health`);
        console.log(`📈 Metrics: http://localhost:${config.port}/api/metrics`);
        console.log(`\nPress Ctrl+C to stop\n`);
    });
    // Graceful shutdown
    let isShuttingDown = false;
    const shutdown = async (signal) => {
        if (isShuttingDown)
            return;
        isShuttingDown = true;
        log(`Received ${signal}, starting graceful shutdown...`);
        // Stop accepting new connections
        server.close(async () => {
            log("HTTP server closed");
            // Shutdown broker
            await broker.shutdown();
            log("Shutdown complete");
            process.exit(0);
        });
        // Force shutdown after timeout
        setTimeout(() => {
            console.error("Forced shutdown after timeout");
            process.exit(1);
        }, 30000);
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    // Handle uncaught errors
    process.on("uncaughtException", (error) => {
        log("Uncaught exception:", error);
        shutdown("uncaughtException");
    });
    process.on("unhandledRejection", (reason, promise) => {
        log("Unhandled rejection at:", promise, "reason:", reason);
    });
}
// Start the server
startServer().catch((err) => {
    console.error("Fatal error starting server:", err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map