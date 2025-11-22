# ============================================
# DOCKER BASICS - What is this file doing?
# ============================================
# A Dockerfile is a recipe for building a Docker image.
# Each instruction creates a "layer" in the image.
# We use a "multi-stage build" to keep the final image small.
#
# Stage 1: Build stage - compile TypeScript
# Stage 2: Production stage - run the compiled code
# ============================================

# ============================================
# STAGE 1: BUILD STAGE
# ============================================
# We use Node.js 20 LTS (Long Term Support) as the base image
# This gives us npm, node, and all the tools we need to build
FROM node:20-alpine AS builder

# WORKDIR sets the current directory inside the container
# Think of it like doing: cd /app
WORKDIR /app

# Copy package files first (Docker layer caching optimization)
# Why? Docker caches layers. If package.json hasn't changed,
# Docker will reuse the cached layer with node_modules installed
COPY package.json ./
# If using pnpm (which you are), copy pnpm-lock.yaml too
COPY pnpm-lock.yaml* ./

# Install dependencies
# --frozen-lockfile ensures exact versions from lockfile
# We install pnpm globally first, then use it to install deps
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript
# This compiles all .ts files in src/ to .js files in dist/
RUN pnpm run build

# ============================================
# STAGE 2: PRODUCTION STAGE
# ============================================
# We use a smaller alpine image (no build tools needed)
# Alpine Linux is tiny (~5MB) vs full Node image (~150MB)
FROM node:20-alpine AS production

# Set environment to production
ENV NODE_ENV=production

# Create a non-root user for security
# Running as root in containers is a security risk
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Install only production dependencies
# We need pnpm to run the app, but not dev dependencies
RUN npm install -g pnpm

# Copy package files and install production deps only
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder stage
# The --from=builder tells Docker to copy from the previous stage
COPY --from=builder /app/dist ./dist

# Create data directory for persistent storage
# The broker stores WAL, committed logs, and DLQ here
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port 3000
# This documents which port the app uses (doesn't actually publish it)
EXPOSE 3000

# Health check
# Docker will periodically check if the app is healthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the application
# This is the command that starts when the container runs
CMD ["node", "dist/server.js"]
