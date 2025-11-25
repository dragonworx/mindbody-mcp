# Scrum Master Guidelines - Mindbody MCP Server (Hybrid Architecture)

**Version:** 2.0.0 (Major Architecture Revision)
**Last Updated:** 2024-11-26
**Architecture:** Generic API wrapper with intelligent middleware
**Purpose:** Guidelines for implementing the hybrid MCP server that exposes all Mindbody API endpoints with intelligent handling

---

## Table of Contents

1. [AI Agent Initialization](#ai-agent-initialization)
2. [Project Overview](#project-overview)
3. [Architecture Philosophy](#architecture-philosophy)
4. [Tech Stack](#tech-stack)
5. [Core Architecture Components](#core-architecture-components)
6. [Endpoint Metadata Specification](#endpoint-metadata-specification)
7. [Intelligence Layer Configuration](#intelligence-layer-configuration)
8. [Testing Standards](#testing-standards)
9. [Code Quality Standards](#code-quality-standards)
10. [Definition of Done](#definition-of-done)
11. [Workflow Process](#workflow-process)
12. [File Structure](#file-structure)

---

## AI Agent Initialization

### CRITICAL DIRECTIVES

**IMPORTANT: AI agents MUST follow these rules:**

1. **NO GIT OPERATIONS**: Do not stage, commit, or perform any git operations
2. **NO JSDOC COMMENTS**: Do not add JSDoc comments - code should be self-documenting
3. **ALWAYS REFERENCE API SPEC**: When defining endpoint metadata, consult `api-specs/mindbody-public-api-v6.json`
4. **GENERIC OVER CUSTOM**: Never write custom logic per endpoint - use metadata-driven approach

### Start Here: Working on This Project

When starting a new session:

```
You are working on the Mindbody MCP Server (Hybrid Architecture).

Task: Implement the next incomplete story from @AGILE_PLAN.md

Process:
1. Find the current sprint (first sprint with incomplete stories)
2. Select the first incomplete story in that sprint
3. Implement following @SCRUM_MASTER.md workflow and standards
4. Mark the story complete when Definition of Done is satisfied
```

### Story Selection Priority

1. **Work sequentially through sprints** - Sprint 1 first
2. **Within sprints, work in order** - First unchecked story
3. **Sprint 1 is critical** - Infrastructure must be complete before endpoints
4. **Confirm before starting** - State story ID and name

---

## Project Overview

The Mindbody MCP Server is a **generic API wrapper** that exposes all 95+ Mindbody Public API endpoints as MCP tools with intelligent middleware handling caching, pagination, rate limiting, and token management.

**Core Goals:**
- Expose 100% of Mindbody API endpoints (95+) as MCP tools
- Enable AI agents to orchestrate complex workflows
- Provide transparent intelligence layer for optimization
- Achieve 100% API coverage in 8 weeks (38 stories)

**Key Innovation:**
- **Agent determines "why" and "what"** (business logic)
- **Server provides "how"** (transport with intelligence)
- **Generic handler** - one implementation for all endpoints

---

## Architecture Philosophy

### Agent Orchestrates, Server Executes

```
┌─────────────────────────────────────┐
│  AI Agent (Claude)                   │
│  - Determines business logic         │
│  - Orchestrates multi-step workflows│
│  - Handles edge cases and decisions │
└──────────────┬──────────────────────┘
               │ MCP Protocol
               ↓
┌─────────────────────────────────────┐
│  MCP Server (This Project)           │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ Dynamic Tool Registration      │ │
│  │ (Auto-generated from metadata) │ │
│  └────────────┬───────────────────┘ │
│               ↓                      │
│  ┌────────────────────────────────┐ │
│  │ Generic Request Handler        │ │
│  └────────────┬───────────────────┘ │
│               ↓                      │
│  ┌────────────────────────────────┐ │
│  │ Intelligence Layer             │ │
│  │ • Caching (auto, per-endpoint) │ │
│  │ • Pagination (optional flag)   │ │
│  │ • Rate limiting (always on)    │ │
│  │ • Token refresh (auto-retry)   │ │
│  └────────────┬───────────────────┘ │
└───────────────┼─────────────────────┘
                ↓ HTTPS
┌─────────────────────────────────────┐
│  Mindbody Public API v6             │
└─────────────────────────────────────┘
```

### Design Principles

1. **Generic Over Custom** - Never write endpoint-specific logic
2. **Metadata-Driven** - All endpoint behavior defined in metadata
3. **Intelligence is Transparent** - Features work without agent awareness
4. **Optional Flags** - Agent controls auto_paginate, use_cache, dry_run
5. **Single Handler** - One implementation routes all tool calls

---

## Tech Stack

### Core Technologies

**Runtime & Language:**
- **Bun** - JavaScript runtime and package manager
- **TypeScript** - Strict mode enabled
- **Node.js compatibility** - Support where Bun unavailable

**Frameworks & Libraries:**
- **MCP SDK** - Model Context Protocol implementation
- **Zod** - Schema validation (for metadata AND input validation)

**Database & Caching:**
- **SQLite** - Local cache and rate limit tracking
- **Better-SQLite3** - Synchronous SQLite bindings

**Testing:**
- **Bun Test** - Primary test runner
- **Mock data** - No external API calls in tests

---

## Core Architecture Components

### 1. Endpoint Metadata Registry

**Purpose:** Central source of truth for all API endpoints

**Responsibilities:**
- Store metadata for 95+ endpoints
- Support querying by name or category
- Enable dynamic tool generation
- Validate metadata structure

**Key Files:**
- `src/metadata/schema.ts` - Metadata TypeScript types
- `src/metadata/registry.ts` - Registry class
- `src/metadata/endpoints/*.ts` - Endpoint definitions by category

### 2. Generic Request Handler

**Purpose:** Single handler that can call any Mindbody endpoint

**Responsibilities:**
- Accept endpoint metadata + parameters
- Build HTTP request from metadata
- Integrate intelligence layer
- Transform responses
- Handle errors

**Key Files:**
- `src/services/genericApiHandler.ts`
- `src/services/genericApiHandler.test.ts`

### 3. Intelligence Layer

**Purpose:** Transparent optimization features

**Components:**
- **Caching** - Auto-cache GET requests with configurable TTL
- **Pagination** - Optional auto-pagination for large datasets
- **Rate Limiting** - Enforce 1,000 calls/day limit
- **Token Management** - Auto-refresh on 401/403, retry request

**Key Files:**
- `src/services/caching.ts`
- `src/services/pagination.ts`
- `src/services/rateLimit.ts`
- `src/services/auth.ts` (existing)

### 4. Dynamic Tool Registration

**Purpose:** Auto-generate MCP tools from metadata

**Responsibilities:**
- Read endpoint registry
- Convert metadata to MCP tool definitions
- Generate inputSchema from Zod schemas
- Register all tools in MCP server

**Key Files:**
- `src/mcp/toolGenerator.ts`
- `src/mcp/handlers/genericToolHandler.ts`

---

## Endpoint Metadata Specification

### Metadata Structure

Every endpoint MUST have metadata defining:

```typescript
interface EndpointMetadata {
  // Identity
  name: string;                    // Tool name (e.g., "get_clients")
  category: EndpointCategory;      // client | appointment | class | sale | staff | site | enrollment | payroll

  // HTTP Configuration
  endpoint: string;                // API path (e.g., "/client/clients")
  method: HTTPMethod;              // GET | POST | PUT | DELETE

  // Documentation
  description: string;             // Concise description for agents

  // Input Validation
  inputSchema: z.ZodObject<any>;   // Zod schema for parameter validation

  // Intelligence Configuration
  intelligence: {
    cacheable: boolean;            // Enable caching for GET requests
    cacheTTL?: number;             // TTL in seconds (if cacheable)
    supportsPagination: boolean;   // Endpoint returns PaginationResponse
    requiresConfirmation: boolean; // Mutation requires dry-run first
    invalidatesCache?: string[];   // Cache keys to invalidate on success
  };

  // Response Configuration
  responseTransform?: (data: any) => any;  // Optional response transformation
}
```

### Example: GET /client/clients

```typescript
import { z } from 'zod';

export const getClientsMetadata: EndpointMetadata = {
  name: 'get_clients',
  category: 'client',
  endpoint: '/client/clients',
  method: 'GET',
  description: 'Retrieves clients with optional filtering and pagination. Results cached for 1 hour.',

  inputSchema: z.object({
    searchText: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.number().min(1).max(200).default(100),
    offset: z.number().min(0).default(0),
    auto_paginate: z.boolean().default(false),
    use_cache: z.boolean().default(true),
    force: z.boolean().default(false),
  }),

  intelligence: {
    cacheable: true,
    cacheTTL: 3600, // 1 hour
    supportsPagination: true,
    requiresConfirmation: false,
  },
};
```

### Example: POST /client/addclient

```typescript
export const addClientMetadata: EndpointMetadata = {
  name: 'add_client',
  category: 'client',
  endpoint: '/client/addclient',
  method: 'POST',
  description: 'Creates a new client account. Requires FirstName, LastName, and Email.',

  inputSchema: z.object({
    FirstName: z.string().min(1),
    LastName: z.string().min(1),
    Email: z.string().email(),
    MobilePhone: z.string().optional(),
    AddressLine1: z.string().optional(),
    City: z.string().optional(),
    State: z.string().optional(),
    PostalCode: z.string().optional(),
    dry_run: z.boolean().default(true),
    force: z.boolean().default(false),
  }),

  intelligence: {
    cacheable: false,
    supportsPagination: false,
    requiresConfirmation: true,
    invalidatesCache: ['/client/clients:*'], // Wildcard invalidation
  },
};
```

### Cache TTL Guidelines

| Data Type | TTL | Examples |
|-----------|-----|----------|
| Static | 604800s (1 week) | countries, genders, referral types |
| Semi-static | 86400s (24 hours) | staff, locations, programs, bookable items |
| Dynamic | 3600s (1 hour) | clients, appointments, classes |
| Real-time | 300s (5 minutes) | availability, shopping cart |
| Transactional | No cache | purchases, bookings, updates |

---

## Intelligence Layer Configuration

### 1. Caching

**When:**
- **Always** for GET requests (unless use_cache=false)
- **Never** for POST/PUT/DELETE requests

**How:**
```typescript
// Before API call
if (metadata.method === 'GET' && params.use_cache !== false) {
  const cached = await cache.get(cacheKey);
  if (cached) return cached;
}

// After successful API call
if (metadata.intelligence.cacheable) {
  await cache.set(cacheKey, response, metadata.intelligence.cacheTTL);
}
```

**Cache Key Generation:**
```typescript
function generateCacheKey(endpoint: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .filter(k => !['auto_paginate', 'use_cache', 'force', 'dry_run'].includes(k))
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');

  return `${endpoint}:${hashString(sortedParams)}`;
}
```

### 2. Auto-Pagination

**When:**
- Endpoint has `supportsPagination: true`
- Agent passes `auto_paginate: true` flag

**How:**
```typescript
if (metadata.intelligence.supportsPagination && params.auto_paginate) {
  const allResults = [];
  let offset = 0;
  const limit = params.limit || 100;

  while (true) {
    const response = await makeRequest({ ...params, limit, offset });
    const data = extractData(response);
    allResults.push(...data);

    // Check if done
    if (data.length < limit) break;
    if (response.PaginationResponse &&
        offset + data.length >= response.PaginationResponse.TotalResults) break;

    offset += limit;
  }

  return { results: allResults, totalFetched: allResults.length };
}
```

### 3. Rate Limiting

**When:** Before EVERY API request (including retries)

**How:**
```typescript
// Before API call
await rateLimitGuard.checkLimit(params.force);

// After API call
rateLimitGuard.recordCall();

// After retry
rateLimitGuard.recordCall(); // Count retry separately
```

**Configuration:**
- Default limit: 950 calls/day (safety buffer)
- Configurable via `DAILY_API_LIMIT_OVERRIDE`
- Force flag bypasses limit (use cautiously)

### 4. Token Refresh & Retry

**When:** Response status is 401 or 403

**How:**
```typescript
const response = await fetch(url, { headers });

if (response.status === 401 || response.status === 403) {
  authService.invalidateToken();
  const newToken = await authService.getUserToken();

  // Retry with new token
  const retryResponse = await fetch(url, {
    headers: { ...headers, Authorization: `Bearer ${newToken}` }
  });

  rateLimitGuard.recordCall(); // Count retry
  return retryResponse;
}
```

---

## Testing Standards

### Test Coverage Requirements

- **Infrastructure (EP-1):** 95%+ coverage
- **Endpoint Metadata:** 90%+ coverage per category
- **Integration Tests:** End-to-end flow verification

### Test Structure

**Unit Tests:**
- Test each infrastructure component in isolation
- Mock all external dependencies (API, cache, database)
- Test happy paths, error paths, edge cases

**Integration Tests:**
- Test complete request flow with sample endpoints
- Verify intelligence features work together
- Use mock API responses (no real API calls)

### Example Unit Test Structure

```typescript
import { describe, test, expect, beforeEach, mock } from 'bun:test';

describe('GenericApiHandler', () => {
  let handler: GenericApiHandler;
  let mockCache: MockCacheAdapter;
  let mockAuth: MockAuthService;
  let mockRateLimit: MockRateLimitGuard;

  beforeEach(() => {
    mockCache = new MockCacheAdapter();
    mockAuth = new MockAuthService();
    mockRateLimit = new MockRateLimitGuard();
    handler = new GenericApiHandler(mockCache, mockAuth, mockRateLimit);
  });

  describe('GET requests with caching', () => {
    test('should return cached data when available', async () => {
      const metadata = getClientsMetadata;
      const params = { limit: 100, offset: 0 };
      const cachedData = [{ id: '1', name: 'John' }];

      mockCache.get = mock(() => Promise.resolve(cachedData));

      const result = await handler.request(metadata, params);

      expect(result).toEqual(cachedData);
      expect(mockCache.get).toHaveBeenCalledTimes(1);
      expect(mockAuth.getUserToken).not.toHaveBeenCalled(); // No API call
    });

    test('should fetch from API and cache when cache misses', async () => {
      const metadata = getClientsMetadata;
      const params = { limit: 100, offset: 0 };
      const apiData = { Clients: [{ Id: '1', FirstName: 'John' }] };

      mockCache.get = mock(() => Promise.resolve(null));
      mockAuth.getUserToken = mock(() => Promise.resolve('test-token'));
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(apiData),
      }));

      const result = await handler.request(metadata, params);

      expect(result).toEqual(apiData);
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        apiData,
        3600 // cacheTTL
      );
    });
  });

  describe('Auto-pagination', () => {
    test('should fetch all pages when auto_paginate=true', async () => {
      const metadata = getClientsMetadata;
      const params = { limit: 100, offset: 0, auto_paginate: true };

      // Mock two pages of results
      const page1 = { Clients: Array(100).fill({ Id: 'test' }) };
      const page2 = { Clients: Array(50).fill({ Id: 'test' }) };

      global.fetch = mock()
        .mockReturnValueOnce(Promise.resolve({
          ok: true,
          json: () => Promise.resolve(page1),
        }))
        .mockReturnValueOnce(Promise.resolve({
          ok: true,
          json: () => Promise.resolve(page2),
        }));

      const result = await handler.request(metadata, params);

      expect(result.results).toHaveLength(150);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockRateLimit.recordCall).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    test('should refresh token and retry on 401', async () => {
      const metadata = getClientsMetadata;
      const params = { limit: 100 };

      mockAuth.getUserToken = mock()
        .mockReturnValueOnce(Promise.resolve('expired-token'))
        .mockReturnValueOnce(Promise.resolve('new-token'));

      global.fetch = mock()
        .mockReturnValueOnce(Promise.resolve({ status: 401, ok: false }))
        .mockReturnValueOnce(Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ Clients: [] }),
        }));

      await handler.request(metadata, params);

      expect(mockAuth.invalidateToken).toHaveBeenCalledTimes(1);
      expect(mockAuth.getUserToken).toHaveBeenCalledTimes(2);
      expect(mockRateLimit.recordCall).toHaveBeenCalledTimes(2); // Both calls counted
    });
  });
});
```

---

## Code Quality Standards

### TypeScript Standards

**Critical Rules:**
- **NO `any` types** (except in tests when absolutely necessary)
- **Strict mode enabled** in tsconfig.json
- **Use `unknown` for truly unknown types**, then narrow with type guards
- **Use Zod for runtime validation** - never trust input

### Error Handling

**Standard Error Format:**
```typescript
class MindbodyAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'MindbodyAPIError';
  }
}

// Usage
throw new MindbodyAPIError(
  'Failed to fetch clients',
  500,
  '/client/clients',
  error
);
```

### Logging Standards

Use standard console methods:
- `console.log()` for info
- `console.error()` for errors
- Include context in messages

```typescript
console.log('Fetching clients', { limit, offset, cacheHit: false });
console.error('API request failed', { endpoint, statusCode, error });
```

### Code Formatting

**Always run Prettier before completing a story:**
```bash
bun run format
```

---

## Definition of Done

A story is DONE when ALL of the following are complete:

- [ ] **Implementation**
  - [ ] All acceptance criteria met
  - [ ] Metadata-driven approach used (no custom logic per endpoint)
  - [ ] Input validation using Zod schemas
  - [ ] Intelligence layer integrated appropriately
  - [ ] Error handling with descriptive messages

- [ ] **Testing**
  - [ ] Unit tests achieve required coverage (95% infra, 90% endpoints)
  - [ ] Tests pass consistently
  - [ ] External dependencies mocked
  - [ ] Edge cases covered

- [ ] **Code Quality**
  - [ ] No TypeScript errors
  - [ ] No `any` types (except tests)
  - [ ] Prettier formatting applied
  - [ ] Code follows file structure guidelines

- [ ] **Integration**
  - [ ] Tools registered and functional (for endpoint stories)
  - [ ] Story marked complete in AGILE_PLAN.md

---

## Workflow Process

### Story Implementation Workflow

#### 1. Analysis (Infrastructure Stories)
- [ ] Understand component responsibilities
- [ ] Identify dependencies on other components
- [ ] Plan integration points

#### 1. Analysis (Endpoint Stories)
- [ ] Consult `api-specs/mindbody-public-api-v6.json`
- [ ] Identify required parameters and optional parameters
- [ ] Determine appropriate cache TTL
- [ ] Check if endpoint supports pagination

#### 2. Implementation (Infrastructure Stories)
- [ ] Create TypeScript interfaces and types
- [ ] Implement core logic with error handling
- [ ] Integrate with other components
- [ ] Add unit tests

#### 2. Implementation (Endpoint Stories)
- [ ] Create endpoint metadata objects
- [ ] Define Zod input schemas
- [ ] Set intelligence configuration
- [ ] Add to endpoint registry
- [ ] Create unit tests for metadata validation

#### 3. Testing
- [ ] Write comprehensive unit tests
- [ ] Test happy paths
- [ ] Test error paths
- [ ] Test edge cases
- [ ] Verify coverage target met

#### 4. Completion
- [ ] Review Definition of Done checklist
- [ ] Run Prettier
- [ ] Mark story complete in AGILE_PLAN.md

---

## File Structure

```
mindbody-mcp/
├── src/
│   ├── index.ts                      # Main entry point
│   ├── server.ts                     # MCP server setup
│   │
│   ├── metadata/
│   │   ├── schema.ts                 # Metadata TypeScript types
│   │   ├── registry.ts               # Central registry
│   │   ├── types.ts                  # Shared types
│   │   └── endpoints/
│   │       ├── client.ts             # 20 client endpoints
│   │       ├── appointment.ts        # 12 appointment endpoints
│   │       ├── class.ts              # 15 class endpoints
│   │       ├── sale.ts               # 15 sale endpoints
│   │       ├── staff.ts              # 8 staff endpoints
│   │       ├── site.ts               # 12 site endpoints
│   │       ├── enrollment.ts         # 6 enrollment endpoints
│   │       └── payroll.ts            # 5 payroll endpoints
│   │
│   ├── services/
│   │   ├── genericApiHandler.ts      # Core request handler
│   │   ├── genericApiHandler.test.ts
│   │   ├── caching.ts                # Caching logic
│   │   ├── caching.test.ts
│   │   ├── pagination.ts             # Auto-pagination logic
│   │   ├── pagination.test.ts
│   │   ├── auth.ts                   # Token management (existing)
│   │   ├── rateLimit.ts              # Rate limiting (existing)
│   │   └── responseTransformer.ts    # Response normalization
│   │
│   ├── mcp/
│   │   ├── toolGenerator.ts          # Auto-generate tools from metadata
│   │   ├── toolGenerator.test.ts
│   │   └── handlers/
│   │       ├── genericToolHandler.ts # Single handler for all tools
│   │       └── genericToolHandler.test.ts
│   │
│   ├── errors/
│   │   ├── types.ts                  # Custom error classes
│   │   └── handlers.ts               # Error handling utilities
│   │
│   ├── database/
│   │   ├── schema.sql                # SQLite schema (existing)
│   │   └── client.ts                 # Database client (existing)
│   │
│   └── __tests__/
│       ├── fixtures/
│       │   ├── clientData.ts         # Mock client responses
│       │   ├── appointmentData.ts    # Mock appointment responses
│       │   └── ...
│       └── integration/
│           └── infrastructure.test.ts # End-to-end tests
│
├── api-specs/
│   └── mindbody-public-api-v6.json   # Official API spec (REFERENCE THIS!)
│
├── docs/
│   ├── INFRASTRUCTURE.md             # How to use the infrastructure
│   └── endpoints/
│       ├── CLIENT.md                 # Client endpoints reference
│       ├── APPOINTMENT.md            # Appointment endpoints reference
│       └── ...
│
├── .env.example
├── package.json
├── tsconfig.json
├── .prettierrc
├── README.md
├── AGILE_PLAN.md                     # Sprint planning (38 stories)
└── SCRUM_MASTER.md                   # This file
```

---

## Quick Reference

### Command Cheatsheet

```bash
# Development
bun run dev              # Start development server
bun run build            # Build for production
bun run start            # Start production server

# Testing
bun test                 # Run all tests
bun test --coverage      # Run tests with coverage
bun test <file>          # Run specific test file
bun test --watch         # Watch mode

# Code Quality
bun run format           # Format code with Prettier
bun run type-check       # Check TypeScript types
```

### Story Estimation Guide

- **2-3 points**: Simple metadata definition (5-8 endpoints)
- **5 points**: Complex component or metadata group (10+ endpoints)
- **8 points**: Core infrastructure component
- **13 points**: Comprehensive testing suite

### Coverage Targets by Epic

| Epic | Target Coverage |
|------|----------------|
| EP-1: Infrastructure | 95%+ |
| EP-2: Client | 90%+ |
| EP-3: Appointment | 90%+ |
| EP-4: Class | 90%+ |
| EP-5: Sale | 95%+ |
| EP-6: Staff | 90%+ |
| EP-7: Site | 85%+ |
| EP-8: Enrollment & Payroll | 85%+ |

---

## Key Differences from Old Architecture

### What Changed

| Aspect | Old Approach | New Approach |
|--------|--------------|--------------|
| **Stories** | 83 custom tools | 38 metadata definitions |
| **Timeline** | 12 weeks | 8 weeks |
| **Complexity** | High (custom per endpoint) | Low (metadata-driven) |
| **Adapter Pattern** | Required for everything | Not needed |
| **Service Layer** | Custom per category | Single generic handler |
| **Agent Role** | Limited orchestration | Full orchestration |
| **Maintenance** | High (95+ custom functions) | Low (metadata + 1 handler) |

### What Stayed the Same

- Caching strategy (TTLs, invalidation)
- Rate limiting (1,000/day limit)
- Token management (auto-refresh + retry)
- Testing standards (unit tests only, 90%+ coverage)
- MCP protocol integration
- SQLite for cache and rate limiting

---

## Conclusion

This hybrid architecture achieves 100% Mindbody API coverage in **8 weeks instead of 12** by using a **metadata-driven generic handler** instead of custom logic per endpoint. The agent orchestrates workflows while the server provides intelligent transport, resulting in a maintainable, scalable, and powerful MCP server.

**When in doubt:**
1. Check AGILE_PLAN.md for what to implement
2. Check this document for how to implement it
3. Reference api-specs/mindbody-public-api-v6.json for endpoint details

---

## License

MIT
