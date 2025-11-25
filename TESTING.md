# Testing Strategy

This document outlines the comprehensive testing strategy for the Mindbody MCP Server.

---

## Testing Philosophy

### Two-Tier Testing Approach

This project uses a **two-tier testing strategy** optimized for speed, reliability, and API quota conservation:

```
┌─────────────────────────────────────────────────────────┐
│  Unit Tests (95%)                                       │
│  - OpenAPI spec-based mocks                             │
│  - Fast execution (~1-3 seconds)                        │
│  - Zero API calls                                       │
│  - Run on every commit                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Integration Tests (5%)                                 │
│  - Real sandbox API connection                          │
│  - Slower execution (~30-60 seconds)                    │
│  - ~50-100 API calls per full suite                     │
│  - Run before releases, major features, weekly          │
└─────────────────────────────────────────────────────────┘
```

**Key Principle:** Use the official OpenAPI specification to generate accurate mocks for unit tests, then validate end-to-end behavior with targeted integration tests.

---

## Test Coverage

### Current Test Suite

| Category | Location | API Calls | Speed | Purpose |
|----------|----------|-----------|-------|---------|
| **Unit Tests** | `src/__tests__/*.test.ts` | 0 | Fast | Business logic, transformations |
| **Service Tests** | `src/services/*.test.ts` | 0 | Fast | Service layer behavior |
| **Integration Tests** | `src/__tests__/integration/` | 50-100 | Slow | End-to-end MCP tool validation |

### Unit Test Coverage

1. **AuthService** (`src/__tests__/auth.test.ts`)
   - Token issuance and caching
   - Token refresh on expiry
   - Token invalidation
   - 80% expiry safety margin

2. **MindbodyApiClient** (`src/__tests__/mindbody-client.test.ts`)
   - GET/POST requests
   - Authentication integration
   - Rate limiting integration
   - Retry logic on 401/403
   - Error handling

3. **RateLimitGuard** (`src/__tests__/rate-limit.test.ts`)
   - Daily quota tracking
   - Limit enforcement
   - Force flag bypass
   - Usage statistics
   - 80% approaching threshold

4. **SyncService** (`src/__tests__/sync-service.test.ts`)
   - Client pagination
   - Sales date chunking
   - Error handling and recovery
   - Sync logging

5. **AppointmentService** (`src/services/appointment.test.ts`)
   - Appointment fetching
   - Bookable items retrieval
   - Cache TTL (1 hour appointments, 24 hours bookable items)
   - Data transformation

### Integration Test Coverage

1. **Client Sync** (`src/__tests__/integration/client-sync.test.ts`)
   - ✅ Sync active/inactive clients
   - ✅ Pagination handling
   - ✅ Re-sync (updates, not duplicates)
   - ✅ API usage tracking
   - ✅ Agent workflows (query, filter, analyze)

2. **Appointments** (`src/__tests__/integration/appointments.test.ts`)
   - ✅ Fetch appointments by date range
   - ✅ Limit parameter
   - ✅ Cache behavior (1-hour TTL)
   - ✅ Force refresh
   - ✅ OpenAPI spec validation
   - ✅ Bookable items
   - ✅ Agent workflows (analysis, busy slots)

3. **Sales Export** (`src/__tests__/integration/sales-export.test.ts`)
   - ✅ Date range exports
   - ✅ Automatic date chunking (7-day segments)
   - ✅ CSV file generation
   - ✅ Empty date handling
   - ✅ Sync logging
   - ✅ Agent workflows (trends, revenue, top clients)

---

## Running Tests

### Quick Reference

```bash
# Development (run frequently)
bun test              # Unit tests only
bun test:watch        # Auto-run unit tests on changes

# Pre-commit
bun test:unit         # Verify all unit tests pass

# Pre-release / Major features
bun test:integration  # All integration tests (~50-100 API calls)
bun test:all          # Unit + Integration

# Focused integration testing
bun test:integration:clients       # ~5-10 API calls
bun test:integration:appointments  # ~10-15 API calls
bun test:integration:sales        # ~10-20 API calls

# Utilities
bun test:connectivity # Validate sandbox connection
bun test:coverage     # Generate coverage report
```

### Recommended Workflow

```
┌─────────────────────┐
│ During Development  │  → bun test:watch
└─────────────────────┘

┌─────────────────────┐
│ Before Commit       │  → bun test:unit
└─────────────────────┘

┌─────────────────────┐
│ Before Release      │  → bun test:all
└─────────────────────┘

┌─────────────────────┐
│ Weekly (scheduled)  │  → bun test:integration
└─────────────────────┘
```

---

## OpenAPI Spec-Based Testing

### Why Use the OpenAPI Spec?

The project has access to the **official Mindbody Public API v6 OpenAPI specification**:
- **Location:** `api-specs/mindbody-public-api-v6.json`
- **Size:** 707KB, 141 endpoints, 385 schemas
- **Accuracy:** 100% accurate (official from Mindbody)

This enables:
1. **Type-safe mocks** - Generate TypeScript types from spec
2. **Accurate test data** - Mock responses match real API structure
3. **Contract validation** - Catch API changes early
4. **Fast tests** - No network calls needed

### Example: Spec-Based Mock

```typescript
// ❌ OLD: Guessed mock (inaccurate)
const mockAppointment = {
  Id: "12345",              // Wrong: should be number
  Client: { ... },          // Wrong: doesn't exist in API
  Location: { ... },        // Wrong: doesn't exist in API
};

// ✅ NEW: Spec-based mock (accurate)
import { Appointment } from "../../api-specs/mindbody-api-types.js";

const mockAppointment: Appointment = {
  Id: 12345,                // ✅ Correct: number (int64)
  ClientId: "100000001",    // ✅ Correct: string
  StaffId: 101,             // ✅ Correct: number (int64)
  LocationId: 1,            // ✅ Correct: number (int32)
  Staff: {                  // ✅ Correct: nested Staff object
    Id: 101,
    FirstName: "Jane",
    LastName: "Smith",
    DisplayName: "Jane Smith",
  },
  // No Client, Location, SessionType objects (they don't exist)
  Duration: 60,
  FirstAppointment: false,
  // ... all fields from OpenAPI spec
};
```

### Type Generation from Spec

See `api-specs/README.md` for:
- Regenerating types from spec
- Comparing spec vs codebase types
- Migration checklist

---

## Integration Testing Details

### Purpose

Integration tests validate that MCP tools work correctly **as an AI agent would use them**:

1. **End-to-end workflows** - Tool invocation → API call → Database → Response
2. **Real API behavior** - Catches issues that mocks can't (rate limits, auth, pagination)
3. **Agent use cases** - Tests realistic scenarios (sync then analyze, fetch then filter)

### Test Structure

```typescript
import {
  setupIntegrationTest,
  teardownIntegrationTest,
  assertMcpToolResponse,
  extractResponseText,
  getApiUsageStats,
} from "./test-helpers.js";

describe("Integration: My Feature", () => {
  let context: IntegrationTestContext;

  beforeAll(async () => {
    // Spins up real components
    context = await setupIntegrationTest();
  });

  afterAll(async () => {
    // Cleans up database, files
    await teardownIntegrationTest(context);
  });

  test("should execute tool as agent would", async () => {
    // Call MCP tool with real API
    const response = await handleMyTool({ ... }, context.myService);

    // Validate MCP response format
    assertMcpToolResponse(response);

    // Validate data was persisted
    const data = context.db.getMyData();
    expect(data.length).toBeGreaterThan(0);
  });

  test("should enable agent to analyze data", async () => {
    // Multi-step agent workflow
    await handleMyTool({ ... }, context.myService);
    const data = context.db.getMyData();
    const analysis = analyzeData(data);

    expect(analysis).toBeDefined();
  });
});
```

### API Usage Budget

| Test Suite | API Calls | Frequency |
|------------|-----------|-----------|
| Client sync | 5-10 | Pre-release |
| Appointments | 10-15 | Pre-release |
| Sales export | 10-20 | Pre-release |
| **Total** | **~50** | **Per full run** |

**Sandbox Limits:**
- Free tier: 1,000 calls/day
- Cost: $0 (sandbox is free)
- Reset: Daily at midnight UTC

**Monthly estimate:**
- Weekly integration tests: ~200 calls/month
- Pre-release tests: ~50 calls per release
- **Total:** Well under 1,000 calls/day limit

---

## Test Helpers & Utilities

### Integration Test Helpers

Located in `src/__tests__/integration/test-helpers.ts`:

| Helper | Purpose |
|--------|---------|
| `setupIntegrationTest()` | Creates real components (DB, API client, services) |
| `teardownIntegrationTest()` | Cleans up resources (close DB, delete files) |
| `assertMcpToolResponse()` | Validates MCP response structure |
| `extractResponseText()` | Extracts text from MCP response |
| `parseResponseJson<T>()` | Parses JSON from MCP response |
| `getApiUsageStats()` | Gets current API quota usage |
| `waitFor()` | Waits for async conditions |

### Example Usage

```typescript
// Setup
const context = await setupIntegrationTest();

// Execute tool
const response = await handleMyTool({ ... }, context.myService);

// Validate response
assertMcpToolResponse(response);
const text = extractResponseText(response);
expect(text).toContain("success");

// Check API usage
const stats = getApiUsageStats(context);
console.log(`API calls used: ${stats.callsMade}`);

// Cleanup
await teardownIntegrationTest(context);
```

---

## Debugging Tests

### Check Sandbox Connection

```bash
bun test:connectivity
```

Output:
```
✓ Load and validate environment variables
✓ Obtain user token from staff credentials
✓ Check API usage quota
✓ GET /client/clients
✓ GET /appointment/appointments
✓ GET /appointment/bookableItems
✓ POST /client/updateclient (dry-run)

Total Tests: 7
Passed: 7
Failed: 0
```

### View Test Output

```bash
# Verbose output
bun test --verbose

# Show console logs
bun test 2>&1 | grep "console.log"

# Debug specific test
bun test src/__tests__/integration/client-sync.test.ts
```

### Inspect Database

```typescript
// Add to any test
const clients = context.db.getClients();
console.log(`Clients: ${clients.length}`);

const summary = context.db.getCacheSummary();
console.log(`Cache:`, summary);

const logs = context.db.getSyncLogs();
console.log(`Sync logs:`, logs.length);
```

---

## CI/CD Integration

### GitHub Actions

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
      - run: bun test:unit

  integration-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test:integration
        env:
          MBO_API_KEY: ${{ secrets.MBO_API_KEY }}
          # ... other secrets
```

### Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash
echo "Running unit tests..."
bun test:unit

if [ $? -ne 0 ]; then
  echo "❌ Unit tests failed. Commit aborted."
  exit 1
fi

echo "✅ Tests passed"
```

---

## Future Test Coverage

### Planned Tests

1. **Write Operations**
   - `write_client_profile` tool
   - Dry-run mode validation
   - Error handling

2. **Formula Notes**
   - `analyze_formula_notes` tool
   - SOAP note parsing

3. **Multi-tool Workflows**
   - Sync → Fetch → Analyze
   - Export → Identify → Update

4. **Error Recovery**
   - Rate limit hit mid-sync
   - Token expiry
   - Network failures

5. **Performance**
   - Large data set pagination
   - Cache hit ratios
   - Memory usage

---

## Best Practices

### When Writing Unit Tests

✅ **DO:**
- Use OpenAPI spec-based types and mocks
- Test business logic and transformations
- Test error handling
- Test edge cases
- Run frequently (on every change)

❌ **DON'T:**
- Make real API calls
- Test framework code (Bun, Zod, etc.)
- Test external library behavior
- Skip error cases

### When Writing Integration Tests

✅ **DO:**
- Test as an agent would use tools
- Test multi-step workflows
- Track API usage
- Handle empty sandbox data gracefully
- Set appropriate timeouts (30-60s)

❌ **DON'T:**
- Run on every commit (too slow)
- Test individual functions (use unit tests)
- Assume sandbox has specific data
- Leave test databases/files behind

---

## Resources

- **Integration Test Guide:** `src/__tests__/integration/README.md`
- **OpenAPI Spec:** `api-specs/mindbody-public-api-v6.json`
- **Type Definitions:** `api-specs/mindbody-api-types.ts`
- **Schema Comparison:** `api-specs/API_SCHEMA_COMPARISON.md`
- **Connectivity Test:** `src/test-connectivity.ts`

---

## Questions?

**Q: Should I write unit or integration tests for my feature?**
A: Write unit tests first (spec-based mocks), then add integration test if it's a new MCP tool.

**Q: How often should I run integration tests?**
A: Pre-release, after major features, weekly scheduled. Not on every commit.

**Q: Can I test write operations?**
A: Yes, but use dry-run mode or test account data only.

**Q: What if tests fail due to sandbox being down?**
A: Integration tests may fail. Check Mindbody status. Unit tests should still pass.

**Q: How do I add a new integration test?**
A: See `src/__tests__/integration/README.md` for step-by-step guide.

---

**Last Updated:** 2025-11-24
**Test Coverage:** 95% unit, 5% integration
**API Budget:** ~50-100 calls per full integration test run
