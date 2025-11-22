"use strict";
/**
 * Async queue implementation with backpressure and notifications
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncQueue = void 0;
const events_1 = require("events");
class AsyncQueue {
    constructor(maxSize = 1000) {
        this.items = [];
        this.emitter = new events_1.EventEmitter();
        this.maxSize = maxSize;
    }
    size() {
        return this.items.length;
    }
    isEmpty() {
        return this.items.length === 0;
    }
    isFull() {
        return this.items.length >= this.maxSize;
    }
    push(item) {
        if (this.isFull())
            return false;
        this.items.push(item);
        this.emitter.emit("push");
        return true;
    }
    async pop(timeoutMs = 0) {
        // If item available, return immediately
        if (this.items.length > 0) {
            const item = this.items.shift();
            this.notifySpace();
            return item;
        }
        // Wait for item with optional timeout
        if (timeoutMs <= 0) {
            // Wait indefinitely
            await this.waitForItem();
            const item = this.items.shift();
            this.notifySpace();
            return item;
        }
        // Wait with timeout
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(null), timeoutMs);
        });
        const itemPromise = this.waitForItem().then(() => {
            if (this.items.length > 0) {
                const item = this.items.shift();
                this.notifySpace();
                return item;
            }
            return null;
        });
        const result = await Promise.race([itemPromise, timeoutPromise]);
        return result;
    }
    peek() {
        return this.items[0];
    }
    async pushOrReject(item, timeoutMs = 0) {
        if (this.push(item))
            return;
        if (timeoutMs <= 0) {
            throw new Error("Queue full");
        }
        // Wait until space available or timeout
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            await once(this.emitter, "space");
            if (this.push(item))
                return;
        }
        throw new Error("Queue full (timeout)");
    }
    notifySpace() {
        this.emitter.emit("space");
    }
    drain() {
        const remaining = this.items.slice();
        this.items = [];
        return remaining;
    }
    clear() {
        this.items = [];
    }
    // Prepend item to front of queue (useful for topic filtering)
    unshift(item) {
        if (this.isFull())
            return false;
        this.items.unshift(item);
        this.emitter.emit("push");
        return true;
    }
    async waitForItem() {
        if (this.items.length > 0)
            return;
        await once(this.emitter, "push");
    }
}
exports.AsyncQueue = AsyncQueue;
// Helper to wait for an EventEmitter event once as a Promise
function once(em, event) {
    return new Promise((resolve) => {
        const handler = () => {
            em.removeListener(event, handler);
            resolve();
        };
        em.on(event, handler);
    });
}
//# sourceMappingURL=queue.js.map