# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Model Context Protocol (MCP) Server** for Mindbody API integration, built with Bun.js. It implements an agentic architecture that provides intelligent middleware between AI agents (like Claude) and the Mindbody Public API v6.

**Key Architecture Principle**: This is NOT a simple API wrapper. It provides high-level "goals" as tools (e.g., "sync all clients") rather than exposing raw API endpoints. The server handles complex operations internally including pagination, rate limiting, token management, and caching.

## Development Commands

### Running the Server

```bash
# Development mode with hot-reloading (recommended)
bun run dev

# Production mode
bun run start

# With Docker (includes hot-reloading)
docker compose up

# Production Docker build
docker compose --profile production up mcp-server-prod
```

### Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Test connectivity to Mindbody API
bun run test:connectivity

# Test with MCP Inspector (interactive tool testing)
npx @modelcontextprotocol/inspector bun run src/index.ts
```

### Build

```bash
# Build for production
bun run build
```

## Code Architecture

### Service Layer (src/services/)

The service layer handles all interactions with the Mindbody API and implements critical business logic:

1. **AuthService** (auth.ts)
   - Manages Mindbody User Token lifecycle (tokens expire frequently, typically ~1 hour)
   - Automatically refreshes tokens on 401/403 errors
   - Implements 80% expiry safety margin to prevent mid-request expiration
   - Tokens are stored in memory (regenerated on restart)

2. **MindbodyApiClient** (mindbody.ts)
   - Central API client for all Mindbody requests
   - Automatically integrates rate limiting and authentication
   - Implements automatic retry logic on auth failures
   - Handles request/response transformation and error handling

3. **RateLimitGuard** (rateLimit.ts)
   - Enforces Mindbody's strict 1,000 calls/day limit (per Site ID)
   - Persistent SQLite-based counter (survives restarts)
   - Defaults to 950 calls/day threshold for safety buffer
   - Supports emergency `force: true` override
   - Counter resets at midnight UTC

4. **SyncService** (sync.ts)
   - Handles complex multi-page data fetching operations
   - Implements automatic pagination orchestration (Mindbody returns max 100 records per request)
   - Manages date range chunking for large exports (prevents API timeouts)
   - Writes data to SQLite cache for offline querying

5. **AppointmentService** (appointment.ts)
   - Manages appointment-related operations
   - Implements caching strategy (appointments: 1 hour, bookable items: 24 hours)
   - Handles appointment filtering and pagination

### Database Layer (src/db/)

**schema.ts** defines the complete SQLite schema with these key tables:
- `clients` - Cached client profiles with full raw API responses
- `api_usage` - Daily API call counter for rate limiting
- `sales` - Cached sales transactions
- `sync_logs` - Operation audit trail
- `appointments` - Cached appointment data
- `cache` - Generic key-value cache with TTL and hit counting
- `bookable_items` - Available appointment types/services

**client.ts** provides the DatabaseClient class for all database operations.

### MCP Layer (src/mcp/)

**tools/** - Each tool implements a high-level operation:
- `sync_clients` - Downloads and caches client profiles (handles pagination)
- `export_sales_history` - Exports sales with date range chunking
- `analyze_formula_notes` - Retrieves unstructured SOAP notes
- `write_client_profile` - Updates client data (defaults to dry-run)
- `get_appointments` - Retrieves appointments with filtering
- `get_bookable_appointments` - Lists available appointment types

**resources/** - Read-only access to server state:
- `mindbody://quota/status` - Current API usage and remaining quota
- `mindbody://sync/logs` - Recent operation logs
- `mindbody://cache/summary` - Statistics about cached data

### Configuration (src/config.ts)

Uses Zod for environment validation. Required variables:
- `MBO_API_KEY` - Mindbody Developer API key
- `MBO_SITE_ID` - Mindbody site ID (default: "-99" for sandbox)
- `MBO_STAFF_USERNAME` - Staff account with API access
- `MBO_STAFF_PASSWORD` - Staff account password
- `MCP_SERVER_NAME` - Server identifier (default: "mindbody-migrator")
- `DATA_DIR` - SQLite and export location (default: "./data")
- `DAILY_API_LIMIT_OVERRIDE` - Rate limit threshold (default: 950)

## Key Implementation Patterns

### Pagination Orchestrator Pattern

Mindbody API returns maximum 100 records per request. The SyncService handles this transparently:

```typescript
// Keep fetching until no more records
let offset = 0;
while (true) {
  const response = await apiClient.getClients({ limit: 100, offset });
  // Process response...
  if (response.data.length < 100) break;
  offset += 100;
}
```

### Date Range Chunking Pattern

Large date ranges cause Mindbody API timeouts. The SyncService automatically chunks into weekly segments:

```typescript
// If range > 7 days, split into 7-day chunks
if (daysBetween > 7) {
  // Create array of 7-day date ranges
  // Call API for each chunk
  // Aggregate results
}
```

### Token Refresh with Retry Pattern

Authentication failures trigger automatic token refresh and request retry:

```typescript
// First attempt fails with 401/403
if (response.status === 401 || response.status === 403) {
  authService.invalidateToken();
  const newToken = await authService.getUserToken();
  // Retry the original request with new token
  // Record second API call in rate limiter
}
```

### Caching Strategy Pattern

The AppointmentService implements TTL-based caching to minimize API calls:

```typescript
// Check cache first
const cached = await cacheService.get(cacheKey);
if (cached && !force) {
  return cached; // No API call needed
}

// Fetch from API and cache
const data = await apiClient.getAppointments(params);
await cacheService.set(cacheKey, data, TTL);
return data;
```

## Type Safety and Validation

- **No `any` types allowed** (per user's CLAUDE.md instructions) - use strong types or explicit casting
- All tool parameters validated with Zod schemas
- All API responses typed with interfaces (e.g., `MindbodyClient`, `MindbodyAppointment`)
- TypeScript strict mode enabled with additional checks:
  - `noUncheckedIndexedAccess: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`

## Testing Strategy

Tests are located in `src/__tests__/` and follow these patterns:

1. **Unit Tests** - Test individual services with mocked dependencies
2. **Integration Tests** - Test service interactions (e.g., auth + API client + rate limiter)
3. **MCP Tool Tests** - Test tool handlers end-to-end

When writing tests:
- Mock the Mindbody API using `fetchFn` injection in AuthService/MindbodyApiClient
- Use in-memory SQLite (`:memory:`) for database tests
- Test rate limiting behavior with controlled counters
- Test pagination with multiple pages of mock data
- Test error handling and retry logic

## Data Flow

1. **AI Agent** (Claude Desktop) → Calls MCP tool via stdio transport
2. **MCP Server** (index.ts) → Validates parameters with Zod schema
3. **Tool Handler** (mcp/tools/) → Delegates to appropriate service
4. **Service Layer** → Coordinates API calls, caching, rate limiting
5. **MindbodyApiClient** → Makes authenticated HTTP request
   - RateLimitGuard checks quota before request
   - AuthService provides valid token
   - Request sent to Mindbody API
   - Rate limit counter incremented
6. **Response Processing** → Data cached in SQLite, returned to agent

## Docker Configuration

The project uses Docker for development and production:

**Dockerfile.dev**:
- Hot-reloading via volume mount (`./src:/app/src`)
- Uses `bun run --watch`
- Mounts `.env` and `./data` directory

**Dockerfile**:
- Production-optimized build
- No hot-reloading
- Smaller image size

**Important**: Both containers require `stdin_open: true` and `tty: true` for stdio transport (MCP protocol requirement).

## Common Development Tasks

### Adding a New Tool

1. Create tool schema in `src/mcp/tools/index.ts`:
   ```typescript
   export const myNewToolSchema = z.object({
     param1: z.string(),
     param2: z.number().default(100),
   });
   ```

2. Create handler function in `src/mcp/tools/index.ts`:
   ```typescript
   export async function handleMyNewTool(
     args: z.infer<typeof myNewToolSchema>,
     service: MyService
   ): Promise<{ content: Array<{ type: string; text: string }> }> {
     // Implementation
   }
   ```

3. Register tool in `src/index.ts`:
   - Add to `ListToolsRequestSchema` handler with description and inputSchema
   - Add case to `CallToolRequestSchema` handler

4. Write tests in `src/__tests__/mcp-tools.test.ts`

5. Update README.md with tool documentation

### Adding a New API Endpoint

1. Add method to `MindbodyApiClient` in `src/services/mindbody.ts`:
   ```typescript
   async getMyData(params: {...}): Promise<MyResponse> {
     return this.request({
       endpoint: "/my/endpoint",
       params: {...},
       force: params.force,
     });
   }
   ```

2. Create TypeScript interface for the response type
3. If complex, create a dedicated service in `src/services/`
4. Wire up to MCP tools layer

### Extending Database Schema

1. Add new table SQL to `src/db/schema.ts`
2. Include appropriate indexes for query patterns
3. Add accessor methods to `DatabaseClient` if needed
4. Run migration by restarting server (schema applies on startup)

## Troubleshooting Tips

- **Rate limit errors**: Check `mindbody://quota/status` resource or query `api_usage` table
- **Auth failures**: Token expiry is normal; check retry logic is working
- **Pagination issues**: Verify offset incrementing correctly; check for < 100 records termination
- **Docker volume permissions**: Ensure `./data` directory is writable (`chmod 777 ./data`)
- **Hot-reloading not working**: Check Docker file sharing settings and volume mounts
- **Database locked**: Only run one server instance at a time (SQLite limitation)

## API Coverage Status

Currently implements **~7% of the Mindbody API** (7 out of 95+ endpoints):
- ✅ Client read/update, Sales export, Formula notes, Basic appointments
- ❌ Missing: Class scheduling, Payment processing, Memberships, Staff management, Multi-location, Enrollments, Payroll, and more

See `README.md` for complete roadmap and implementation plan.
