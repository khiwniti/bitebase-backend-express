# BiteBase Restack AI Agents Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    git \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src ./src
COPY restack.config.json ./

# Build TypeScript
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S bitebase && \
    adduser -S bitebase -u 1001

# Change ownership of app directory
RUN chown -R bitebase:bitebase /app

# Switch to non-root user
USER bitebase

# Expose port
EXPOSE 5234

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5234/health || exit 1

# Start the application
CMD ["npm", "start"]