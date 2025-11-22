/**
 * Custom error classes for the event broker
 */
export declare class BrokerError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(message: string, code: string, statusCode?: number);
}
export declare class QueueFullError extends BrokerError {
    constructor(message?: string);
}
export declare class EventNotFoundError extends BrokerError {
    constructor(eventId: string);
}
export declare class InvalidEventError extends BrokerError {
    constructor(message: string);
}
export declare class EventNotInflightError extends BrokerError {
    constructor(eventId: string);
}
export declare class StorageError extends BrokerError {
    readonly cause?: Error | undefined;
    constructor(message: string, cause?: Error);
}
//# sourceMappingURL=errors.d.ts.map