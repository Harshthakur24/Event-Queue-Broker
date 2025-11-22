/**
 * Async queue implementation with backpressure and notifications
 */
export declare class AsyncQueue<T> {
    private items;
    private emitter;
    private maxSize;
    constructor(maxSize?: number);
    size(): number;
    isEmpty(): boolean;
    isFull(): boolean;
    push(item: T): boolean;
    pop(timeoutMs?: number): Promise<T | null>;
    peek(): T | undefined;
    pushOrReject(item: T, timeoutMs?: number): Promise<void>;
    notifySpace(): void;
    drain(): T[];
    clear(): void;
    unshift(item: T): boolean;
    private waitForItem;
}
//# sourceMappingURL=queue.d.ts.map