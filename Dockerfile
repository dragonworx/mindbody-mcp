FROM oven/bun:1-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Build (optional - Bun runs TypeScript natively)
# RUN bun build src/index.ts --outdir dist --target bun

# Create data directory
RUN mkdir -p /app/data

# Production runtime
FROM oven/bun:1-alpine

WORKDIR /app

# Copy from base
COPY --from=base /app /app

# Expose port if using SSE (Optional)
EXPOSE 3000

# Run the server
CMD ["bun", "run", "src/index.ts"]
