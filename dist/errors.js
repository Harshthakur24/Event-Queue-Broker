"use strict";
/**
 * Custom error classes for the event broker
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageError = exports.EventNotInflightError = exports.InvalidEventError = exports.EventNotFoundError = exports.QueueFullError = exports.BrokerError = void 0;
class BrokerError extends Error {
    constructor(message, code, statusCode = 500) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.BrokerError = BrokerError;
class QueueFullError extends BrokerError {
    constructor(message = "Queue is full") {
        super(message, "QUEUE_FULL", 503);
    }
}
exports.QueueFullError = QueueFullError;
class EventNotFoundError extends BrokerError {
    constructor(eventId) {
        super(`Event not found: ${eventId}`, "EVENT_NOT_FOUND", 404);
    }
}
exports.EventNotFoundError = EventNotFoundError;
class InvalidEventError extends BrokerError {
    constructor(message) {
        super(message, "INVALID_EVENT", 400);
    }
}
exports.InvalidEventError = InvalidEventError;
class EventNotInflightError extends BrokerError {
    constructor(eventId) {
        super(`Event is not currently in-flight: ${eventId}`, "EVENT_NOT_INFLIGHT", 400);
    }
}
exports.EventNotInflightError = EventNotInflightError;
class StorageError extends BrokerError {
    constructor(message, cause) {
        super(message, "STORAGE_ERROR", 500);
        if (cause !== undefined) {
            this.cause = cause;
        }
    }
}
exports.StorageError = StorageError;
//# sourceMappingURL=errors.js.map