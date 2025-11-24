# Scrum Master Guidelines - Mindbody MCP Server

**Version:** 1.0.0
**Last Updated:** 2024-11-24
**Purpose:** This document provides comprehensive guidelines for AI agents working on the Mindbody MCP Server project to ensure consistent, high-quality, and deterministic implementation across all user stories and features.

---

## Table of Contents

1. [AI Agent Initialization](#ai-agent-initialization)
2. [Project Overview](#project-overview)
3. [Tech Stack](#tech-stack)
4. [Architecture Principles](#architecture-principles)
5. [Testing Standards](#testing-standards)
6. [API Integration Guidelines](#api-integration-guidelines)
7. [Caching Strategy](#caching-strategy)
8. [AI/Agentic Behavior Configuration](#aiagentic-behavior-configuration)
9. [MCP Server Standards](#mcp-server-standards)
10. [Code Quality Standards](#code-quality-standards)
11. [Documentation Requirements](#documentation-requirements)
12. [Definition of Done](#definition-of-done)
13. [Workflow Process](#workflow-process)
14. [File Structure](#file-structure)

---

## AI Agent Initialization

### CRITICAL DIRECTIVES

**IMPORTANT: AI agents MUST follow these rules:**

1. **NO GIT OPERATIONS**: Do not stage, commit, or perform any git operations. The developer will handle all version control.
2. **NO JSDOC COMMENTS**: Do not add JSDoc comments to any code. This codebase is designed for rapid refactoring and human-readable documentation wastes tokens and time.
3. **ALWAYS REFERENCE API SPEC**: When implementing any Mindbody API endpoint, you MUST consult `api-specs/mindbody-public-api-v6.json` for correct endpoint paths, parameters, and response structures. This is critical for functionality.

### Start Here: Working on This Project

When starting a new session to contribute to the Mindbody MCP Server, use these instructions to identify and implement your next task.

### Standard Prompt Template

```
You are working on the Mindbody MCP Server project.

Task: Implement the next incomplete story from @AGILE_PLAN.md

Process:
1. Find the current sprint (first sprint with incomplete stories)
2. Select the first incomplete story in that sprint
3. Implement following @SCRUM_MASTER.md workflow and standards
4. Mark the story complete when Definition of Done is satisfied
```

### Story Selection Priority

**Rules for selecting work:**

1. **Work sequentially through sprints**
   - Start with Sprint 1, then Sprint 2, then Sprint 3, etc.
   - Complete all stories in a sprint before moving to the next sprint

2. **Within each sprint, work in order**
   - Stories are listed in implementation order
   - Select the first story with an unchecked `- [ ]` checkbox
   - Do not skip stories unless blocked by dependencies

3. **Check for dependencies**
   - Some stories depend on database schemas or adapters from previous stories
   - If a story requires infrastructure that doesn't exist, implement dependencies first
   - Infrastructure stories (database schemas, adapters) are typically listed early in each sprint

4. **Confirm before starting**
   - Always state the story ID and name before beginning implementation
   - Example: "I will implement EP1-S01: View Appointment List Tool"
   - This ensures clarity and prevents duplicate work

### What Success Looks Like

When you complete a story, you should have:

- ✅ All acceptance criteria met
- ✅ >90% test coverage (or >85% for non-critical features)
- ✅ All code following architecture principles (adapters, versioning, caching)
- ✅ Story marked complete in AGILE_PLAN.md with `- [x]`
- ✅ Progress tracking section updated

### Quick Start Example

**You say:** "Implement the next story from AGILE_PLAN.md following SCRUM_MASTER.md"

**Agent responds:**
```
Analyzing AGILE_PLAN.md...

Current Sprint: Sprint 1 (Foundation - Appointments & Classes Read Operations)
Next Story: EP1-S01 - View Appointment List Tool (5 points)

I will implement this story following the workflow process:
1. Analysis - Understanding requirements and dependencies
2. Design - Planning adapters, cache strategy, and tests
3. Implementation - Building the feature
4. Testing - Achieving >90% coverage
5. Completion - Review and mark story as done

Starting implementation...
```

---

## Project Overview

The Mindbody MCP Server is a Model Context Protocol (MCP) server that provides AI agents with comprehensive access to the Mindbody API. It enables agentic workflows for managing appointments, classes, sales, clients, staff, and more through a well-structured, cached, and versioned interface.

**Core Goals:**
- Provide full MCP tool coverage for Mindbody API (83 user stories across 8 epics)
- Enable efficient AI agent interactions with fitness/wellness business data
- Maintain robust caching to minimize API calls and token usage
- Support versioned API implementations for backward compatibility
- Deliver production-ready, well-tested code with >90% coverage

---

## Tech Stack

### Core Technologies

**Runtime & Language:**
- **Bun** - JavaScript runtime and package manager
- **TypeScript** - Primary language (strict mode enabled)
- **Node.js compatibility** - Support Node.js environments where Bun unavailable

**Frameworks & Libraries:**
- **Mastra** - Agentic behavior, workflows, and AI model management
- **MCP SDK** - Model Context Protocol implementation
- **Zod** - Schema validation and type safety

**Database & Caching:**
- **SQLite** - Local database for caching and data persistence
- **Better-SQLite3** - Synchronous SQLite bindings

**Testing:**
- **Bun Test** - Primary test runner
- **Mock Service Worker (MSW)** or similar - API mocking

**AI/LLM:**
- **Configurable providers** - OpenAI, Anthropic, etc. via Mastra
- **Model flexibility** - Support multiple models per provider

---

## Architecture Principles

### 1. Adapter Pattern for External Dependencies

**Rule:** All external services MUST use the adapter pattern to enable mocking in tests.

**Examples of Required Adapters:**
- `MindbodyAPIAdapter` - Wraps Mindbody API calls
- `CacheAdapter` - Wraps caching layer (SQLite)
- `AIClientAdapter` - Wraps LLM provider calls
- `DatabaseAdapter` - Wraps database operations

**Implementation:**
```typescript
// Interface definition
interface IMindbodyAPIAdapter {
  getClients(params: GetClientsParams): Promise<Client[]>;
  getAppointments(params: GetAppointmentsParams): Promise<Appointment[]>;
  // ... more methods
}

// Real implementation
class MindbodyAPIAdapter implements IMindbodyAPIAdapter {
  constructor(private version: string, private credentials: APICredentials) {}

  async getClients(params: GetClientsParams): Promise<Client[]> {
    // Real API call
  }
}

// Mock implementation for tests
class MockMindbodyAPIAdapter implements IMindbodyAPIAdapter {
  async getClients(params: GetClientsParams): Promise<Client[]> {
    // Return mock data
    return mockClients;
  }
}
```

### 2. API Versioning

**Rule:** ALL Mindbody API interactions MUST be version-aware.

**Implementation Strategy:**
```typescript
// Version registry
const API_VERSIONS = {
  'v6': MindbodyAPIAdapterV6,
  'v7': MindbodyAPIAdapterV7,
} as const;

// Factory pattern for version selection
class MindbodyAPIFactory {
  static create(version: string, credentials: APICredentials): IMindbodyAPIAdapter {
    const AdapterClass = API_VERSIONS[version];
    if (!AdapterClass) {
      throw new Error(`Unsupported API version: ${version}`);
    }
    return new AdapterClass(credentials);
  }
}

// Configuration
const config = {
  mindbody: {
    version: 'v6', // Current working version
    credentials: { /* ... */ }
  }
};
```

**File Structure:**
```
src/adapters/mindbody/
  ├── interface.ts          # IMindbodyAPIAdapter interface
  ├── factory.ts            # Version factory
  ├── v6/
  │   ├── adapter.ts        # V6 implementation
  │   ├── types.ts          # V6-specific types
  │   └── endpoints.ts      # V6 endpoint definitions
  └── v7/
      ├── adapter.ts        # V7 implementation (future)
      └── types.ts
```

### 3. Separation of Concerns

**Layers:**
1. **MCP Layer** (`src/mcp/`) - Tool definitions, resource handlers
2. **Service Layer** (`src/services/`) - Business logic, orchestration
3. **Adapter Layer** (`src/adapters/`) - External service interfaces
4. **Data Layer** (`src/database/`) - Schema, queries, migrations
5. **Types Layer** (`src/types/`) - Shared TypeScript types
6. **Utils Layer** (`src/utils/`) - Helper functions, validators

**Rule:** Each layer MUST only depend on layers below it. No circular dependencies.

### 4. Configuration Management

**Rule:** All configuration MUST be:
- Type-safe (using Zod schemas)
- Provide sensible defaults
- Support environment variable overrides

**Example:**
```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  mindbody: z.object({
    version: z.string().default('v6'),
    apiKey: z.string(),
    siteId: z.string(),
    timeout: z.number().default(30000),
  }),
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().default(3600), // 1 hour default
    maxSize: z.number().default(1000),
  }),
  ai: z.object({
    provider: z.enum(['openai', 'anthropic', 'custom']).default('openai'),
    model: z.string().default('gpt-4-turbo-preview'),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().default(4096),
  }),
});

type Config = z.infer<typeof ConfigSchema>;
```

---

## Testing Standards

### CRITICAL: Unit Tests ONLY

**IMPORTANT:** This project ONLY implements unit tests. No integration tests or E2E tests.

### Test Coverage Requirements

- **Minimum Coverage:** 90% for critical features (appointments, classes, sales, clients)
- **Minimum Coverage:** 85% for other features (staff, site, enrollment, payroll)
- **Branch Coverage:** >80% for all code paths

### Test Structure

**File Naming:**
- Test files MUST be named: `{filename}.test.ts`
- Place tests adjacent to source files: `src/services/appointment.ts` → `src/services/appointment.test.ts`

**Test Organization:**
```typescript
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let mockAPIAdapter: MockMindbodyAPIAdapter;
  let mockCache: MockCacheAdapter;

  beforeEach(() => {
    // Setup mocks
    mockAPIAdapter = new MockMindbodyAPIAdapter();
    mockCache = new MockCacheAdapter();
    service = new AppointmentService(mockAPIAdapter, mockCache);
  });

  afterEach(() => {
    // Cleanup
  });

  describe('getAppointments()', () => {
    test('should return appointments from cache when available', async () => {
      // Arrange
      const mockAppointments = [/* ... */];
      mockCache.get = mock(() => Promise.resolve(mockAppointments));

      // Act
      const result = await service.getAppointments({ startDate: '2024-01-01' });

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockCache.get).toHaveBeenCalledTimes(1);
      expect(mockAPIAdapter.getAppointments).not.toHaveBeenCalled();
    });

    test('should fetch from API when cache misses', async () => {
      // Arrange
      mockCache.get = mock(() => Promise.resolve(null));
      const mockAppointments = [/* ... */];
      mockAPIAdapter.getAppointments = mock(() => Promise.resolve(mockAppointments));

      // Act
      const result = await service.getAppointments({ startDate: '2024-01-01' });

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockAPIAdapter.getAppointments).toHaveBeenCalledTimes(1);
      expect(mockCache.set).toHaveBeenCalledWith(expect.any(String), mockAppointments);
    });

    test('should handle API errors gracefully', async () => {
      // Arrange
      mockCache.get = mock(() => Promise.resolve(null));
      mockAPIAdapter.getAppointments = mock(() => Promise.reject(new Error('API Error')));

      // Act & Assert
      await expect(service.getAppointments({ startDate: '2024-01-01' }))
        .rejects
        .toThrow('API Error');
    });

    test('should validate date format', async () => {
      // Act & Assert
      await expect(service.getAppointments({ startDate: 'invalid-date' }))
        .rejects
        .toThrow('Invalid date format');
    });
  });
});
```

### Mocking Strategy

**Rule:** ALL external dependencies MUST be mocked in unit tests.

**Mock Implementations:**
1. **Mindbody API:** Mock all API responses with realistic test data
2. **Database:** Use in-memory SQLite or mock database adapter
3. **Cache:** Mock cache adapter with in-memory storage
4. **AI/LLM:** Mock AI client responses with predetermined outputs
5. **File System:** Mock file operations if needed
6. **Network:** No real network calls in tests

**Test Data Location:**
```
tests/
  ├── fixtures/
  │   ├── clients.json
  │   ├── appointments.json
  │   ├── classes.json
  │   └── sales.json
  └── mocks/
      ├── MindbodyAPIAdapter.mock.ts
      ├── CacheAdapter.mock.ts
      └── AIClient.mock.ts
```

### Test Execution

**Commands:**
```bash
# Run all tests
bun test

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test src/services/appointment.test.ts

# Watch mode
bun test --watch
```

---

## API Integration Guidelines

### Mindbody API Integration Requirements

**1. Version Support**

Current working version: **v6**

**CRITICAL: API Specification Reference**

When implementing ANY endpoint logic, you MUST reference the official API specification:
- **File Location:** `api-specs/mindbody-public-api-v6.json`
- **Purpose:** Ensures correct endpoint paths, request parameters, response structures, and data types
- **Requirement:** All adapters, types, and service implementations MUST match the spec exactly

**Rule:** Before implementing any Mindbody API endpoint, consult `api-specs/mindbody-public-api-v6.json` to verify:
- Correct endpoint URL and HTTP method
- Required vs optional parameters
- Request body structure and data types
- Response structure and field names
- Error response formats
- Authentication requirements

**File Structure:**
```
api-specs/
  └── mindbody-public-api-v6.json  # Official API specification (REFERENCE THIS!)

src/adapters/mindbody/
  ├── interface.ts          # IMindbodyAPIAdapter
  ├── factory.ts            # MindbodyAPIFactory
  ├── types.ts              # Shared types
  ├── errors.ts             # Custom error classes
  └── v6/
      ├── adapter.ts        # V6 implementation
      ├── endpoints.ts      # V6 endpoint definitions
      ├── types.ts          # V6-specific types
      └── client.ts         # HTTP client for V6
```

**2. Error Handling**

**Rule:** All API calls MUST implement comprehensive error handling.

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

class MindbodyAPIAdapter {
  async getClients(params: GetClientsParams): Promise<Client[]> {
    try {
      const response = await this.client.get('/client/clients', { params });

      if (!response.ok) {
        throw new MindbodyAPIError(
          `Failed to fetch clients: ${response.statusText}`,
          response.status,
          '/client/clients'
        );
      }

      return response.data.Clients;
    } catch (error) {
      if (error instanceof MindbodyAPIError) {
        throw error;
      }
      throw new MindbodyAPIError(
        'Unexpected error fetching clients',
        500,
        '/client/clients',
        error as Error
      );
    }
  }
}
```

**3. Rate Limiting & Retries**

**Rule:** Implement exponential backoff for rate limit errors.

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof MindbodyAPIError && error.statusCode === 429) {
        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt),
          config.maxDelay
        );
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError!;
}
```

**4. Request Validation**

**Rule:** All API requests MUST be validated using Zod schemas.

```typescript
import { z } from 'zod';

const GetClientsParamsSchema = z.object({
  searchText: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(200).default(100),
  offset: z.number().min(0).default(0),
});

type GetClientsParams = z.infer<typeof GetClientsParamsSchema>;

async function getClients(params: GetClientsParams): Promise<Client[]> {
  const validatedParams = GetClientsParamsSchema.parse(params);
  // ... proceed with API call
}
```

**5. Response Transformation**

**Rule:** Transform API responses to internal types consistently.

```typescript
interface MindbodyClient {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  // ... Mindbody fields
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  // ... normalized fields
}

function transformClient(mbClient: MindbodyClient): Client {
  return {
    id: mbClient.Id,
    firstName: mbClient.FirstName,
    lastName: mbClient.LastName,
    email: mbClient.Email,
  };
}
```

---

## Caching Strategy

### Cache as a First-Class Citizen

**Rule:** ALL read operations MUST check cache before hitting the API.

### Cache Implementation

**Technology:** SQLite with in-memory option for tests

**Schema:**
```sql
CREATE TABLE cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX idx_cache_expires ON cache(expires_at);
```

### Cache Adapter Interface

```typescript
interface ICacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  prune(): Promise<number>; // Remove expired entries
}

class SQLiteCacheAdapter implements ICacheAdapter {
  constructor(private db: Database, private defaultTTL: number = 3600) {}

  async get<T>(key: string): Promise<T | null> {
    const row = this.db
      .prepare('SELECT value, expires_at FROM cache WHERE key = ?')
      .get(key) as { value: string; expires_at: number } | undefined;

    if (!row) return null;

    if (Date.now() > row.expires_at) {
      await this.delete(key);
      return null;
    }

    // Increment hit count
    this.db
      .prepare('UPDATE cache SET hit_count = hit_count + 1 WHERE key = ?')
      .run(key);

    return JSON.parse(row.value) as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL) * 1000;
    const valueJson = JSON.stringify(value);

    this.db
      .prepare(`
        INSERT OR REPLACE INTO cache (key, value, expires_at, created_at)
        VALUES (?, ?, ?, ?)
      `)
      .run(key, valueJson, expiresAt, Date.now());
  }

  // ... other methods
}
```

### Cache Key Strategy

**Rule:** Cache keys MUST be deterministic and include all relevant parameters.

```typescript
function generateCacheKey(endpoint: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  const paramsString = JSON.stringify(sortedParams);
  const hash = hashString(paramsString); // Use fast hash function

  return `${endpoint}:${hash}`;
}

// Example usage
const key = generateCacheKey('/client/clients', {
  searchText: 'john',
  limit: 100,
  offset: 0,
});
// Result: "/client/clients:a3f2b9c1"
```

### Cache TTL Guidelines

**Default TTLs by Data Type:**
- **Static data** (countries, genders, session types): 1 week (604800s)
- **Semi-static data** (staff, locations, programs): 24 hours (86400s)
- **Dynamic data** (appointments, classes): 1 hour (3600s)
- **Real-time data** (availability, cart): 5 minutes (300s)
- **Transaction data** (purchases, bookings): No cache

**Configuration:**
```typescript
const CACHE_TTL = {
  STATIC: 604800,      // 1 week
  SEMI_STATIC: 86400,  // 24 hours
  DYNAMIC: 3600,       // 1 hour
  REALTIME: 300,       // 5 minutes
} as const;
```

### Cache Invalidation

**Rule:** Write operations MUST invalidate related cache entries.

```typescript
class AppointmentService {
  async bookAppointment(params: BookAppointmentParams): Promise<Appointment> {
    // Book the appointment
    const appointment = await this.api.bookAppointment(params);

    // Invalidate related cache entries
    await this.cache.delete(`/appointment/appointments:*`);
    await this.cache.delete(`/appointment/scheduleItems:*`);
    await this.cache.delete(`/client/clients:${params.clientId}`);

    return appointment;
  }
}
```

---

## AI/Agentic Behavior Configuration

### Mastra Integration

**Rule:** ALL AI/agentic behavior MUST use Mastra for workflows and model management.

### Configuration Structure

```typescript
import { Mastra, Agent, Workflow } from '@mastra/core';

const aiConfig = {
  provider: 'openai',           // 'openai' | 'anthropic' | 'custom'
  model: 'gpt-4-turbo-preview', // Model identifier
  temperature: 0.7,             // 0.0-2.0, controls randomness
  maxTokens: 4096,              // Maximum tokens per response
  topP: 1.0,                    // Nucleus sampling parameter
  frequencyPenalty: 0.0,        // Reduce repetition
  presencePenalty: 0.0,         // Encourage new topics
  timeout: 30000,               // Request timeout (ms)
};

// Mastra instance
const mastra = new Mastra({
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
  },
});
```

### Agent Configuration

**Rule:** Agents MUST have clear descriptions, sensible defaults, and configurable parameters.

```typescript
interface AgentConfig {
  name: string;
  description: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  tools: string[];
  maxIterations: number;
}

const appointmentAgentConfig: AgentConfig = {
  name: 'appointment-scheduler',
  description: 'Assists with appointment scheduling and management',
  model: 'gpt-4-turbo-preview',
  temperature: 0.3, // Low temperature for deterministic scheduling
  systemPrompt: `You are an appointment scheduling assistant...`,
  tools: [
    'get_appointments',
    'check_availability',
    'book_appointment',
    'cancel_appointment',
  ],
  maxIterations: 5,
};

const agent = mastra.createAgent(appointmentAgentConfig);
```

### Workflow Configuration

**Rule:** Complex operations MUST use Mastra workflows for orchestration.

```typescript
import { Workflow, Step } from '@mastra/core';

const bookingWorkflow = new Workflow({
  name: 'appointment-booking-workflow',
  description: 'Complete workflow for booking appointments with validation',
  steps: [
    new Step({
      name: 'validate-client',
      action: async (context) => {
        const client = await clientService.getClient(context.clientId);
        return { valid: !!client, client };
      },
    }),
    new Step({
      name: 'check-availability',
      action: async (context) => {
        const availability = await appointmentService.checkAvailability({
          serviceId: context.serviceId,
          staffId: context.staffId,
          date: context.date,
        });
        return { available: availability.length > 0 };
      },
    }),
    new Step({
      name: 'book-appointment',
      condition: (context) => context.available,
      action: async (context) => {
        return await appointmentService.bookAppointment({
          clientId: context.clientId,
          serviceId: context.serviceId,
          staffId: context.staffId,
          dateTime: context.dateTime,
        });
      },
    }),
  ],
});
```

---

## MCP Server Standards

### Tool Definitions

**Rule:** MCP tools MUST have concise, functional descriptions. The inputSchema documents parameters.

**Tool Structure:**
```typescript
import { Tool } from '@modelcontextprotocol/sdk/types.js';

const getClientsToolDefinition: Tool = {
  name: 'get_clients',
  description: 'Retrieves clients from Mindbody with optional filtering by search text, date ranges, and pagination. Cached for 1 hour.',
  inputSchema: {
    type: 'object',
    properties: {
      searchText: {
        type: 'string',
        description: 'Text to search in client names, emails, or phone numbers',
      },
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'ISO 8601 date to filter clients created after this date',
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'ISO 8601 date to filter clients created before this date',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 200,
        default: 100,
        description: 'Number of results to return',
      },
      offset: {
        type: 'number',
        minimum: 0,
        default: 0,
        description: 'Number of results to skip for pagination',
      },
    },
    required: [],
  },
};
```

### Tool Implementation

**Rule:** Tool handlers MUST validate inputs and handle errors gracefully.

```typescript
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

async function handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
  try {
    // Validate tool name
    if (!AVAILABLE_TOOLS.includes(request.params.name)) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    // Validate input schema
    const tool = TOOL_DEFINITIONS[request.params.name];
    const validatedInput = validateInput(request.params.arguments, tool.inputSchema);

    // Execute tool
    const result = await executeTool(request.params.name, validatedInput);

    // Return result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Return error in MCP format
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            tool: request.params.name,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
```

### Resource Definitions

**Rule:** MCP resources MUST provide queryable data endpoints.

```typescript
const clientsResourceDefinition: Resource = {
  uri: 'mindbody://clients',
  name: 'Clients List',
  description: 'Access to all client records with real-time data',
  mimeType: 'application/json',
};

const appointmentsResourceDefinition: ResourceTemplate = {
  uriTemplate: 'mindbody://appointments/{date}',
  name: 'Appointments by Date',
  description: 'Access appointments for a specific date (YYYY-MM-DD format)',
  mimeType: 'application/json',
};
```

### Server Capabilities

**Required Capabilities:**
```typescript
const serverCapabilities = {
  tools: {
    // List all available tools
  },
  resources: {
    // List all available resources
  },
  prompts: {
    // Optional: Pre-defined prompts
  },
};
```

---

## Code Quality Standards

### TypeScript Standards

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Type Safety Rules

**CRITICAL:** Never use `any` type except in tests or when absolutely necessary.

**Preferred Type Strategies:**
1. **Use `unknown`** for truly unknown types, then narrow
2. **Use generic constraints** for flexible but type-safe code
3. **Use discriminated unions** for complex types
4. **Use explicit type casting** when type narrowing is required

```typescript
// ❌ BAD - Uses any
function processData(data: any) {
  return data.value;
}

// ✅ GOOD - Uses unknown with type guard
function processData(data: unknown) {
  if (isValidData(data)) {
    return data.value;
  }
  throw new Error('Invalid data');
}

function isValidData(data: unknown): data is { value: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'value' in data &&
    typeof data.value === 'string'
  );
}
```

### Error Handling

**Rule:** Use standard Error class with descriptive messages.

```typescript
// Throw errors with clear, actionable messages
throw new Error('Failed to fetch clients: Invalid API key');
throw new Error('Validation failed: startDate must be ISO 8601 format');
throw new Error('Cache operation failed: Database connection lost');

// Catch and re-throw with context
try {
  await apiAdapter.getClients(params);
} catch (error) {
  throw new Error(`Client fetch failed: ${error.message}`);
}
```

### Logging Standards

**Rule:** Use standard console methods for logging.

- `console.log()` for informational messages
- `console.error()` for errors
- Include relevant context in messages
- No custom logger infrastructure required

```typescript
// Example
console.log('Booking appointment', { clientId: '123', appointmentId: '456' });
console.error('Failed to book appointment:', error);
```

### Code Formatting

**Rule:** Run Prettier before completing any story.

---

## Documentation Requirements

**Rule:** Only add documentation when it provides functional value for AI agents or developers modifying code.

- Update project README only if adding new major features or configuration
- No per-module READMEs required
- No inline comments unless explaining non-obvious business logic
- Code should be self-documenting through clear naming

---

## Definition of Done

A story is considered DONE when ALL of the following are complete:

- [ ] **Implementation**
  - [ ] All acceptance criteria met
  - [ ] Adapter pattern used for external dependencies (API, cache, database)
  - [ ] Input validation using Zod schemas
  - [ ] Caching implemented for read operations with appropriate TTL
  - [ ] Error handling with descriptive messages

- [ ] **Testing**
  - [ ] Unit tests achieve >90% coverage (or >85% for non-critical features)
  - [ ] Tests pass consistently
  - [ ] All external dependencies mocked

- [ ] **Code Quality**
  - [ ] No TypeScript errors
  - [ ] No `any` types (except in tests when necessary)
  - [ ] Prettier formatting applied

- [ ] **Integration**
  - [ ] MCP tool registered and functional
  - [ ] Story marked complete in AGILE_PLAN.md

---

## Workflow Process

### Story Implementation Workflow

When implementing a story from AGILE_PLAN.md:

#### 1. Analysis
- [ ] Read acceptance criteria and identify dependencies
- [ ] Determine required adapters, cache strategy, and test approach

#### 2. Implementation
- [ ] Create type definitions and Zod schemas
- [ ] Implement adapter interfaces (real + mock)
- [ ] Implement service layer logic
- [ ] Implement MCP tool handler
- [ ] Add error handling and validation

#### 3. Testing
- [ ] Create test fixtures
- [ ] Write unit tests (happy paths, error paths, edge cases)
- [ ] Verify coverage target met (90% or 85%)
- [ ] Ensure all tests pass

#### 4. Completion
- [ ] Review Definition of Done checklist
- [ ] Run Prettier
- [ ] Mark story complete in AGILE_PLAN.md

---

## File Structure

### Project Organization

```
mindbody-mcp/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── server.ts                   # MCP server setup
│   ├── config/
│   │   ├── index.ts                # Main config loader
│   │   ├── ai.ts                   # AI/Mastra configuration
│   │   ├── api.ts                  # API configuration
│   │   └── cache.ts                # Cache configuration
│   ├── adapters/
│   │   ├── mindbody/
│   │   │   ├── interface.ts        # IMindbodyAPIAdapter
│   │   │   ├── factory.ts          # Version factory
│   │   │   ├── types.ts            # Shared types
│   │   │   ├── errors.ts           # Error classes
│   │   │   ├── v6/
│   │   │   │   ├── adapter.ts      # V6 implementation
│   │   │   │   ├── client.ts       # HTTP client
│   │   │   │   ├── endpoints.ts    # Endpoint definitions
│   │   │   │   └── types.ts        # V6-specific types
│   │   │   └── mock/
│   │   │       └── adapter.ts      # Mock for tests
│   │   ├── cache/
│   │   │   ├── interface.ts        # ICacheAdapter
│   │   │   ├── sqlite.ts           # SQLite implementation
│   │   │   └── mock.ts             # Mock for tests
│   │   └── ai/
│   │       ├── interface.ts        # IAIClientAdapter
│   │       ├── mastra.ts           # Mastra implementation
│   │       └── mock.ts             # Mock for tests
│   ├── services/
│   │   ├── appointment/
│   │   │   ├── service.ts
│   │   │   ├── types.ts
│   │   │   ├── validators.ts
│   │   │   └── service.test.ts
│   │   ├── class/
│   │   ├── client/
│   │   ├── sale/
│   │   ├── staff/
│   │   ├── site/
│   │   ├── enrollment/
│   │   └── payroll/
│   ├── mcp/
│   │   ├── tools/
│   │   │   ├── index.ts            # Tool registry
│   │   │   ├── appointment.ts      # Appointment tools
│   │   │   ├── class.ts            # Class tools
│   │   │   └── ...
│   │   ├── resources/
│   │   │   ├── index.ts            # Resource registry
│   │   │   └── definitions.ts      # Resource definitions
│   │   └── handlers/
│   │       ├── tool.ts             # Tool request handler
│   │       └── resource.ts         # Resource request handler
│   ├── database/
│   │   ├── schema.sql              # Database schema
│   │   ├── migrations/
│   │   │   ├── 001_initial.sql
│   │   │   ├── 002_appointments.sql
│   │   │   └── ...
│   │   ├── client.ts               # Database client
│   │   └── queries.ts              # Query helpers
│   ├── types/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── appointment.ts
│   │   └── ...
│   └── utils/
│       ├── errors.ts
│       ├── validation.ts
│       └── cache-keys.ts
├── tests/
│   ├── fixtures/
│   │   ├── clients.json
│   │   ├── appointments.json
│   │   └── ...
│   └── mocks/
│       └── (additional mocks if needed)
├── config/
│   └── default.json                # Default configuration
├── .env.example                    # Environment template
├── package.json
├── tsconfig.json
├── .prettierrc
├── README.md
├── SCRUM_MASTER.md                 # This file
└── AGILE_PLAN.md                   # Sprint planning
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
bun run lint             # Run linter
bun run type-check       # Check TypeScript types

# Database
bun run db:migrate       # Run migrations
bun run db:rollback      # Rollback last migration
bun run db:seed          # Seed test data
```

### Story Estimation Guide

- **2 points**: Simple read operation with caching
- **3 points**: Standard read/write operation
- **5 points**: Complex operation with validation
- **8 points**: Multi-step workflow or transaction

### Coverage Targets by Epic

| Epic | Target Coverage |
|------|----------------|
| EP-1: Appointments | 90%+ |
| EP-2: Classes | 90%+ |
| EP-3: Sales | 95%+ |
| EP-4: Client | 90%+ |
| EP-5: Staff | 90%+ |
| EP-6: Site | 85%+ |
| EP-7: Enrollment | 85%+ |
| EP-8: Payroll | 80%+ |

---

## Conclusion

This Scrum Master document provides streamlined guidelines for implementing the Mindbody MCP Server. By following these standards, AI agents will produce:

- **Consistent architecture** using adapters and versioning
- **Comprehensive test coverage** with unit tests (90%+ or 85%+)
- **Robust caching** to minimize API calls and token usage
- **Type-safe implementations** without using `any`
- **Production-ready code** that meets core quality standards

When in doubt, refer back to this document. If guidelines conflict with story requirements, prioritize this document's standards and flag the conflict for resolution.
