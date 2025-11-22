/**
 * HTTP Client for executing HTTP requests
 * Used by the event broker to process queued HTTP requests
 */
export interface HttpRequestSpec {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    callbackUrl?: string;
}
export interface HttpResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: any;
    duration: number;
}
export interface HttpRequestResult {
    success: boolean;
    request: HttpRequestSpec;
    response?: HttpResponse;
    error?: string;
    duration: number;
}
/**
 * Execute an HTTP request based on the specification
 */
export declare function executeHttpRequest(spec: HttpRequestSpec): Promise<HttpRequestResult>;
/**
 * Send callback to the specified URL with the request result
 */
export declare function sendCallback(callbackUrl: string, result: HttpRequestResult): Promise<void>;
//# sourceMappingURL=http-client.d.ts.map