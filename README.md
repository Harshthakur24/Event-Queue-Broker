# Event Broker

A production-ready, single-process event broker with persistent storage, worker pools, retry logic, and comprehensive REST API.

## Features

- **🔄 Persistent Storage**: Write-Ahead Log (WAL) for event durability
- **⚡ High Performance**: In-memory queue with configurable worker pools
- **🛡️ Reliability**: Automatic retries with exponential backoff
- **👁️ Visibility Timeout**: Prevents message loss during processing
- **💀 Dead Letter Queue**: Captures failed events after max retries
- **📊 Monitoring**: Health checks, status endpoints, and metrics
- **🔌 RESTful API**: Comprehensive HTTP API for all operations
- **🎯 Topic Support**: Optional topic/queue filtering
- **🔄 Graceful Shutdown**: Clean shutdown with inflight event handling

## Quick Start

### Option 1: Docker (Recommended) 🐳

The easiest way to run the event broker is using Docker:

```bash
# Production mode
docker-compose up -d

# Development mode (with hot reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or use npm scripts
npm run docker:up        # Start in production
npm run docker:dev       # Start in development
npm run docker:down      # Stop containers
npm run docker:logs      # View logs
```

**Learn Docker:** See [DOCKER_GUIDE.md](./DOCKER_GUIDE.md) for a comprehensive Docker tutorial!

### Option 2: Local Development

#### Installation

```bash
npm install
```

#### Development

```bash
npm run dev
```

#### Production

```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or the port specified by `PORT` environment variable).

### Docker Commands Reference

```bash
# Build Docker image
npm run docker:build

# Run container manually
npm run docker:run

# Start with Docker Compose
npm run docker:up

# Start in development mode
npm run docker:dev

# Stop containers
npm run docker:down

# View logs
npm run docker:logs

# Restart containers
npm run docker:restart
```

## API Documentation

### Base URL
All API endpoints are prefixed with `/api`

### Endpoints

#### Health Check
```http
GET /api/health
```
Returns the health status of the broker.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1234567890
}
```

#### Enqueue Event
```http
POST /api/events
Content-Type: application/json

{
  "key": "value",
  "data": "anything"
}
```

**Query Parameters:**
- `topic` (optional): Topic/queue name for filtering

**Response:**
```json
{
  "id": "uuid",
  "timestamp": 1234567890,
  "status": "queued"
}
```

#### Consume Events
```http
GET /api/events/consume?maxEvents=10&timeoutMs=5000&topic=my-topic
```

**Query Parameters:**
- `maxEvents` (default: 10, max: 100): Maximum number of events to return
- `timeoutMs` (default: 5000, max: 30000): Polling timeout in milliseconds
- `topic` (optional): Filter events by topic

**Response:**
```json
{
  "events": [
    {
      "id": "uuid",
      "payload": { "key": "value" },
      "timestamp": 1234567890,
      "retries": 0,
      "receiptId": "receipt-uuid"
    }
  ],
  "count": 1
}
```

#### Acknowledge Events
```http
POST /api/events/acknowledge
Content-Type: application/json

{
  "receiptIds": ["receipt-uuid-1", "receipt-uuid-2"]
}
```

**Response:**
```json
{
  "acknowledged": ["receipt-uuid-1"],
  "failed": [
    {
      "receiptId": "receipt-uuid-2",
      "reason": "Invalid receipt ID"
    }
  ]
}
```

#### Negative Acknowledge (NACK)
```http
POST /api/events/:receiptId/nack?requeue=true
```

**Query Parameters:**
- `requeue` (default: true): Whether to requeue the event

#### Get Status
```http
GET /api/status
```

**Response:**
```json
{
  "queue": {
    "size": 100,
    "maxSize": 1000,
    "utilizationPercent": 10
  },
  "inflight": {
    "count": 5,
    "events": [...]
  },
  "committed": {
    "count": 1000
  },
  "dlq": {
    "count": 10
  },
  "workers": {
    "active": 4,
    "total": 4
  },
  "uptime": 3600000
}
```

#### Get Metrics
```http
GET /api/metrics
```

**Response:**
```json
{
  "events": {
    "enqueued": 1000,
    "consumed": 950,
    "acknowledged": 900,
    "failed": 50,
    "dlq": 10
  },
  "latency": {
    "avgProcessingMs": 150,
    "maxProcessingMs": 500
  },
  "timestamps": {
    "startTime": 1234567890,
    "lastEventTime": 1234567999
  }
}
```

#### Get DLQ Entries
```http
GET /api/dlq?limit=100&offset=0
```

**Query Parameters:**
- `limit` (default: 100, max: 1000): Maximum entries to return
- `offset` (default: 0): Pagination offset

#### Reprocess DLQ Entry
```http
POST /api/dlq/:receiptId/reprocess
```

Moves a DLQ entry back to the main queue for reprocessing.

## Configuration

Configure the broker using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP server port |
| `DATA_DIR` | data | Directory for WAL and logs |
| `QUEUE_MAX_SIZE` | 1000 | Maximum queue size |
| `WORKER_COUNT` | 4 | Number of worker threads |
| `VISIBILITY_TIMEOUT_MS` | 10000 | Visibility timeout (10s) |
| `MAX_RETRIES` | 5 | Maximum retry attempts |
| `REAPER_INTERVAL_MS` | 1000 | Reaper check interval |
| `DEFAULT_POLL_TIMEOUT_MS` | 5000 | Default poll timeout |
| `MAX_POLL_TIMEOUT_MS` | 30000 | Maximum poll timeout |
| `MAX_EVENTS_PER_POLL` | 10 | Maximum events per poll |
| `BASE_BACKOFF_MS` | 1000 | Base backoff time |
| `MAX_BACKOFF_MS` | 30000 | Maximum backoff time |
| `BACKOFF_MULTIPLIER` | 2 | Exponential backoff multiplier |

## Architecture

### Components

- **Storage Layer** (`src/storage.ts`): Handles WAL, committed events, and DLQ persistence
- **Queue** (`src/queue.ts`): Async queue with backpressure and notifications
- **Broker** (`src/broker.ts`): Core event processing logic with workers and reaper
- **API** (`src/api.ts`): RESTful HTTP API endpoints
- **Server** (`src/server.ts`): Express server and initialization

### Data Flow

1. **Enqueue**: Event → WAL → In-memory queue
2. **Consume**: Worker pops from queue → Marks inflight → Returns to consumer
3. **Acknowledge**: Consumer confirms → Writes to committed log → Removes from inflight
4. **Failure**: Retry with backoff → After max retries → Move to DLQ
5. **Timeout**: Reaper detects expired inflight → Requeue or move to DLQ

### Persistence

- `data/events.log`: Write-Ahead Log (WAL) of all events
- `data/committed.log`: List of committed event IDs
- `data/dlq.log`: Dead Letter Queue entries

## Usage Examples

### Enqueue an Event

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World", "priority": "high"}'
```

### Enqueue with Topic

```bash
curl -X POST "http://localhost:3000/api/events?topic=notifications" \
  -H "Content-Type: application/json" \
  -d '{"type": "alert", "message": "System update"}'
```

### Consume Events

```bash
curl "http://localhost:3000/api/events/consume?maxEvents=5&timeoutMs=5000"
```

### Consume Events by Topic

```bash
curl "http://localhost:3000/api/events/consume?maxEvents=5&timeoutMs=5000&topic=notifications"
```

### Acknowledge Events

```bash
curl -X POST http://localhost:3000/api/events/acknowledge \
  -H "Content-Type: application/json" \
  -d '{"receiptIds": ["receipt-uuid-1", "receipt-uuid-2"]}'
```

### Negative Acknowledge (NACK)

```bash
curl -X POST "http://localhost:3000/api/events/receipt-uuid/nack?requeue=true"
```

### Check Status

```bash
curl http://localhost:3000/api/status
```

### Get Metrics

```bash
curl http://localhost:3000/api/metrics
```

### View DLQ

```bash
curl "http://localhost:3000/api/dlq?limit=100&offset=0"
```

### Reprocess DLQ Entry

```bash
curl -X POST http://localhost:3000/api/dlq/receipt-uuid/reprocess
```

### Test Scripts

Example test scripts are provided in the `examples/` directory:
- `examples/test-api.ps1` - PowerShell script for Windows
- `examples/test-api.sh` - Bash script for Linux/Mac

## Custom Event Handler

You can customize event processing by modifying the `eventHandler` in `src/server.ts`:

```typescript
const eventHandler = async (record: EventRecord): Promise<void> => {
  // Your custom processing logic
  await processEvent(record.payload);
};
```

Set `eventHandler` to `undefined` to disable automatic processing and use manual consumption only via the API.

## Production Considerations

- **Persistence**: Events are persisted to disk via WAL
- **Scalability**: Single-process design; for horizontal scaling, consider external message brokers
- **Monitoring**: Use `/api/status` and `/api/metrics` for monitoring
- **DLQ Management**: Regularly monitor and reprocess DLQ entries
- **Resource Limits**: Configure `QUEUE_MAX_SIZE` based on available memory
- **Graceful Shutdown**: Handles SIGINT/SIGTERM with inflight event completion

## 🚀 Production Deployment

### Current Status
The broker is **mostly production-ready** but see [PRODUCTION_READY_CHECKLIST.md](./PRODUCTION_READY_CHECKLIST.md) for recommended improvements.

### Quick Deploy
```bash
# Deploy with Docker Compose
docker-compose up -d

# Or see full deployment guide
# DEPLOYMENT.md
```

See:
- **[PRODUCTION_READY_CHECKLIST.md](./PRODUCTION_READY_CHECKLIST.md)** - Production readiness assessment
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Comprehensive deployment guide

## License

ISC
#   E v e n t - Q u e u e - B r o k e r  
 