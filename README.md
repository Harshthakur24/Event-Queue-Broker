# 🚀 Event Broker — Simple Usage Guide

A lightweight HTTP-based event queue with persistent storage and worker-based processing. **The API is publicly accessible for everyone to use.**

## 📡 Quick Start

### Queue HTTP Requests (Request Proxy)

Queue HTTP requests that will be executed by workers. Perfect for making API calls on behalf of users.

```bash
# Simple GET request
curl -X POST http://195.35.45.251:5000/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/users",
    "method": "GET"
  }'

# POST request with body and callback
curl -X POST http://195.35.45.251:5000/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/data",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer token123",
      "Content-Type": "application/json"
    },
    "body": {"name": "John", "email": "john@example.com"},
    "callbackUrl": "https://your-webhook.com/results"
  }'
```

**Request Body Options:**
- `url` (required): The HTTP endpoint URL to call
- `method` (optional): HTTP method - GET, POST, PUT, DELETE, etc. (default: GET)
- `headers` (optional): Request headers as key-value pairs
- `body` (optional): Request body (object or string) - automatically JSON stringified if object
- `timeout` (optional): Request timeout in milliseconds (default: 30000)
- `callbackUrl` (optional): URL to send the response result to (POST request)

**Response:**
```json
{
  "id": "uuid",
  "timestamp": 1234567890,
  "status": "queued",
  "message": "HTTP request queued and will be executed by workers"
}
```

### Enqueue Regular Events

```bash
curl -X POST http://195.35.45.251:5000/api/events \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World", "data": "anything"}'
```

### Consume Events

```bash
curl "http://195.35.45.251:5000/api/events/consume?maxEvents=10&timeoutMs=5000"
```

### Check Health

```bash
curl http://195.35.45.251:5000/api/health
```

## 🔗 API Endpoints

- `POST /api/requests` - Queue HTTP requests to be executed by workers
- `POST /api/events` - Enqueue regular events
- `GET /api/events/consume` - Consume/poll events
- `POST /api/events/acknowledge` - Acknowledge processed events
- `GET /api/health` - Health check
- `GET /api/status` - Queue status and metrics
- `GET /api/metrics` - Performance metrics

## 📝 Examples

**Get users from an API:**
```bash
curl -X POST http://195.35.45.251:5000/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://jsonplaceholder.typicode.com/users",
    "method": "GET",
    "callbackUrl": "https://your-webhook.com/users-result"
  }'
```

**Make a POST request with authentication:**
```bash
curl -X POST http://195.35.45.251:5000/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/users",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer your-token-here",
      "Content-Type": "application/json"
    },
    "body": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }'
```

**Note:** Requests are processed asynchronously by workers. If you provide a `callbackUrl`, the result will be sent there via POST when the request completes.
