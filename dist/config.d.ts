/**
 * Configuration management for the event broker
 */
export interface BrokerConfig {
    port: number;
    dataDir: string;
    queueMaxSize: number;
    workerCount: number;
    visibilityTimeoutMs: number;
    maxRetries: number;
    reaperIntervalMs: number;
    defaultPollTimeoutMs: number;
    maxPollTimeoutMs: number;
    maxEventsPerPoll: number;
    baseBackoffMs: number;
    maxBackoffMs: number;
    backoffMultiplier: number;
}
export declare const defaultConfig: BrokerConfig;
export declare function getConfig(): BrokerConfig;
//# sourceMappingURL=config.d.ts.map