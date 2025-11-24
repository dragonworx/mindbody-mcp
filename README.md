# Mindbody MCP Server

A high-performance **Model Context Protocol (MCP) Server** for Mindbody API integration. Built with Bun.js and designed for AI-driven data migration and management.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Available Resources](#available-resources)
- [Usage Examples](#usage-examples)
- [Development](#development)
- [Technical Details](#technical-details)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Project Structure](#project-structure)
- [Current Limitations & Roadmap](#current-limitations--roadmap)
- [License](#license)

## Overview

### What is MCP?

The Model Context Protocol (MCP) is a standardized protocol that allows AI agents (like Claude, OpenAI) to interact with external tools and data sources. This server implements MCP to provide intelligent access to the Mindbody Public API (v6).

### What Does This Server Do?

Unlike simple API wrappers, this server implements an **Agentic Architecture**. It acts as an intelligent middleware that:

- **Handles Complex Operations Internally**: Instead of exposing raw API endpoints, it provides high-level "goals" as tools (e.g., "sync all clients" instead of "call GET /clients with pagination")
- **Manages State**: Tracks API usage, caches data locally, and manages authentication tokens automatically
- **Prevents API Abuse**: Ensures you never hit Mindbody's aggressive rate limits (1,000 calls/day)
- **Optimizes Performance**: Chunks large requests, handles pagination, and prevents timeouts

This allows AI agents to perform complex data migration and management tasks without worrying about the underlying API complexity.

## Key Features

- **Agentic Architecture**: Smart tools that handle complex operations internally
- **Automatic Rate Limiting**: Respects Mindbody's 1,000 calls/day limit with configurable safeguards
- **Token Management**: Automatic authentication token rotation and refresh
- **Pagination Handling**: Seamless data fetching across large datasets
- **Local Caching**: SQLite-based caching for incremental syncs and fast queries
- **Batch Operations**: Automatic chunking of large date ranges to prevent timeouts
- **Hot-Reloading**: Docker-based development with live code updates
- **Safety Features**: Dry-run mode for write operations, PII detection warnings
- **Persistent State**: Usage tracking survives container restarts

## System Architecture

```
┌─────────────────────┐
│   AI Agent/Host     │
│  (Claude, OpenAI)   │
└──────────┬──────────┘
           │ Stdio/SSE
           │
┌──────────▼──────────┐
│   MCP Server        │
│   (Bun.js)          │
│                     │
│  ┌───────────────┐  │
│  │ Rate Limiter  │  │
│  ├───────────────┤  │
│  │ Auth Manager  │  │
│  ├───────────────┤  │
│  │ Pagination    │  │
│  │ Orchestrator  │  │
│  └───────────────┘  │
└──────┬───────┬──────┘
       │       │
       │       │ HTTPS
       │       │
       │  ┌────▼──────────────┐
       │  │ Mindbody API v6   │
       │  └───────────────────┘
       │
       │ Read/Write
       │
  ┌────▼──────────┐
  │ SQLite Cache  │
  │ (./data/)     │
  └───────────────┘
```

**Responsibilities:**

- **AI Agent**: Reasons about *what* to extract/update (e.g., "Find all inactive clients and export their notes")
- **MCP Server**: Executes the *how* - calculates pagination, rotates tokens, chunks date ranges, standardizes responses
- **Local Cache**: Stores client data, API usage counters, and operation logs

## Quick Start

### Prerequisites

- Docker & Docker Compose (recommended) OR Bun.js v1.1+
- Mindbody API credentials (API Key, Site ID, Staff Username/Password)
- Claude Desktop or another MCP-compatible AI client

### 1. Setup

```bash
# Clone the repository
git clone <repo>
cd mindbody-mcp

# Copy environment template
cp .env.example .env

# Edit .env with your Mindbody credentials
# Required: MBO_API_KEY, MBO_SITE_ID, MBO_STAFF_USERNAME, MBO_STAFF_PASSWORD
```

### 2. Start Development Server

**With Docker (Recommended):**

```bash
# Build and start with Docker Compose
docker compose up

# The server will start with hot-reloading enabled
# You should see: "Mindbody MCP Server running on stdio"
```

**Without Docker:**

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev
```

### 3. Connect to Claude Desktop

Edit your `claude_desktop_config.json`:

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**

```json
{
  "mcpServers": {
    "mindbody": {
      "command": "docker",
      "args": ["compose", "exec", "-T", "mcp-server", "bun", "run", "src/index.ts"]
    }
  }
}
```

**For non-Docker setup:**

```json
{
  "mcpServers": {
    "mindbody": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/mindbody-mcp/src/index.ts"]
    }
  }
}
```

### 4. Restart Claude Desktop

After saving the config file, restart Claude Desktop. You should see the Mindbody tools available in the tool panel.

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Mindbody Developer Credentials (Required)
MBO_API_KEY=your_api_key_here          # Get from Mindbody Developer Portal
MBO_SITE_ID=123456                     # Your Mindbody site ID
MBO_STAFF_USERNAME=staff_admin         # Staff account with API access
MBO_STAFF_PASSWORD=staff_password      # Staff account password

# Server Configuration
MCP_SERVER_NAME=mindbody-migrator      # Server name (shown in MCP clients)
LOG_LEVEL=info                         # debug | info | warn | error
DATA_DIR=./data                        # Directory for SQLite and exports

# Safety Limits
DAILY_API_LIMIT_OVERRIDE=950           # Stop before hitting 1000 limit
```

### Getting Mindbody Credentials

1. **API Key**: Sign up at [Mindbody Developer Portal](https://developers.mindbodyonline.com/)
2. **Site ID**: Found in your Mindbody business settings
3. **Staff Credentials**: Create a staff account with API access permissions

### Docker Volume Configuration

The `./data` directory is automatically created and mounted to persist:
- SQLite database (client cache, usage tracking)
- Exported files (CSV, JSON exports)
- Operation logs

## Available Tools

Tools are the primary way AI agents interact with the server. Each tool is designed to handle complex operations internally.

### sync_clients

Downloads and caches client profiles from Mindbody with automatic pagination.

**Description:**
Fetches client data from Mindbody API and stores it in the local SQLite cache. Handles pagination automatically (100 records per request). Use this before querying clients to avoid individual API calls.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | "Active" | Filter clients by status: "Active", "Inactive", or "All" |
| `since_date` | string | null | ISO date string (e.g., "2024-01-01T00:00:00Z") for delta syncs |
| `force` | boolean | false | Override rate limit protection (use with caution) |

**Example Usage:**
```
"Sync all active clients from Mindbody"
"Sync clients modified since January 1st, 2024"
"Sync all clients including inactive ones"
```

**Internal Behavior:**
- Calls GET `/client/clients` with Limit=100 and incrementing Offset
- Continues until no more records or rate limit warning
- Saves full API response to SQLite for offline querying
- Updates `last_synced_at` timestamp

---

### export_sales_history

Extracts sales data with automatic date range chunking to prevent timeouts.

**Description:**
Retrieves sales transactions for a specified date range. Automatically chunks large ranges into weekly requests to prevent Mindbody API timeouts. Aggregates results and writes to a file in `./data`.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_date` | string | required | Start date in YYYY-MM-DD format |
| `end_date` | string | required | End date in YYYY-MM-DD format |
| `format` | string | "json" | Output format: "json" or "csv" |
| `force` | boolean | false | Override rate limit protection |

**Example Usage:**
```
"Export sales history from January 1 to March 31, 2024"
"Export last year's sales as CSV"
"Get all sales transactions for Q1 2024"
```

**Internal Behavior:**
- Calculates date range span
- If range > 7 days, chunks into 7-day segments
- Calls GET `/sale/sales` for each chunk
- Aggregates results and writes to `./data/sales_YYYYMMDD_YYYYMMDD.{json|csv}`
- Returns file path and record count

**Output Location:** `./data/sales_20240101_20240331.json`

---

### analyze_formula_notes

Retrieves and analyzes client formula notes with pattern detection.

**Description:**
Fetches unstructured SOAP/Formula notes for specific clients. Includes pattern detection for common data structures (e.g., hair color formulas, treatment plans).

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `client_id_list` | array | required | Array of client IDs (strings or numbers) |
| `force` | boolean | false | Override rate limit protection |

**Example Usage:**
```
"Analyze formula notes for clients 12345, 67890, and 11111"
"Get formula notes for client 54321"
"Retrieve treatment notes for these clients: [101, 102, 103]"
```

**Internal Behavior:**
- Calls GET `/client/clientformulanotes` for each client ID
- Returns raw text plus structured suggestions if patterns detected
- Flags potential PII (medical data, personal information)

**Output Format:**
```json
{
  "client_id": "12345",
  "notes": [
    {
      "date": "2024-01-15",
      "text": "Formula: 6NN + 20vol...",
      "detected_patterns": ["hair_formula"]
    }
  ],
  "contains_pii": true
}
```

---

### write_client_profile

Updates client profiles with dry-run support.

**Description:**
Modifies client data in Mindbody. **Always defaults to dry-run mode** to preview changes before applying them. Validates data against Mindbody's UpdateClient schema.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `client_id` | string | required | Client ID to update |
| `data` | object | required | JSON object with fields to update |
| `dry_run` | boolean | true | If true, shows preview without applying changes |
| `force` | boolean | false | Override rate limit protection |

**Example Usage:**
```
"Update client 12345's email to newemail@example.com (dry run)"
"Change phone number for client 67890 to 555-1234"
"Update client 11111's address (apply changes)"
```

**Supported Fields:**
- `email`
- `mobilePhone`
- `homePhone`
- `addressLine1`, `addressLine2`
- `city`, `state`, `postalCode`
- `birthDate`
- `firstName`, `lastName`
- `emergencyContactInfoName`, `emergencyContactInfoPhone`

**Internal Behavior:**
- Validates `data` object against Mindbody schema
- If `dry_run: true`, fetches current profile and shows diff
- If `dry_run: false`, calls POST `/client/updateclient`
- Returns success/failure status with details

**Safety Feature:** The agent will always be prompted to confirm before applying changes.

## Available Resources

Resources provide read-only access to server state. AI agents can query these to understand the current situation before taking action.

### mindbody://quota/status

Returns current API usage and remaining quota.

**Response Format:**
```json
{
  "date": "2024-11-24",
  "calls_made": 247,
  "calls_remaining": 703,
  "limit": 950,
  "reset_time": "2024-11-25T00:00:00Z",
  "percentage_used": 26
}
```

**Usage:** "Check current API quota" or "How many API calls have we made today?"

---

### mindbody://sync/logs

Returns recent operation logs (last 50 lines).

**Response Format:**
```json
{
  "logs": [
    "[2024-11-24T10:30:15Z] INFO: sync_clients started (status=Active)",
    "[2024-11-24T10:30:18Z] INFO: Fetched 100 clients (offset=0)",
    "[2024-11-24T10:30:21Z] INFO: Fetched 100 clients (offset=100)",
    "[2024-11-24T10:30:23Z] INFO: sync_clients completed (total=247 clients)"
  ]
}
```

**Usage:** "Show recent sync logs" or "What operations have been performed recently?"

---

### mindbody://cache/summary

Returns statistics about locally cached data.

**Response Format:**
```json
{
  "clients": {
    "total": 4502,
    "active": 3891,
    "inactive": 611,
    "last_synced": "2024-11-24T10:30:23Z"
  },
  "sales": {
    "total": 12000,
    "date_range": {
      "earliest": "2023-01-01",
      "latest": "2024-11-24"
    }
  },
  "cache_size_mb": 45.7
}
```

**Usage:** "Show cache summary" or "How many clients are cached locally?"

## Usage Examples

### Example 1: Initial Data Migration

```
User: "I need to migrate all client data from Mindbody. Can you start by syncing all active clients?"

Claude: [Checks quota] We have 950 API calls available today. I'll sync all active clients now.
[Calls sync_clients with status="Active"]
✓ Synced 4,502 active clients (used 46 API calls)

User: "Great! Now export all sales from 2023."

Claude: [Calls export_sales_history with start_date="2023-01-01", end_date="2023-12-31"]
✓ Exported 8,734 sales transactions to ./data/sales_20230101_20231231.json
(Used 53 API calls due to weekly chunking)
```

### Example 2: Delta Sync

```
User: "Update the client cache with any changes since last week."

Claude: [Reads cache/summary to get last_synced timestamp]
Last sync was 2024-11-17. I'll sync changes since then.
[Calls sync_clients with since_date="2024-11-17T00:00:00Z"]
✓ Synced 127 modified clients (used 2 API calls)
```

### Example 3: Formula Note Analysis

```
User: "I need to analyze formula notes for clients who visited in the last month to migrate them to the new system."

Claude: [Queries local cache for recent client IDs]
Found 203 clients with visits in the last month.
[Calls analyze_formula_notes with client_id_list=[...]]
✓ Retrieved notes for 203 clients
⚠ Warning: 47 notes contain potential PII (medical information)

Here's a breakdown of detected patterns:
- Hair formulas: 189 clients
- Treatment plans: 12 clients
- Unstructured notes: 2 clients
```

### Example 4: Safe Profile Update

```
User: "Update client 12345's email to john.doe@newdomain.com"

Claude: I'll preview the change first using dry-run mode.
[Calls write_client_profile with dry_run=true]

Preview:
Current: john.doe@olddomain.com
New: john.doe@newdomain.com

Shall I apply this change?

User: "Yes, apply it."

Claude: [Calls write_client_profile with dry_run=false]
✓ Successfully updated client 12345's email
```

## Development

### Local Development (without Docker)

```bash
# Install dependencies
bun install

# Run in development mode with hot-reloading
bun run dev

# Run tests
bun test

# Run tests with coverage
bun test --coverage

# Run tests in watch mode
bun test --watch
```

### Docker Development

```bash
# Start with hot-reloading
docker compose up

# View logs
docker compose logs -f mcp-server

# Restart after config changes
docker compose restart

# Rebuild after dependency changes
docker compose up --build

# Stop server
docker compose down
```

### Testing with MCP Inspector

The MCP Inspector allows you to test tools without connecting to an AI client:

```bash
# With Docker
npx @modelcontextprotocol/inspector docker compose exec -T mcp-server bun run src/index.ts

# Without Docker
npx @modelcontextprotocol/inspector bun run src/index.ts
```

This opens a web UI where you can:
- Call tools with custom parameters
- View resource data
- Inspect request/response logs
- Test rate limiting behavior

### Production Build

```bash
# Build production container
docker compose --profile production build

# Run production server
docker compose --profile production up mcp-server-prod

# Production build uses Dockerfile (not Dockerfile.dev)
# No hot-reloading, optimized for performance
```

### Adding New Tools

1. Create tool handler in `src/mcp/tools/`
2. Define Zod schema for parameters
3. Implement business logic (call Mindbody API, update cache, etc.)
4. Register tool in `src/index.ts`
5. Add tests in `test/tools/`
6. Update README with tool documentation

**Example:**

```typescript
// src/mcp/tools/getAppointments.ts
import { z } from 'zod';

export const getAppointmentsSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  staff_id: z.string().optional()
});

export async function getAppointments(params: z.infer<typeof getAppointmentsSchema>) {
  // Implementation
}
```

## Technical Details

### Authentication Service

Mindbody's User Tokens expire frequently (typically after 1 hour). The authentication service handles this automatically:

1. **Token Storage**: User Token stored in memory (regenerated on restart)
2. **Automatic Refresh**: On 401/403 errors, calls POST `/usertoken/issue`
3. **Request Retry**: Automatically retries original request with new token
4. **Staff Login**: Uses staff credentials to generate User Tokens

**Implementation:** `src/services/auth.ts`

**Flow:**
```
Request → Check Token Exists → Make API Call
                                     ↓
                              401/403 Error?
                                     ↓
                          Issue New User Token
                                     ↓
                              Retry Request
```

### Rate Limiting Strategy

Mindbody enforces a strict limit of 1,000 API calls per day (per Site ID). The server implements defensive rate limiting:

**Components:**

1. **Persistent Counter**: API usage stored in SQLite (survives restarts)
2. **Daily Reset**: Counter resets at midnight UTC
3. **Configurable Threshold**: Defaults to 950 to leave buffer
4. **Circuit Breaker**: Rejects tool calls when threshold reached
5. **Force Override**: Emergency bypass with `force: true` parameter

**Implementation:** `src/services/rateLimit.ts`

**Database Table:**
```sql
CREATE TABLE api_usage (
    date DATE PRIMARY KEY,
    count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Middleware Logic:**
```typescript
async function checkRateLimit(): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const usage = await db.query("SELECT count FROM api_usage WHERE date = ?", [today]);

  if (usage.count >= DAILY_LIMIT) {
    throw new Error('Daily API limit reached');
  }

  await db.query("UPDATE api_usage SET count = count + 1 WHERE date = ?", [today]);
  return true;
}
```

### Database Schema

The server uses SQLite for local caching and state management.

**Location:** `./data/mindbody.db`

**Schema:**

```sql
-- Client cache
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    mobile_phone TEXT,
    status TEXT,
    creation_date TEXT,
    raw_data JSON,           -- Full API response
    last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
    date DATE PRIMARY KEY,
    count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Operation logs
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level TEXT,
    operation TEXT,
    message TEXT,
    metadata JSON
);

-- Sales cache (optional)
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    sale_date TEXT,
    client_id TEXT,
    total REAL,
    raw_data JSON,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
```

### Pagination Orchestrator

Mindbody API returns maximum 100 records per request. The pagination orchestrator handles this transparently:

**Strategy:**
1. Start with `Offset=0`, `Limit=100`
2. Check response: if `RecordCount < 100`, we're done
3. Otherwise, increment offset: `Offset += 100`
4. Repeat until no more records

**Implementation:** `src/services/sync.ts`

```typescript
async function paginateFetch(endpoint: string, baseParams: object) {
  let offset = 0;
  let allResults = [];

  while (true) {
    const response = await api.get(endpoint, {
      ...baseParams,
      Limit: 100,
      Offset: offset
    });

    allResults.push(...response.data);

    if (response.data.length < 100) break;
    offset += 100;
  }

  return allResults;
}
```

### Docker Configuration

**Development Container (`Dockerfile.dev`):**
```dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install

# Copy source (hot-reload via volume mount)
COPY . .

# Run in watch mode
CMD ["bun", "run", "--watch", "src/index.ts"]
```

**Production Container (`Dockerfile`):**
```dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --production

# Copy source
COPY . .

# Build (optional)
RUN bun build src/index.ts --outdir dist --target bun

# Run optimized
CMD ["bun", "run", "src/index.ts"]
```

**Key Configuration:**
- `stdin_open: true` and `tty: true` required for stdio transport
- Volume mounts for hot-reloading and data persistence
- `FORCE_COLOR=1` for colored logs

## Troubleshooting

### Server not appearing in Claude Desktop

**Symptoms:** Claude Desktop doesn't show Mindbody tools

**Solutions:**
1. Check `claude_desktop_config.json` syntax (valid JSON)
2. Verify file path is correct
3. Ensure server is running: `docker compose ps`
4. Check Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`
5. Restart Claude Desktop completely (quit from menu bar)

### Rate limit errors

**Symptoms:** "Daily API limit reached" errors

**Solutions:**
1. Check current usage: Ask Claude "Check API quota"
2. Wait until midnight UTC for reset
3. Increase limit: Set `DAILY_API_LIMIT_OVERRIDE=1000` in `.env`
4. Emergency override: Use `force: true` parameter (not recommended)

### Authentication failures

**Symptoms:** "401 Unauthorized" or "Invalid User Token"

**Solutions:**
1. Verify credentials in `.env` file
2. Check staff account has API permissions in Mindbody
3. Ensure `MBO_SITE_ID` matches your Mindbody site
4. Try logging into Mindbody web dashboard with same credentials
5. Check if account has 2FA enabled (not supported)

### Pagination timeouts

**Symptoms:** "Request timeout" on large datasets

**Solutions:**
1. Already handled automatically for most tools
2. For custom queries, use `since_date` for delta syncs
3. Reduce date ranges for sales exports
4. Check network connectivity and Mindbody API status

### Docker volume permissions

**Symptoms:** "Permission denied" writing to `./data`

**Solutions:**
```bash
# Fix permissions
chmod 777 ./data

# Or run with user permissions
docker compose run --user $(id -u):$(id -g) mcp-server
```

### Hot-reloading not working

**Symptoms:** Code changes not reflected

**Solutions:**
1. Verify volume mount in `compose.yaml`
2. Check Docker Desktop file sharing settings
3. Restart container: `docker compose restart`
4. Try full rebuild: `docker compose up --build`

### Database locked errors

**Symptoms:** "Database is locked" errors

**Solutions:**
1. SQLite doesn't handle concurrent writes well
2. Ensure only one server instance running
3. Stop all containers: `docker compose down`
4. Delete `./data/mindbody.db` and resync (loses cache)

## Best Practices

### For AI Agents Using This Server

When instructing AI agents to use this server, include these guidelines:

1. **Always check quota first**: Read `mindbody://quota/status` before bulk operations
2. **Prefer sync over individual fetches**: Call `sync_clients` once, then query local cache
3. **Use delta syncs**: Pass `since_date` for incremental updates instead of full resyncs
4. **Respect dry-run mode**: Always preview changes before applying write operations
5. **Handle PII appropriately**: Flag sensitive data when analyzing formula notes
6. **Monitor usage**: Check quota periodically during long operations
7. **Batch operations**: Group related tasks to minimize API calls

### For Developers

1. **Test with MCP Inspector first**: Validate tools before connecting to AI client
2. **Monitor rate limits**: Keep usage under 800 calls/day for safety margin
3. **Use structured logging**: All operations logged to SQLite for debugging
4. **Validate inputs**: Use Zod schemas for all tool parameters
5. **Handle errors gracefully**: Return actionable error messages to AI agent
6. **Document changes**: Update README when adding new tools
7. **Version environment**: Use `.env.example` template for required variables

### Security Considerations

1. **Never commit `.env`**: Contains sensitive credentials
2. **Rotate credentials regularly**: Update Mindbody staff password periodically
3. **Limit staff permissions**: Use account with minimum required permissions
4. **Secure the host**: MCP runs locally, but secure the machine
5. **Audit write operations**: Review all `write_client_profile` calls
6. **PII handling**: Be cautious with formula notes and client data
7. **Rate limit respect**: Prevents account suspension from API abuse

## Project Structure

```
mindbody-mcp/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── config.ts                   # Environment variable validation
│   │
│   ├── mcp/
│   │   ├── tools/                  # Tool implementations
│   │   │   ├── syncClients.ts
│   │   │   ├── exportSales.ts
│   │   │   ├── analyzeNotes.ts
│   │   │   └── writeProfile.ts
│   │   │
│   │   ├── resources/              # Resource handlers
│   │   │   ├── quotaStatus.ts
│   │   │   ├── syncLogs.ts
│   │   │   └── cacheSummary.ts
│   │   │
│   │   └── prompts/                # Prompt templates (optional)
│   │
│   ├── services/
│   │   ├── mindbody.ts             # Raw API client (Axios/Fetch)
│   │   ├── auth.ts                 # User Token management
│   │   ├── sync.ts                 # Pagination & batching logic
│   │   └── rateLimit.ts            # Rate limit guard middleware
│   │
│   └── db/
│       ├── schema.ts               # SQLite table definitions
│       ├── client.ts               # Database access layer
│       └── migrations/             # Schema migrations (if needed)
│
├── test/                           # Test files
│   ├── tools/
│   ├── services/
│   └── integration/
│
├── data/                           # Mounted volume (created at runtime)
│   ├── mindbody.db                 # SQLite database
│   ├── sales_*.{json,csv}          # Exported files
│   └── logs/                       # Operation logs
│
├── .env.example                    # Environment template
├── .env                            # Your credentials (gitignored)
├── .gitignore
├── Dockerfile.dev                  # Development container
├── Dockerfile                      # Production container
├── compose.yaml                    # Docker Compose configuration
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript configuration
├── bun.lockb                       # Bun lock file
├── README.md                       # This file
└── SPEC.md                         # Technical specification
```

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Ensure tests pass: `bun test`
5. Commit with clear messages
6. Submit a pull request

### Development Setup

```bash
git clone <your-fork>
cd mindbody-mcp
bun install
cp .env.example .env
# Add your test credentials
bun run dev
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test test/tools/syncClients.test.ts

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch
```

## API Reference

For detailed Mindbody API documentation, see:
- [Mindbody Public API v6 Documentation](https://developers.mindbodyonline.com/PublicDocumentation)
- [API Explorer](https://developers.mindbodyonline.com/explorer)

## Current Limitations & Roadmap

### ⚠️ API Coverage: ~7% → Target: 100%

This MCP server currently implements only **7 out of 95+ available Mindbody API endpoints**. While it handles basic client syncing and sales data export, it lacks many critical features:

**❌ Not Yet Supported:**
- Appointment scheduling and management (12 endpoints)
- Class bookings and schedules (15 endpoints)
- Payment processing and checkout (15 endpoints)
- Membership/package sales (13 endpoints)
- Staff management and CRUD operations (8 endpoints)
- Multi-location/site configuration (12 endpoints)
- Enrollment programs (6 endpoints)
- Payroll integration (5 endpoints)
- Gift cards, transactions, document uploads, and more

**✅ Currently Supported:**
- Client profile viewing and basic updates
- Sales history export
- Formula notes analysis
- Basic data migration tasks

### Implementation Plan

We have a comprehensive agile implementation plan targeting **100% API coverage** in 12 weeks:

📋 **[View Complete Implementation Plan →](./AGILE_PLAN.md)**

**Quick Summary:**
- **83 Stories** across 8 Epics
- **254 Story Points** of work
- **6 Sprints** (2 weeks each)
- **95+ API Endpoints** (100% coverage)
- **85-95% Test Coverage** across all features

### Roadmap Phases

| Sprint | Focus | Coverage | Stories | Key Deliverables |
|--------|-------|----------|---------|------------------|
| **Sprint 1** (Weeks 1-2) | Appointments & Classes Read | 20% | 11 | View schedules, database schemas |
| **Sprint 2** (Weeks 3-4) | Booking Operations | 35% | 9 | Book/cancel appointments & classes |
| **Sprint 3** (Weeks 5-6) | Commerce Catalogs | 50% | 10 | Product catalogs, create clients |
| **Sprint 4** (Weeks 7-8) | Payment Processing | 70% | 12 | Full commerce, gift cards, refunds |
| **Sprint 5** (Weeks 9-10) | Staff & Multi-Location | 90% | 29 | Staff CRUD, site configuration |
| **Sprint 6** (Weeks 11-12) | Advanced Features | **100%** | 12 | Enrollments, shopping cart |

### Documentation

- **[GAP_ANALYSIS.md](./GAP_ANALYSIS.md)** - Detailed analysis of what's missing and why
- **[AGILE_PLAN.md](./AGILE_PLAN.md)** - Complete epic/story breakdown with checkboxes for tracking
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - High-level overview and quick reference

### Test Coverage Goals

Each epic has specific test coverage requirements:
- **Critical Features** (Appointments, Classes, Sales): 90-95% coverage
- **High Priority** (Client, Staff): 90% coverage
- **Medium Priority** (Site, Enrollment): 85% coverage
- **Low Priority** (Payroll): 80% coverage

**Target:** All features include comprehensive unit tests, integration tests, and end-to-end workflow validation.

## License

MIT

---

**Built with:**
- [Bun.js](https://bun.sh/) - Fast JavaScript runtime
- [Model Context Protocol SDK](https://github.com/anthropics/modelcontextprotocol) - MCP implementation
- [Zod](https://zod.dev/) - TypeScript-first schema validation
- [Mindbody Public API v6](https://developers.mindbodyonline.com/) - Business management platform

**Maintained by:** [Your Name/Organization]

**Version:** 1.0.0
