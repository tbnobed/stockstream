# Multi-stage build for production deployment
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application and fix paths for Docker
RUN npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist \
    && sed -i 's|import\.meta\.dirname|"/app/server"|g' dist/index.js

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies for migrations, then clean up dev deps for runtime
RUN npm ci && npm cache clean --force

# Copy built application from builder stage  
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/server ./server
COPY --from=builder --chown=nextjs:nodejs /app/server/vite-docker.ts ./server/vite.js
# Copy static assets to the expected location for production serving
COPY --from=builder --chown=nextjs:nodejs /app/dist/public ./server/public
COPY --from=builder --chown=nextjs:nodejs /app/shared ./shared
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

# Install postgresql-client for database operations
USER root
RUN apk add --no-cache postgresql-client

# Copy and setup entrypoint script
COPY scripts/docker-entrypoint-simple.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Fix permissions for nextjs user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production

# Use dumb-init to handle signals properly and run entrypoint
ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]

# Start the application
CMD ["node", "dist/index.js"]