/**
 * Core event broker logic
 */
import { BrokerConfig } from "./config";
import { Storage } from "./storage";
import { EventRecord, EnqueueResponse, ConsumeResponse, AcknowledgeResponse, BrokerStatus, Metrics, DLQEntry } from "./types";
export declare class EventBroker {
    private config;
    private storage;
    private eventHandler?;
    private queue;
    private inflight;
    private committed;
    private receiptToEventId;
    private workers;
    private isShuttingDown;
    private startTime;
    private metrics;
    private processingTimes;
    constructor(config: BrokerConfig, storage: Storage, eventHandler?: ((record: EventRecord) => Promise<void>) | undefined);
    initialize(): Promise<void>;
    enqueueEvent(payload: any, topic?: string): Promise<EnqueueResponse>;
    consumeEvents(maxEvents?: number, timeoutMs?: number, topic?: string): Promise<ConsumeResponse>;
    acknowledgeEvents(receiptIds: string[]): Promise<AcknowledgeResponse>;
    nackEvent(receiptId: string, requeue?: boolean): Promise<void>;
    getStatus(): BrokerStatus;
    getMetrics(): Metrics;
    getDLQEntries(limit?: number, offset?: number): Promise<DLQEntry[]>;
    getDLQCount(): Promise<number>;
    shutdown(): Promise<void>;
    private workerLoop;
    private startInflightReaper;
    private calculateBackoff;
    private sleep;
}
//# sourceMappingURL=broker.d.ts.map