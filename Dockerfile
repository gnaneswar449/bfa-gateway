# Use official Node.js lightweight Alpine image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code and static assets
COPY src ./src

# Build TypeScript code and copy public static assets to dist
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy compiled JavaScript output and assets from builder
COPY --from=builder /app/dist ./dist

# Create data directory for audit logs
RUN mkdir -p data

# Expose default application port
EXPOSE 3000

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Command to run application server
CMD ["node", "dist/server.js"]
