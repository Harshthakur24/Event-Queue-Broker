# 🚀 Quick Start with Docker

Get the Event Broker running in 2 minutes using Docker!

## Prerequisites

1. **Install Docker Desktop** (includes Docker & Docker Compose):
   - Windows/Mac: https://www.docker.com/products/docker-desktop
   - Linux: 
     ```bash
     sudo apt-get update
     sudo apt-get install docker.io docker-compose
     ```

2. **Verify Installation**:
   ```bash
   docker --version
   docker-compose --version
   ```

## 🎯 Quick Start (3 Steps)

### Step 1: Clone/Navigate to Project
```bash
cd "Simple Event Broker"
```

### Step 2: Start the Broker
```bash
# Option A: Using Docker Compose (recommended)
docker-compose up -d

# Option B: Using npm script
npm run docker:up
```

### Step 3: Test It!
```bash
# Check health
curl http://localhost:3000/api/health

# Or open in browser
http://localhost:3000/api/health
```

**That's it!** 🎉 Your event broker is running!

## 📋 Common Commands

```bash
# Start services (detached/background)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View running containers
docker ps

# Execute command in container
docker-compose exec event-broker sh
```

## 🔧 Development Mode

For development with hot reload:

```bash
# Start in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or using npm
npm run docker:dev
```

This mode:
- ✅ Mounts source code (changes reflected immediately)
- ✅ Uses ts-node (no build step needed)
- ✅ Includes dev dependencies

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use port 3001 instead
```

### Permission Denied (Linux)
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and log back in
```

### Container Won't Start
```bash
# Check logs
docker-compose logs event-broker

# Check container status
docker ps -a

# Restart
docker-compose restart event-broker
```

## 📚 Learn More

For detailed Docker explanations, see [DOCKER_GUIDE.md](./DOCKER_GUIDE.md)

## 🎓 Understanding What Happened

When you ran `docker-compose up`, Docker:

1. **Read** `docker-compose.yml` to understand what to build
2. **Built** the Docker image from `Dockerfile` (if not already built)
3. **Created** a container from that image
4. **Started** the container running your application
5. **Mapped** port 3000 from container to your host machine
6. **Mounted** `./data` directory for persistent storage

All of this happened automatically! 🪄

## 🔍 Explore Docker

```bash
# See what Docker did
docker images              # List built images
docker ps                  # List running containers
docker ps -a               # List all containers (including stopped)
docker logs event-broker   # View container logs
docker inspect event-broker  # Detailed container info
```

## 🎯 Next Steps

1. **Test the API**: See [README.md](./README.md#api-documentation)
2. **Learn Docker**: See [DOCKER_GUIDE.md](./DOCKER_GUIDE.md)
3. **Customize**: Edit `docker-compose.yml` for your needs
4. **Deploy**: Use the same Docker image in production!

Happy Dockerizing! 🐳
