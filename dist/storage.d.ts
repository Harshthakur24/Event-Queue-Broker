/**
 * Storage layer for WAL, committed events, and DLQ
 */
import { BrokerConfig } from "./config";
import { EventRecord, DLQEntry } from "./types";
export declare class Storage {
    private config;
    private walPath;
    private committedPath;
    private dlqPath;
    constructor(config: BrokerConfig);
    initialize(): Promise<void>;
    appendWAL(record: EventRecord): Promise<void>;
    appendCommitted(eventId: string): Promise<void>;
    appendDLQ(entry: DLQEntry): Promise<void>;
    loadCommitted(): Promise<Set<string>>;
    restoreFromWAL(committed: Set<string>, onEvent: (record: EventRecord) => Promise<boolean>): Promise<number>;
    readDLQ(limit?: number, offset?: number): Promise<DLQEntry[]>;
    countDLQ(): Promise<number>;
    getPaths(): {
        wal: string;
        committed: string;
        dlq: string;
    };
}
//# sourceMappingURL=storage.d.ts.map