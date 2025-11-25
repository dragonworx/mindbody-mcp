# Integration Tests

This directory contains **integration tests** that validate MCP tools against the **real Mindbody sandbox API**. These tests simulate how an AI agent would use the MCP server.

---

## Philosophy: Unit vs Integration Tests

### Unit Tests (95% of testing)
- **Location:** `src/__tests__/*.test.ts`
- **Mocking:** Uses OpenAPI spec-based mocks
- **Speed:** Fast (~1-3 seconds per suite)
- **API Calls:** 0 (no network requests)
- **Purpose:** Test business logic, transformations, error handling
- **Run:** Every commit, CI/CD

**Example:**
```typescript
// Unit test with mocked API response
test("should transform appointments correctly", async () => {
  const mockResponse = {
    Appointments: [{
      Id: 12345,              // ✅ From OpenAPI spec
      ClientId: "100000001",  // ✅ From OpenAPI spec
      StaffId: 101,           // ✅ From OpenAPI spec
      // ... accurate mock data based on spec
    }],
  };

  const result = service.transformAppointments(mockResponse);
  expect(result[0].id).toBe("12345");
});
```

### Integration Tests (5% of testing)
- **Location:** `src/__tests__/integration/*.test.ts`
- **Real Components:** Database, API client, services
- **Speed:** Slower (~30-60 seconds per suite)
- **API Calls:** 30-100 per full suite (sandbox only)
- **Purpose:** Test end-to-end workflows as an agent would use them
- **Run:** Pre-release, major features, weekly

**Example:**
```typescript
// Integration test with real sandbox API
test("should sync clients from sandbox", async () => {
  const context = await setupIntegrationTest();

  // Real API call to sandbox
  const response = await handleSyncClients(
    { status: "Active" },
    context.syncService
  );

  // Validate real data was synced
  const clients = context.db.getClients();
  expect(clients.length).toBeGreaterThan(0);
});
```

---

## Running Tests

### Quick Reference
```bash
# Unit tests only (default, runs often)
bun test
bun test:unit

# All integration tests (sandbox API, ~50-100 calls)
bun test:integration

# Specific integration test suites
bun test:integration:clients       # Client sync (~5-10 calls)
bun test:integration:appointments  # Appointments (~10-15 calls)
bun test:integration:sales        # Sales export (~10-20 calls)

# Everything (unit + integration)
bun test:all

# Watch mode (unit tests only)
bun test:watch
```

### Recommended Workflow

1. **During development:**
   ```bash
   bun test:watch  # Auto-run unit tests on file changes
   ```

2. **Before committing:**
   ```bash
   bun test:unit  # Ensure all unit tests pass
   ```

3. **Before releasing/deploying:**
   ```bash
   bun test:all  # Run both unit and integration tests
   ```

4. **Weekly scheduled CI:**
   ```bash
   bun test:integration  # Validate against live sandbox
   ```

---

## Test Structure

### Current Test Files

```
src/__tests__/
├── integration/
│   ├── README.md                    # This file
│   ├── test-helpers.ts              # Shared utilities
│   ├── client-sync.test.ts          # Client sync tools
│   ├── appointments.test.ts         # Appointment tools
│   └── sales-export.test.ts         # Sales export tools
│
└── (unit tests)
    ├── auth.test.ts
    ├── mindbody-client.test.ts
    ├── sync-service.test.ts
    └── ...
```

### Integration Test Categories

#### 1. Client Sync Tests (`client-sync.test.ts`)
**API Calls:** ~5-10 per suite

Tests the `sync_clients` MCP tool:
- Syncing active/inactive clients
- Pagination handling
- Database caching
- Re-sync behavior (updates, not duplicates)
- API usage tracking

**Agent workflows:**
- Query synced client data
- Filter clients by criteria
- Analyze client demographics

#### 2. Appointment Tests (`appointments.test.ts`)
**API Calls:** ~10-15 per suite

Tests appointment-related MCP tools:
- `get_appointments` - Fetch appointments
- `get_bookable_appointments` - List available bookings
- Date range filtering
- Cache behavior (1-hour TTL)
- Force refresh

**Agent workflows:**
- Analyze upcoming appointments
- Identify busy time slots
- Calculate utilization rates

#### 3. Sales Export Tests (`sales-export.test.ts`)
**API Calls:** ~10-20 per suite

Tests the `export_sales_history` MCP tool:
- Date range exports
- Automatic date chunking (7-day segments)
- CSV file generation
- Empty date range handling
- Sync logging

**Agent workflows:**
- Sales trend analysis
- Revenue calculations
- Top clients by spend

---

## Writing New Integration Tests

### Step 1: Set Up Test Context

```typescript
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  setupIntegrationTest,
  teardownIntegrationTest,
  type IntegrationTestContext,
} from "./test-helpers.js";

describe("Integration: My Feature", () => {
  let context: IntegrationTestContext;

  beforeAll(async () => {
    context = await setupIntegrationTest();
  });

  afterAll(async () => {
    await teardownIntegrationTest(context);
  });

  // ... tests
});
```

### Step 2: Test MCP Tool

```typescript
import { handleMyTool } from "../../mcp/tools/index.js";
import { assertMcpToolResponse, extractResponseText } from "./test-helpers.js";

test("should execute my tool", async () => {
  // Call tool as agent would
  const response = await handleMyTool(
    {
      param1: "value1",
      param2: 123,
    },
    context.myService
  );

  // Validate response structure
  assertMcpToolResponse(response);

  // Extract and validate text
  const text = extractResponseText(response);
  expect(text).toContain("expected output");
});
```

### Step 3: Test Agent Workflows

```typescript
test("should enable agent to analyze data", async () => {
  // Step 1: Agent calls tool
  await handleMyTool({ ... }, context.myService);

  // Step 2: Agent queries database
  const data = context.db.getMyData();

  // Step 3: Agent performs analysis
  const analysis = analyzeData(data);

  // Validate agent can extract insights
  expect(analysis).toBeDefined();
});
```

### Step 4: Track API Usage

```typescript
import { getApiUsageStats } from "./test-helpers.js";

test("should track API calls", async () => {
  const statsBefore = getApiUsageStats(context);

  await handleMyTool({ ... }, context.myService);

  const statsAfter = getApiUsageStats(context);
  const callsMade = statsAfter.callsMade - statsBefore.callsMade;

  console.log(`✅ API calls made: ${callsMade}`);
  expect(callsMade).toBeGreaterThan(0);
});
```

---

## Test Helpers

### `setupIntegrationTest()`
Creates real components for testing:
- Real database (isolated test DB)
- Real auth service (connects to sandbox)
- Real API client (makes HTTP calls)
- Real services (sync, appointments, etc.)

### `teardownIntegrationTest(context)`
Cleans up after tests:
- Closes database connections
- Deletes test database files
- Clears cached tokens

### `assertMcpToolResponse(response)`
Validates MCP tool response structure:
```typescript
{
  content: Array<{
    type: "text",
    text: "..."
  }>
}
```

### `extractResponseText(response)`
Extracts text content from MCP response:
```typescript
const text = extractResponseText(response);
console.log(text); // "Synced 10 clients..."
```

### `parseResponseJson<T>(response)`
Parses JSON from MCP response:
```typescript
const data = parseResponseJson<{ count: number }>(response);
console.log(data.count); // 10
```

### `getApiUsageStats(context)`
Gets current API quota usage:
```typescript
const stats = getApiUsageStats(context);
console.log(stats.callsMade);      // 28
console.log(stats.callsRemaining); // 922
console.log(stats.limit);          // 950
```

---

## API Usage Guidelines

### Sandbox Limits
- **Free tier:** 1,000 calls/day
- **Cost:** $0 (sandbox is free)
- **Reset:** Daily at midnight UTC
- **Current usage:** Check with `bun test:connectivity`

### Call Budget per Test Suite
- Client sync: 5-10 calls
- Appointments: 10-15 calls
- Sales export: 10-20 calls
- **Total:** ~30-50 calls per full integration test run

### Best Practices
1. **Run integration tests sparingly** (pre-release, weekly)
2. **Use unit tests for daily development** (0 API calls)
3. **Track API usage in tests** (log call counts)
4. **Use focused test runs** (`test:integration:clients` not `test:integration`)
5. **Set appropriate timeouts** (30-60s for API calls)

---

## Debugging Integration Tests

### Check Sandbox Connectivity
```bash
bun test:connectivity
```

This validates:
- ✅ Environment variables loaded
- ✅ Authentication works
- ✅ API calls successful
- ✅ Quota available

### View API Usage
```bash
# Add to any test
const stats = getApiUsageStats(context);
console.log(`API Usage: ${stats.callsMade}/${stats.limit}`);
```

### Inspect Database State
```bash
# Add to any test
const clients = context.db.getClients();
console.log(`Clients in DB: ${clients.length}`);

const summary = context.db.getCacheSummary();
console.log(`Cache summary:`, summary);
```

### Check Logs
```bash
# Set LOG_LEVEL=debug in .env
LOG_LEVEL=debug bun test:integration
```

---

## Common Issues & Solutions

### Issue: Tests timeout
**Cause:** Slow network or large data fetch
**Solution:** Increase test timeout
```typescript
test("my test", async () => {
  // ...
}, 60000); // 60 second timeout
```

### Issue: Rate limit errors
**Cause:** Too many tests run in short period
**Solution:**
1. Check daily quota: `bun test:connectivity`
2. Run focused tests: `bun test:integration:clients`
3. Wait for daily reset (midnight UTC)

### Issue: Auth failures
**Cause:** Invalid credentials or expired tokens
**Solution:**
1. Verify `.env` has correct sandbox credentials
2. Run `bun test:connectivity` to validate
3. Check token expiry (auto-refresh should work)

### Issue: Empty data from sandbox
**Cause:** Sandbox may have limited test data
**Solution:**
- Tests should handle empty results gracefully
- Use `if (data.length > 0)` checks
- Log warnings, don't fail tests

### Issue: Database locked
**Cause:** Multiple test processes accessing same DB
**Solution:**
- Only run one integration test suite at a time
- Use `afterAll` to properly close database
- Delete test DB files after tests

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test:unit  # Fast, no API calls

  integration-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'  # Only on PRs
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test:integration  # Sandbox API
        env:
          MBO_API_KEY: ${{ secrets.MBO_API_KEY }}
          MBO_SITE_ID: ${{ secrets.MBO_SITE_ID }}
          MBO_STAFF_USERNAME: ${{ secrets.MBO_STAFF_USERNAME }}
          MBO_STAFF_PASSWORD: ${{ secrets.MBO_STAFF_PASSWORD }}

  weekly-integration:
    runs-on: ubuntu-latest
    schedule:
      - cron: '0 0 * * 0'  # Weekly on Sunday
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test:all  # Full test suite
```

---

## Future Test Coverage

### Planned Integration Tests

- **Client Profile Updates** (`write_client_profile` tool)
  - Update client email, phone, address
  - Dry-run mode validation
  - Error handling for invalid data

- **Formula Notes** (`analyze_formula_notes` tool)
  - Fetch SOAP notes for clients
  - Parse unstructured text
  - Extract insights

- **Multi-tool Workflows**
  - Sync clients → Fetch appointments → Analyze utilization
  - Export sales → Identify top clients → Update profiles

- **Error Recovery**
  - Rate limit hit mid-sync
  - Authentication token expiry
  - Network failures and retries

- **Cache Management**
  - Cache hit/miss ratios
  - TTL expiration
  - Cache invalidation

---

## Resources

- **OpenAPI Spec:** `api-specs/mindbody-public-api-v6.json`
- **Type Definitions:** `api-specs/mindbody-api-types.ts`
- **Schema Comparison:** `api-specs/API_SCHEMA_COMPARISON.md`
- **Unit Tests:** `src/__tests__/*.test.ts`
- **MCP Tools:** `src/mcp/tools/index.ts`
- **Services:** `src/services/`

---

## Questions?

- **How often should I run integration tests?**
  - Pre-release, after major features, weekly scheduled

- **Should I mock the API in integration tests?**
  - No, integration tests use the real sandbox API

- **Can I test write operations?**
  - Yes, but use dry-run mode or test account data

- **What if the sandbox is down?**
  - Integration tests will fail; check Mindbody status page
  - Unit tests should still pass (no API dependency)

- **How do I add a new integration test?**
  1. Create new file in `src/__tests__/integration/`
  2. Use `setupIntegrationTest()` helper
  3. Test MCP tools as agent would use them
  4. Add npm script to `package.json`
  5. Update this README

---

**Last Updated:** 2025-11-24
**Test Coverage:** 3 integration test suites, ~50-100 API calls
