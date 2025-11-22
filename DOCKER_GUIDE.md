# 🐳 Docker Guide - Learn Docker While Dockerizing

This guide will teach you Docker concepts while explaining how we Dockerized the Event Broker.

## 📚 Table of Contents

1. [What is Docker?](#what-is-docker)
2. [Key Docker Concepts](#key-docker-concepts)
3. [Our Docker Setup](#our-docker-setup)
4. [Step-by-Step Explanation](#step-by-step-explanation)
5. [Common Docker Commands](#common-docker-commands)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 What is Docker?

**Docker** is a platform that packages your application and its dependencies into a lightweight, portable container that runs consistently across different environments.

### Why Docker?

- **Consistency**: "It works on my machine" → "It works everywhere"
- **Isolation**: Containers don't interfere with each other
- **Portability**: Run the same image on Linux, Mac, Windows, cloud
- **Resource Efficiency**: More efficient than virtual machines

### Docker vs Virtual Machines

```
┌─────────────────────────────────────┐
│  Virtual Machine Approach           │
├─────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │  App 1    │  App 2          │  │
│  ├───────────┴──────────────────┤  │
│  │  Guest OS │  Guest OS       │  │
│  ├───────────┴──────────────────┤  │
│  │  Hypervisor                 │  │
│  ├──────────────────────────────┤  │
│  │  Host Operating System       │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
     Heavy, slower, more resources

┌─────────────────────────────────────┐
│  Docker Container Approach          │
├─────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐     │
│  │  App 1    │  │  App 2    │     │
│  ├───────────┤  ├───────────┤     │
│  │  Docker   │  │  Docker   │     │
│  ├───────────┴──┴───────────┤     │
│  │  Docker Engine           │     │
│  ├──────────────────────────┤     │
│  │  Host Operating System   │     │
│  └──────────────────────────┘     │
└─────────────────────────────────────┘
     Lightweight, fast, efficient
```

---

## 🔑 Key Docker Concepts

### 1. **Image** 📦
- A read-only template for creating containers
- Like a blueprint or class definition
- Contains: OS, runtime, application code, dependencies
- Built from a `Dockerfile`
- Example: `node:20-alpine` (Node.js 20 on Alpine Linux)

### 2. **Container** 📱
- A running instance of an image
- Like an object created from a class
- Isolated environment with its own filesystem, network, processes
- Can be started, stopped, deleted

### 3. **Dockerfile** 📝
- Recipe/instructions for building an image
- Each line = one instruction
- Example instructions:
  - `FROM` - base image
  - `COPY` - copy files
  - `RUN` - execute commands
  - `CMD` - default command

### 4. **Docker Compose** 🎼
- Tool for defining and running multi-container apps
- Uses `docker-compose.yml` file
- Simplifies running multiple services together

### 5. **Volume** 💾
- Persistent storage for containers
- Data survives container removal
- Can mount host directories into containers

---

## 🏗️ Our Docker Setup

We've created these files:

1. **`Dockerfile`** - Production build (multi-stage)
2. **`Dockerfile.dev`** - Development build (simpler)
3. **`docker-compose.yml`** - Production orchestration
4. **`docker-compose.dev.yml`** - Development override
5. **`.dockerignore`** - Files to exclude from build

---

## 📖 Step-by-Step Explanation

### Step 1: Understanding the Dockerfile

Our `Dockerfile` uses a **multi-stage build**:

```dockerfile
# STAGE 1: Build Stage
FROM node:20-alpine AS builder
# ↑ Uses Node.js 20 Alpine (small Linux distro)
# ↑ Names this stage "builder"

WORKDIR /app
# ↑ Creates /app directory and makes it current directory

COPY package.json pnpm-lock.yaml* ./
# ↑ Copies package files (wildcard * means optional)

RUN npm install -g pnpm && pnpm install --frozen-lockfile
# ↑ Installs pnpm, then installs dependencies
# ↑ --frozen-lockfile ensures exact versions

COPY tsconfig.json ./
COPY src ./src
# ↑ Copies TypeScript config and source code

RUN pnpm run build
# ↑ Compiles TypeScript to JavaScript
```

**Why multi-stage?** The build stage includes:
- All dev dependencies (TypeScript compiler)
- Source code
- Build tools

The final image only needs:
- Production dependencies
- Compiled JavaScript
- Runtime (Node.js)

**Result:** Final image is ~70% smaller!

```dockerfile
# STAGE 2: Production Stage
FROM node:20-alpine AS production
# ↑ New, clean image (doesn't include build tools)

ENV NODE_ENV=production
# ↑ Sets environment variable

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
# ↑ Creates non-root user (security best practice)

COPY --from=builder /app/dist ./dist
# ↑ Copies ONLY compiled files from builder stage
# ↑ --from=builder tells Docker to copy from previous stage

CMD ["node", "dist/server.js"]
# ↑ Command to run when container starts
```

### Step 2: Understanding .dockerignore

Similar to `.gitignore`, tells Docker what **NOT** to copy:

```
node_modules/    ← Don't copy (install in container)
dist/            ← Don't copy (build in container)
.git/            ← Don't copy (not needed)
*.log            ← Don't copy (will be generated)
```

**Why?** Faster builds, smaller images, more secure.

### Step 3: Understanding Docker Compose

Our `docker-compose.yml` defines one service: `event-broker`

```yaml
services:
  event-broker:           # Service name
    build:                # How to build the image
      context: .          # Build context (current directory)
      dockerfile: Dockerfile
    
    ports:
      - "3000:3000"       # host:container port mapping
      # ↑ Host port 3000 → Container port 3000
    
    environment:          # Environment variables
      - PORT=3000
    
    volumes:              # Persistent storage
      - ./data:/app/data
      # ↑ Mount ./data (host) → /app/data (container)
      # ↑ Data persists even if container is removed
    
    restart: unless-stopped
    # ↑ Auto-restart policy
```

### Step 4: Understanding Volumes

```yaml
volumes:
  - ./data:/app/data
```

This creates a **bind mount**:
- Left side (`./data`) = Host directory
- Right side (`/app/data`) = Container directory
- Changes in either location are reflected in both
- Data persists after container stops/removes

**Why important?** Our broker stores:
- `events.log` (WAL)
- `committed.log`
- `dlq.log`

Without volumes, this data would be lost when container is removed!

---

## 🚀 Common Docker Commands

### Building Images

```bash
# Build image from Dockerfile
docker build -t event-broker .

# -t = tag/name the image
# . = build context (current directory)
```

### Running Containers

```bash
# Run container from image
docker run -p 3000:3000 event-broker

# -p = port mapping (host:container)
# event-broker = image name

# Run in detached mode (background)
docker run -d -p 3000:3000 --name my-broker event-broker

# -d = detached mode
# --name = container name
```

### Docker Compose Commands

```bash
# Build and start all services
docker-compose up

# Build, start, and run in background
docker-compose up -d

# Start services (don't rebuild)
docker-compose start

# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Rebuild images
docker-compose build

# View logs
docker-compose logs

# Follow logs (like tail -f)
docker-compose logs -f

# Execute command in running container
docker-compose exec event-broker sh
```

### Inspecting Containers

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# View container logs
docker logs <container-id>

# Inspect container
docker inspect <container-id>

# Execute command in container
docker exec -it <container-id> sh

# Remove container
docker rm <container-id>

# Remove image
docker rmi <image-name>
```

### Development Mode

```bash
# Start with development configuration
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or create a shortcut (we'll add this to package.json)
npm run docker:dev
```

---

## 🐛 Troubleshooting

### Issue: Port already in use

```bash
Error: bind: address already in use
```

**Solution:**
```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use different host port
```

### Issue: Permission denied on volumes

**Solution:**
```bash
# On Linux, fix permissions
sudo chown -R $USER:$USER ./data

# Or use named volumes instead of bind mounts
volumes:
  - broker-data:/app/data

volumes:
  broker-data:
```

### Issue: Container keeps restarting

```bash
# Check logs
docker logs <container-id>

# Check exit code
docker inspect <container-id> | grep ExitCode
```

### Issue: Changes not reflected

**In Development:**
- Ensure you're using `docker-compose.dev.yml`
- Source code should be mounted as volume
- Restart container: `docker-compose restart`

**In Production:**
- Rebuild image: `docker-compose build`
- Restart: `docker-compose up -d`

---

## 📊 Understanding Docker Layers

Docker images are built in layers. Each instruction creates a new layer:

```dockerfile
FROM node:20-alpine          # Layer 1: Base image
COPY package.json ./         # Layer 2: Package file
RUN pnpm install            # Layer 3: Dependencies
COPY src ./src              # Layer 4: Source code
RUN pnpm build              # Layer 5: Build output
```

**Why layers matter:**
- Docker caches layers
- If `package.json` doesn't change, Layer 3 is reused
- Only changed layers are rebuilt
- This makes builds faster!

**Best practice:** Copy files that change less frequently first (like package.json before source code).

---

## 🎓 Key Takeaways

1. **Dockerfile** = Recipe for building an image
2. **Image** = Blueprint/class definition
3. **Container** = Running instance of an image
4. **Docker Compose** = Tool for multi-container apps
5. **Volume** = Persistent storage
6. **Multi-stage builds** = Smaller production images
7. **Layers** = Cached build steps (faster rebuilds)

---

## 🚀 Next Steps

1. Try building the image: `docker build -t event-broker .`
2. Run it: `docker run -p 3000:3000 event-broker`
3. Use Compose: `docker-compose up`
4. Experiment with volumes and environment variables!

Happy Dockerizing! 🐳
