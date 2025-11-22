# 🚀 Production Deployment Guide

This guide will help you deploy the Event Broker to production.

## ✅ Pre-Deployment Checklist

### Core Functionality
- ✅ Docker multi-stage build for optimized image size
- ✅ Health checks configured
- ✅ Graceful shutdown implemented
- ✅ Error handling with custom error classes
- ✅ Persistent storage via volumes
- ✅ Environment variable configuration
- ✅ Non-root user in container (security)
- ✅ Basic logging with timestamps

### Recommended Improvements for Production

#### 🔒 Security (High Priority)

1. **CORS Configuration**
   - Currently allows all origins (`*`)
   - **Action**: Configure allowed origins via environment variable
   - **Risk**: Low for internal services, Medium-High for public APIs

2. **Rate Limiting**
   - Not implemented
   - **Action**: Add rate limiting middleware
   - **Risk**: Medium (DDoS protection)

3. **Security Headers**
   - Not implemented
   - **Action**: Add helmet.js for security headers
   - **Risk**: Low-Medium (XSS, clickjacking protection)

4. **Input Validation**
   - Basic validation present
   - **Action**: Add stricter validation/sanitization
   - **Risk**: Medium (injection attacks)

#### 📊 Monitoring & Observability (Medium Priority)

1. **Structured Logging**
   - Currently using console.log
   - **Action**: Add structured logging (Winston, Pino, etc.)
   - **Benefit**: Better log aggregation and analysis

2. **Metrics Export**
   - Basic metrics endpoint exists
   - **Action**: Add Prometheus metrics or similar
   - **Benefit**: Integration with monitoring systems

3. **Distributed Tracing**
   - Not implemented
   - **Action**: Add OpenTelemetry
   - **Benefit**: Request tracing across services

4. **Alerting**
   - Not configured
   - **Action**: Set up alerts for:
     - High DLQ count
     - Queue utilization > 80%
     - Health check failures
     - High error rates

#### 🔄 Scalability (Medium Priority)

1. **Horizontal Scaling**
   - Currently single-instance
   - **Action**: Consider:
     - Multiple instances behind load balancer
     - Shared storage for WAL (S3, shared volume)
     - Distributed lock mechanism
   - **Note**: Current design is single-process

2. **Database Integration**
   - Uses file-based storage
   - **Action**: Consider PostgreSQL/MySQL for production
   - **Benefit**: Better concurrent access, ACID guarantees

#### 🛡️ Reliability (Medium Priority)

1. **Backup Strategy**
   - Data directory should be backed up
   - **Action**: Set up automated backups
   - **Frequency**: Based on data criticality

2. **Disaster Recovery**
   - No DR plan documented
   - **Action**: Document recovery procedures

3. **Data Retention**
   - WAL grows indefinitely
   - **Action**: Implement log rotation/cleanup
   - **Benefit**: Prevents disk space issues

#### ⚡ Performance (Low Priority)

1. **Connection Pooling**
   - Not applicable (file-based storage)
   - **Action**: Consider for database integration

2. **Caching**
   - Not implemented
   - **Action**: Add Redis for frequently accessed data
   - **Benefit**: Reduce file I/O

## 🚢 Deployment Options

### Option 1: Docker Compose (Simple)

**Best for**: Small deployments, development, staging

```bash
# Production deployment
docker-compose up -d

# With custom environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Pros:**
- Simple setup
- Single command deployment
- Good for small scale

**Cons:**
- Single machine
- No automatic scaling
- Manual updates

### Option 2: Docker Swarm (Medium Complexity)

**Best for**: Small-medium deployments, multi-host

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml event-broker

# Scale
docker service scale event-broker_event-broker=3
```

**Pros:**
- Multi-host support
- Service discovery
- Rolling updates

**Cons:**
- Shared storage needed
- More complex than compose

### Option 3: Kubernetes (Complex)

**Best for**: Large scale, cloud deployments

**Requirements:**
- Kubernetes cluster
- Persistent volumes
- Ingress controller

**Pros:**
- Auto-scaling
- Self-healing
- Service mesh integration

**Cons:**
- High complexity
- Requires K8s expertise

### Option 4: Cloud Services

#### AWS
- **ECS** (Elastic Container Service)
- **EKS** (Elastic Kubernetes Service)
- **Fargate** (Serverless containers)

#### Azure
- **Container Instances**
- **AKS** (Azure Kubernetes Service)

#### GCP
- **Cloud Run** (Serverless)
- **GKE** (Google Kubernetes Engine)

## 📝 Production Configuration

### Environment Variables

Create a `.env.prod` file:

```bash
# Server
NODE_ENV=production
PORT=3000
DATA_DIR=/app/data

# Queue Configuration
QUEUE_MAX_SIZE=5000
WORKER_COUNT=8

# Event Processing
VISIBILITY_TIMEOUT_MS=30000
MAX_RETRIES=10
REAPER_INTERVAL_MS=1000

# Performance
BASE_BACKOFF_MS=1000
MAX_BACKOFF_MS=60000
BACKOFF_MULTIPLIER=2

# Security (add these)
ALLOWED_ORIGINS=https://yourdomain.com
ENABLE_RATE_LIMIT=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

### Docker Compose Production Override

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  event-broker:
    environment:
      - NODE_ENV=production
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
      - ENABLE_RATE_LIMIT=${ENABLE_RATE_LIMIT}
    deploy:
      replicas: 1  # Increase for scaling
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        max_attempts: 3
    volumes:
      - broker-data:/app/data  # Named volume instead of bind mount
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  broker-data:
    driver: local
```

## 🔍 Health Checks & Monitoring

### Health Check Endpoint

Already implemented: `GET /api/health`

### Metrics Endpoint

Already implemented: `GET /api/metrics`

### Status Endpoint

Already implemented: `GET /api/status`

### Monitoring Integration

Example Prometheus scraping:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'event-broker'
    metrics_path: '/api/metrics'
    static_configs:
      - targets: ['localhost:3000']
```

## 🔐 Security Hardening

### 1. Network Security

```yaml
# docker-compose.prod.yml
services:
  event-broker:
    networks:
      - internal
    # Don't expose port directly
    # Use reverse proxy (nginx/traefik)

networks:
  internal:
    driver: bridge
```

### 2. Reverse Proxy (Recommended)

Use nginx or Traefik in front:

```nginx
# nginx.conf
upstream event_broker {
    server event-broker:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://event_broker;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Rate limiting
        limit_req zone=api_limit burst=10 nodelay;
    }
}
```

### 3. SSL/TLS

Use Let's Encrypt or cloud load balancer for HTTPS.

## 📦 Backup Strategy

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)
DATA_DIR=./data

# Create backup
tar -czf $BACKUP_DIR/event-broker-$DATE.tar.gz $DATA_DIR

# Keep only last 7 days
find $BACKUP_DIR -name "event-broker-*.tar.gz" -mtime +7 -delete

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/event-broker-$DATE.tar.gz s3://your-bucket/backups/
```

### Cron Job

```bash
# Crontab entry (daily at 2 AM)
0 2 * * * /path/to/backup.sh
```

## 🔄 Update Procedure

### Rolling Update

```bash
# 1. Pull new image
docker-compose pull

# 2. Update with zero downtime
docker-compose up -d --no-deps event-broker

# 3. Verify health
curl http://localhost:3000/api/health

# 4. Check logs
docker-compose logs -f event-broker
```

### Blue-Green Deployment

1. Deploy new version to new environment
2. Test new version
3. Switch traffic (DNS/load balancer)
4. Keep old version as backup
5. Remove old version after verification

## 📊 Recommended Monitoring

### Key Metrics to Monitor

1. **Queue Metrics**
   - Queue size
   - Queue utilization %
   - Processing latency

2. **Event Metrics**
   - Events enqueued/sec
   - Events consumed/sec
   - Events failed/sec
   - DLQ count

3. **System Metrics**
   - Memory usage
   - CPU usage
   - Disk I/O
   - Network I/O

4. **Error Metrics**
   - Error rate
   - Health check failures
   - Timeouts

### Alert Thresholds

```
- Queue utilization > 80%
- DLQ count > 100
- Error rate > 5%
- Health check failures > 3
- Memory usage > 90%
- CPU usage > 80%
```

## 🎯 Current Status

### ✅ Production Ready

- ✅ Docker containerization
- ✅ Health checks
- ✅ Graceful shutdown
- ✅ Error handling
- ✅ Basic monitoring
- ✅ Persistent storage
- ✅ Security (non-root user)

### ⚠️ Recommended Before Production

- ⚠️ Configure CORS properly
- ⚠️ Add rate limiting
- ⚠️ Set up structured logging
- ⚠️ Configure backups
- ⚠️ Set up alerting
- ⚠️ Add reverse proxy
- ⚠️ Enable SSL/TLS

### 🔮 Future Enhancements

- 🔮 Database integration
- 🔮 Horizontal scaling
- 🔮 Distributed tracing
- 🔮 Advanced metrics (Prometheus)
- 🔮 CI/CD pipeline

## 🚀 Quick Deploy

For immediate deployment with basic setup:

```bash
# 1. Configure environment
cp .env.example .env.prod
# Edit .env.prod with your settings

# 2. Build and deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 3. Verify
curl http://localhost:3000/api/health

# 4. Monitor
docker-compose logs -f event-broker
```

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs event-broker`
2. Check health: `curl http://localhost:3000/api/health`
3. Check status: `curl http://localhost:3000/api/status`
4. Review [DOCKER_GUIDE.md](./DOCKER_GUIDE.md) for Docker issues

---

**Ready to deploy?** Start with the Quick Deploy section above! 🚀
