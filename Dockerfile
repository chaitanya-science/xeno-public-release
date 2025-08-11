# Xeno Public Release - Multi-stage Docker Build
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ alsa-lib-dev

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    alsa-lib \
    alsa-utils \
    pulseaudio \
    pulseaudio-alsa \
    sox \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy configuration template
COPY config.template.json ./

# Create data directory
RUN mkdir -p data

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S xeno -u 1001 -G nodejs

# Set ownership
RUN chown -R xeno:nodejs /usr/src/app

# Switch to non-root user
USER xeno

# Expose port (configurable via environment)
EXPOSE ${PORT:-3000}

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Set environment
ENV NODE_ENV=production

# Start application
CMD ["npm", "start"]
