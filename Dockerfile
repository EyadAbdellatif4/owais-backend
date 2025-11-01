# Multi-stage build for NestJS application

# Stage 1: Dependencies
FROM node:22-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Stage 2: Build
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files and dependencies
COPY package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 3: Production
FROM node:22-alpine AS production

WORKDIR /app

# Install dumb-init and wget for health checks
RUN apk add --no-cache dumb-init wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from build stage
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/src/shared/database/migrations ./dist/shared/database/migrations
COPY --from=build --chown=nestjs:nodejs /app/src/shared/database/seeders ./dist/shared/database/seeders
COPY --from=build --chown=nestjs:nodejs /app/src/shared/database/config.js ./dist/shared/database/config.js

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]

