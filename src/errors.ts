/**
 * Custom error classes for the event broker
 */

export class BrokerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class QueueFullError extends BrokerError {
  constructor(message = "Queue is full") {
    super(message, "QUEUE_FULL", 503);
  }
}

export class EventNotFoundError extends BrokerError {
  constructor(eventId: string) {
    super(`Event not found: ${eventId}`, "EVENT_NOT_FOUND", 404);
  }
}

export class InvalidEventError extends BrokerError {
  constructor(message: string) {
    super(message, "INVALID_EVENT", 400);
  }
}

export class EventNotInflightError extends BrokerError {
  constructor(eventId: string) {
    super(`Event is not currently in-flight: ${eventId}`, "EVENT_NOT_INFLIGHT", 400);
  }
}

export class StorageError extends BrokerError {
  public readonly cause?: Error | undefined;
  
  constructor(message: string, cause?: Error) {
    super(message, "STORAGE_ERROR", 500);
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}
