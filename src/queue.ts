/**
 * Async queue implementation with backpressure and notifications
 */

import { EventEmitter } from "events";

export class AsyncQueue<T> {
  private items: T[] = [];
  private emitter = new EventEmitter();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  isFull(): boolean {
    return this.items.length >= this.maxSize;
  }

  push(item: T): boolean {
    if (this.isFull()) return false;
    this.items.push(item);
    this.emitter.emit("push");
    return true;
  }

  async pop(timeoutMs = 0): Promise<T | null> {
    // If item available, return immediately
    if (this.items.length > 0) {
      const item = this.items.shift()!;
      this.notifySpace();
      return item;
    }

    // Wait for item with optional timeout
    if (timeoutMs <= 0) {
      // Wait indefinitely
      await this.waitForItem();
      const item = this.items.shift()!;
      this.notifySpace();
      return item;
    }

    // Wait with timeout
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });

    const itemPromise = this.waitForItem().then(() => {
      if (this.items.length > 0) {
        const item = this.items.shift()!;
        this.notifySpace();
        return item;
      }
      return null;
    });

    const result = await Promise.race([itemPromise, timeoutPromise]);
    return result;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  async pushOrReject(item: T, timeoutMs = 0): Promise<void> {
    if (this.push(item)) return;
    
    if (timeoutMs <= 0) {
      throw new Error("Queue full");
    }

    // Wait until space available or timeout
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await once(this.emitter, "space");
      if (this.push(item)) return;
    }
    
    throw new Error("Queue full (timeout)");
  }

  notifySpace(): void {
    this.emitter.emit("space");
  }

  drain(): T[] {
    const remaining = this.items.slice();
    this.items = [];
    return remaining;
  }

  clear(): void {
    this.items = [];
  }

  // Prepend item to front of queue (useful for topic filtering)
  unshift(item: T): boolean {
    if (this.isFull()) return false;
    this.items.unshift(item);
    this.emitter.emit("push");
    return true;
  }

  private async waitForItem(): Promise<void> {
    if (this.items.length > 0) return;
    await once(this.emitter, "push");
  }
}

// Helper to wait for an EventEmitter event once as a Promise
function once(em: EventEmitter, event: string): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      em.removeListener(event, handler);
      resolve();
    };
    em.on(event, handler);
  });
}
