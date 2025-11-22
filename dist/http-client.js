"use strict";
/**
 * HTTP Client for executing HTTP requests
 * Used by the event broker to process queued HTTP requests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeHttpRequest = executeHttpRequest;
exports.sendCallback = sendCallback;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const url_1 = require("url");
/**
 * Execute an HTTP request based on the specification
 */
async function executeHttpRequest(spec) {
    const startTime = Date.now();
    try {
        // Validate URL
        if (!spec.url || typeof spec.url !== "string") {
            throw new Error("URL is required and must be a string");
        }
        // Parse URL
        let parsedUrl;
        try {
            parsedUrl = new url_1.URL(spec.url);
        }
        catch (error) {
            throw new Error(`Invalid URL: ${spec.url}`);
        }
        // Determine protocol (http or https)
        const isHttps = parsedUrl.protocol === "https:";
        const client = isHttps ? https_1.default : http_1.default;
        // Set default method
        const method = (spec.method || "GET").toUpperCase();
        // Prepare headers
        const headers = {
            "User-Agent": "EventBroker/2.0.0",
            ...(spec.headers || {}),
        };
        // Prepare body
        let requestBody;
        if (spec.body !== undefined) {
            if (typeof spec.body === "string") {
                requestBody = spec.body;
            }
            else if (Buffer.isBuffer(spec.body)) {
                requestBody = spec.body;
            }
            else {
                // JSON stringify objects
                requestBody = JSON.stringify(spec.body);
                if (!headers["Content-Type"]) {
                    headers["Content-Type"] = "application/json";
                }
            }
            // Set Content-Length if not provided
            if (requestBody && !headers["Content-Length"]) {
                headers["Content-Length"] = Buffer.byteLength(requestBody).toString();
            }
        }
        // Set timeout (default 30 seconds)
        const timeout = spec.timeout || 30000;
        // Execute request
        const response = await new Promise((resolve, reject) => {
            const options = {
                method,
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                headers,
                timeout,
            };
            const req = client.request(options, (res) => {
                const responseHeaders = {};
                // Collect response headers
                Object.keys(res.headers).forEach((key) => {
                    const value = res.headers[key];
                    if (value) {
                        responseHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
                    }
                });
                // Collect response body
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    const bodyBuffer = Buffer.concat(chunks);
                    const duration = Date.now() - startTime;
                    // Try to parse as JSON, otherwise return as string
                    let body;
                    const contentType = responseHeaders["content-type"] || "";
                    if (contentType.includes("application/json")) {
                        try {
                            body = JSON.parse(bodyBuffer.toString("utf-8"));
                        }
                        catch {
                            body = bodyBuffer.toString("utf-8");
                        }
                    }
                    else {
                        body = bodyBuffer.toString("utf-8");
                    }
                    resolve({
                        statusCode: res.statusCode || 500,
                        headers: responseHeaders,
                        body,
                        duration,
                    });
                });
            });
            req.on("error", (error) => {
                reject(error);
            });
            req.on("timeout", () => {
                req.destroy();
                reject(new Error(`Request timeout after ${timeout}ms`));
            });
            // Write body if present
            if (requestBody) {
                req.write(requestBody);
            }
            req.end();
        });
        const duration = Date.now() - startTime;
        return {
            success: response.statusCode >= 200 && response.statusCode < 300,
            request: spec,
            response,
            duration,
        };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        return {
            success: false,
            request: spec,
            error: error.message || String(error),
            duration,
        };
    }
}
/**
 * Send callback to the specified URL with the request result
 */
async function sendCallback(callbackUrl, result) {
    try {
        const callbackSpec = {
            url: callbackUrl,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: result,
            timeout: 10000, // 10 second timeout for callbacks
        };
        await executeHttpRequest(callbackSpec);
    }
    catch (error) {
        console.error(`[HttpClient] Failed to send callback to ${callbackUrl}:`, error);
    }
}
//# sourceMappingURL=http-client.js.map