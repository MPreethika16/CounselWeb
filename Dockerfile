# Multi-stage Docker build for Production

# Stage 1: Build & Dep extraction
FROM node:20-alpine AS builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production

# Stage 2: Production execution
FROM node:20-alpine
WORKDIR /app

# Non-root user for security
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY server/ ./

# Change ownership
RUN chown -R nodeapp:nodeapp /app

# Switch to non-root user
USER nodeapp

# Expose API port
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health/live || exit 1

# Start app
CMD ["node", "server.js"]
