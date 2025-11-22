/**
 * Storage layer for WAL, committed events, and DLQ
 */

import { promises as fsp } from "fs";
import fs from "fs";
import readline from "readline";
import path from "path";
import { BrokerConfig } from "./config";
import { EventRecord, DLQEntry } from "./types";
import { StorageError } from "./errors";

export class Storage {
  private walPath: string;
  private committedPath: string;
  private dlqPath: string;

  constructor(private config: BrokerConfig) {
    const dataDir = path.resolve(process.cwd(), config.dataDir);
    this.walPath = path.join(dataDir, "events.log");
    this.committedPath = path.join(dataDir, "committed.log");
    this.dlqPath = path.join(dataDir, "dlq.log");
  }

  async initialize(): Promise<void> {
    try {
      const dataDir = path.dirname(this.walPath);
      await fsp.mkdir(dataDir, { recursive: true });
      
      // Ensure files exist
      await Promise.all([
        fsp.open(this.walPath, "a").then((f) => f.close()),
        fsp.open(this.committedPath, "a").then((f) => f.close()),
        fsp.open(this.dlqPath, "a").then((f) => f.close()),
      ]);
    } catch (error) {
      throw new StorageError("Failed to initialize storage", error as Error);
    }
  }

  async appendWAL(record: EventRecord): Promise<void> {
    try {
      const line = JSON.stringify(record);
      await fsp.appendFile(this.walPath, line + "\n", { encoding: "utf8" });
    } catch (error) {
      throw new StorageError("Failed to append to WAL", error as Error);
    }
  }

  async appendCommitted(eventId: string): Promise<void> {
    try {
      await fsp.appendFile(this.committedPath, eventId + "\n", { encoding: "utf8" });
    } catch (error) {
      throw new StorageError("Failed to append committed event", error as Error);
    }
  }

  async appendDLQ(entry: DLQEntry): Promise<void> {
    try {
      const line = JSON.stringify(entry);
      await fsp.appendFile(this.dlqPath, line + "\n", { encoding: "utf8" });
    } catch (error) {
      throw new StorageError("Failed to append to DLQ", error as Error);
    }
  }

  async loadCommitted(): Promise<Set<string>> {
    const committed = new Set<string>();
    
    try {
      if (!fs.existsSync(this.committedPath)) {
        return committed;
      }

      const stream = fs.createReadStream(this.committedPath, { encoding: "utf8" });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      
      for await (const line of rl) {
        const id = line.trim();
        if (id) {
          committed.add(id);
        }
      }
    } catch (error) {
      console.warn("Failed to load committed events:", error);
    }
    
    return committed;
  }

  async restoreFromWAL(
    committed: Set<string>,
    onEvent: (record: EventRecord) => Promise<boolean>
  ): Promise<number> {
    let count = 0;
    
    try {
      if (!fs.existsSync(this.walPath)) {
        return 0;
      }

      const stream = fs.createReadStream(this.walPath, { encoding: "utf8" });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      
      for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        try {
          const rec = JSON.parse(trimmed) as EventRecord;
          if (committed.has(rec.id)) continue;
          
          const handled = await onEvent(rec);
          if (handled) {
            count++;
          }
        } catch (err) {
          console.warn("WAL parse error, skipping line:", err);
        }
      }
    } catch (error) {
      console.warn("Failed to restore from WAL:", error);
    }
    
    return count;
  }

  async readDLQ(limit = 100, offset = 0): Promise<DLQEntry[]> {
    const entries: DLQEntry[] = [];
    
    try {
      if (!fs.existsSync(this.dlqPath)) {
        return entries;
      }

      const stream = fs.createReadStream(this.dlqPath, { encoding: "utf8" });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      
      let currentOffset = 0;
      for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        if (currentOffset < offset) {
          currentOffset++;
          continue;
        }
        
        if (entries.length >= limit) break;
        
        try {
          const entry = JSON.parse(trimmed) as DLQEntry;
          entries.push(entry);
        } catch (err) {
          console.warn("DLQ parse error, skipping line:", err);
        }
      }
    } catch (error) {
      console.warn("Failed to read DLQ:", error);
    }
    
    return entries;
  }

  async countDLQ(): Promise<number> {
    try {
      if (!fs.existsSync(this.dlqPath)) {
        return 0;
      }

      const stream = fs.createReadStream(this.dlqPath, { encoding: "utf8" });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      
      let count = 0;
      for await (const line of rl) {
        if (line.trim()) count++;
      }
      return count;
    } catch (error) {
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
