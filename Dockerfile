# Use Node.js 18 with Alpine for better compatibility
FROM node:18.18.2-alpine3.18 AS builder

# Set working directory
WORKDIR /usr/src/app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies with clean cache
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm install --production --prefer-offline --no-audit --progress=false

# Final stage
FROM node:16.18.1-alpine3.16

# Set working directory
WORKDIR /usr/src/app

# Copy built node_modules from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy application code
COPY . .

# Create necessary directories with correct permissions
RUN mkdir -p /usr/src/app/logs \
    && mkdir -p /usr/src/app/output/results \
    && mkdir -p /usr/src/app/cache \
    && chown -R node:node /usr/src/app

# Switch to non-root user
USER node

# Set environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    NODE_OPTIONS=--max_old_space_size=4096

# Expose the port the app runs on
EXPOSE 3001

# Simple health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Command to run the application
CMD ["node", "--trace-warnings", "start.js"]
