"use strict";
/**
 * Storage layer for WAL, committed events, and DLQ
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Storage = void 0;
const fs_1 = require("fs");
const fs_2 = __importDefault(require("fs"));
const readline_1 = __importDefault(require("readline"));
const path_1 = __importDefault(require("path"));
const errors_1 = require("./errors");
class Storage {
    constructor(config) {
        this.config = config;
        const dataDir = path_1.default.resolve(process.cwd(), config.dataDir);
        this.walPath = path_1.default.join(dataDir, "events.log");
        this.committedPath = path_1.default.join(dataDir, "committed.log");
        this.dlqPath = path_1.default.join(dataDir, "dlq.log");
    }
    async initialize() {
        try {
            const dataDir = path_1.default.dirname(this.walPath);
            await fs_1.promises.mkdir(dataDir, { recursive: true });
            // Ensure files exist
            await Promise.all([
                fs_1.promises.open(this.walPath, "a").then((f) => f.close()),
                fs_1.promises.open(this.committedPath, "a").then((f) => f.close()),
                fs_1.promises.open(this.dlqPath, "a").then((f) => f.close()),
            ]);
        }
        catch (error) {
            throw new errors_1.StorageError("Failed to initialize storage", error);
        }
    }
    async appendWAL(record) {
        try {
            const line = JSON.stringify(record);
            await fs_1.promises.appendFile(this.walPath, line + "\n", { encoding: "utf8" });
        }
        catch (error) {
            throw new errors_1.StorageError("Failed to append to WAL", error);
        }
    }
    async appendCommitted(eventId) {
        try {
            await fs_1.promises.appendFile(this.committedPath, eventId + "\n", { encoding: "utf8" });
        }
        catch (error) {
            throw new errors_1.StorageError("Failed to append committed event", error);
        }
    }
    async appendDLQ(entry) {
        try {
            const line = JSON.stringify(entry);
            await fs_1.promises.appendFile(this.dlqPath, line + "\n", { encoding: "utf8" });
        }
        catch (error) {
            throw new errors_1.StorageError("Failed to append to DLQ", error);
        }
    }
    async loadCommitted() {
        const committed = new Set();
        try {
            if (!fs_2.default.existsSync(this.committedPath)) {
                return committed;
            }
            const stream = fs_2.default.createReadStream(this.committedPath, { encoding: "utf8" });
            const rl = readline_1.default.createInterface({ input: stream, crlfDelay: Infinity });
            for await (const line of rl) {
                const id = line.trim();
                if (id) {
                    committed.add(id);
                }
            }
        }
        catch (error) {
            console.warn("Failed to load committed events:", error);
        }
        return committed;
    }
    async restoreFromWAL(committed, onEvent) {
        let count = 0;
        try {
            if (!fs_2.default.existsSync(this.walPath)) {
                return 0;
            }
            const stream = fs_2.default.createReadStream(this.walPath, { encoding: "utf8" });
            const rl = readline_1.default.createInterface({ input: stream, crlfDelay: Infinity });
            for await (const line of rl) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                try {
                    const rec = JSON.parse(trimmed);
                    if (committed.has(rec.id))
                        continue;
                    const handled = await onEvent(rec);
                    if (handled) {
                        count++;
                    }
                }
                catch (err) {
                    console.warn("WAL parse error, skipping line:", err);
                }
            }
        }
        catch (error) {
            console.warn("Failed to restore from WAL:", error);
        }
        return count;
    }
    async readDLQ(limit = 100, offset = 0) {
        const entries = [];
        try {
            if (!fs_2.default.existsSync(this.dlqPath)) {
                return entries;
            }
            const stream = fs_2.default.createReadStream(this.dlqPath, { encoding: "utf8" });
            const rl = readline_1.default.createInterface({ input: stream, crlfDelay: Infinity });
            let currentOffset = 0;
            for await (const line of rl) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                if (currentOffset < offset) {
                    currentOffset++;
                    continue;
                }
                if (entries.length >= limit)
                    break;
                try {
                    const entry = JSON.parse(trimmed);
                    entries.push(entry);
                }
                catch (err) {
                    console.warn("DLQ parse error, skipping line:", err);
                }
            }
        }
        catch (error) {
            console.warn("Failed to read DLQ:", error);
        }
        return entries;
    }
    async countDLQ() {
        try {
            if (!fs_2.default.existsSync(this.dlqPath)) {
                return 0;
            }
            const stream = fs_2.default.createReadStream(this.dlqPath, { encoding: "utf8" });
            const rl = readline_1.default.createInterface({ input: stream, crlfDelay: Infinity });
            let count = 0;
            for await (const line of rl) {
                if (line.trim())
                    count++;
            }
            return count;
        }
        catch (error) {
            console.warn("Failed to count DLQ:", error);
            return 0;
        }
    }
    getPaths() {
        return {
            wal: this.walPath,
            committed: this.committedPath,
            dlq: this.dlqPath,
        };
    }
}
exports.Storage = Storage;
//# sourceMappingURL=storage.js.map