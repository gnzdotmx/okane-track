# Multi-stage build for optimal image size

# Stage 1: Build
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Compile seed script separately
RUN npx tsc prisma/seed.ts --outDir dist/prisma --esModuleInterop --skipLibCheck

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install wget for healthcheck and openssl for Prisma
RUN apk add --no-cache wget openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only (skip postinstall script since Prisma client is already generated)
RUN npm install --only=production --ignore-scripts

# Install @prisma/client if not already installed
RUN test -d node_modules/@prisma/client || npm install @prisma/client@5.7.1 --save --ignore-scripts

# Install Prisma CLI globally for database migrations (needed for db push)
RUN npm install -g prisma@5.7.1

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist/prisma ./dist/prisma

# Create uploads directory
RUN mkdir -p /app/uploads

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Create a startup script
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Start application
ENTRYPOINT ["/app/docker-entrypoint.sh"]

