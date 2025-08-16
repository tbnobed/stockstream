# InventoryPro Production Dockerfile
# Clean build with PostgreSQL driver replacement for containerized deployment

# Build stage - prepare application with correct database driver
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Replace cloud database driver with PostgreSQL driver for Docker
RUN echo "import { drizzle } from 'drizzle-orm/postgres-js';" > server/db.ts && \
    echo "import postgres from 'postgres';" >> server/db.ts && \
    echo "import * as schema from '@shared/schema';" >> server/db.ts && \
    echo "" >> server/db.ts && \
    echo "if (!process.env.DATABASE_URL) {" >> server/db.ts && \
    echo "  throw new Error('DATABASE_URL must be set.');" >> server/db.ts && \
    echo "}" >> server/db.ts && \
    echo "" >> server/db.ts && \
    echo "export const connection = postgres(process.env.DATABASE_URL);" >> server/db.ts && \
    echo "export const db = drizzle({ client: connection, schema });" >> server/db.ts

# Build frontend and backend
RUN npm run build && \
    npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist && \
    sed -i 's|import\.meta\.dirname|"/app/server"|g' dist/index.js

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache dumb-init postgresql-client

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files and install production dependencies + required build tools
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy application files from builder
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/server ./server
COPY --from=builder --chown=nextjs:nodejs /app/shared ./shared
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

# Copy and setup entrypoint
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set proper ownership
RUN chown -R nextjs:nodejs /app

# Switch to app user
USER nextjs

# Expose port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:5000/api/health || exit 1

# Use entrypoint for database setup
ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]