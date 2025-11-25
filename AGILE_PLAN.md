# Mindbody MCP Server - Agile Implementation Plan (Hybrid Architecture)

**Version:** 3.0.0 (Major Architecture Revision)
**Created:** 2024-11-24
**Updated:** 2024-11-26
**Sprint Duration:** 2 weeks
**Total Sprints:** 4 (8 weeks)
**Target Coverage:** 9% → 100%
**Architecture:** Generic API wrapper with intelligent middleware

---

## Architecture Philosophy

**Agent Orchestrates, Server Executes:**
- **Agent Role:** Determines the "why" and "what" (business logic, workflow orchestration)
- **Server Role:** Provides the "how" (smart transport layer with caching, pagination, rate limiting)
- **Implementation:** Generic endpoint wrapper + optional intelligence flags

---

## Table of Contents

1. [Epic Overview](#epic-overview)
2. [Sprint Plan](#sprint-plan)
3. [Epic Definitions & Stories](#epic-definitions--stories)
4. [Progress Tracking](#progress-tracking)

---

## Epic Overview

| Epic ID | Epic Name | Priority | Stories | Status |
|---------|-----------|----------|---------|--------|
| EP-1 | Core Infrastructure & Intelligence Layer | 🔴 Critical | 12 | ⬜ Not Started |
| EP-2 | Client API Coverage (20 endpoints) | 🔴 Critical | 5 | ⬜ Not Started |
| EP-3 | Appointment API Coverage (12 endpoints) | 🔴 Critical | 4 | ⬜ Not Started |
| EP-4 | Class API Coverage (15 endpoints) | 🔴 Critical | 4 | ⬜ Not Started |
| EP-5 | Sale API Coverage (15 endpoints) | 🔴 Critical | 4 | ⬜ Not Started |
| EP-6 | Staff API Coverage (8 endpoints) | 🟡 High | 3 | ⬜ Not Started |
| EP-7 | Site API Coverage (12 endpoints) | 🟡 High | 3 | ⬜ Not Started |
| EP-8 | Enrollment & Payroll Coverage (11 endpoints) | 🟢 Medium | 3 | ⬜ Not Started |

**Total Stories:** 38 (down from 83!)

---

## Sprint Plan

### Sprint 1: Core Infrastructure (Weeks 1-2)
**Goal:** Build generic API wrapper with intelligent middleware
**Coverage After Sprint:** 0% → 5% (infrastructure only)

### Sprint 2: Client & Appointment APIs (Weeks 3-4)
**Goal:** Expose all client and appointment endpoints
**Coverage After Sprint:** 5% → 40%

### Sprint 3: Class & Sale APIs (Weeks 5-6)
**Goal:** Expose all class and commerce endpoints
**Coverage After Sprint:** 40% → 75%

### Sprint 4: Remaining APIs & Polish (Weeks 7-8)
**Goal:** Complete staff, site, enrollment, payroll coverage
**Coverage After Sprint:** 75% → 100%

---

## Epic Definitions & Stories

---

## EP-1: Core Infrastructure & Intelligence Layer 🔴

**Description:** Build the foundational generic API wrapper with intelligent middleware that handles caching, pagination, rate limiting, and token management transparently.

**Business Value:** Critical - Enables rapid exposure of all 95+ Mindbody API endpoints without custom logic per endpoint.

**Components:**
- Generic request handler
- Endpoint metadata registry
- Intelligence layer (caching, pagination, rate limiting, token refresh)
- Dynamic tool registration
- Testing infrastructure

**Test Coverage Target:** 95%+

**Acceptance Criteria:**
- Generic handler can call any Mindbody API endpoint with metadata
- Intelligence features (caching, pagination, rate limiting) work transparently
- Endpoints can be registered dynamically from metadata
- Comprehensive unit tests for all infrastructure components

### Stories

#### Sprint 1: Infrastructure Implementation

- [ ] **EP1-S01: Endpoint Metadata Schema**
  - **Story:** As a developer, I need a structured way to define API endpoint metadata so endpoints can be exposed dynamically
  - **Tasks:**
    - Create TypeScript interface for endpoint metadata
    - Include: endpoint URL, HTTP method, description, input schema, output type, intelligence flags
    - Support optional flags: auto_paginate, use_cache, dry_run, force
    - Define cache TTL categories (static, semi-static, dynamic, realtime)
    - Create validation using Zod
    - Write unit tests for metadata validation
  - **Acceptance Criteria:**
    - Metadata schema defined with TypeScript types
    - Zod schema validates all metadata fields
    - Support for 95+ endpoints planned
    - All validation tests pass
  - **Effort:** 5 points
  - **Files:**
    - `src/metadata/schema.ts`
    - `src/metadata/types.ts`
    - `src/metadata/schema.test.ts`

- [ ] **EP1-S02: Endpoint Registry System**
  - **Story:** As a developer, I need a central registry for all endpoint metadata so tools can be generated dynamically
  - **Tasks:**
    - Create endpoint registry class
    - Support adding/retrieving endpoint metadata
    - Organize by category (client, appointment, class, sale, etc.)
    - Export metadata for MCP tool generation
    - Write unit tests for registry operations
  - **Acceptance Criteria:**
    - Registry stores and retrieves endpoint metadata
    - Supports filtering by category
    - Thread-safe access
    - All tests pass
  - **Effort:** 3 points
  - **Files:**
    - `src/metadata/registry.ts`
    - `src/metadata/registry.test.ts`

- [ ] **EP1-S03: Generic Request Handler**
  - **Story:** As a system, I need a generic request handler that can call any Mindbody endpoint using metadata
  - **Tasks:**
    - Create GenericApiHandler class
    - Accept endpoint metadata and parameters
    - Build HTTP request from metadata
    - Handle request/response transformation
    - Integrate with auth service
    - Support dry-run mode for write operations
    - Write comprehensive unit tests
  - **Acceptance Criteria:**
    - Handler makes correct HTTP requests for any endpoint
    - Supports GET, POST, PUT, DELETE methods
    - Query params and body handled correctly
    - Dry-run mode works for mutations
    - >95% test coverage
  - **Effort:** 8 points
  - **Files:**
    - `src/services/genericApiHandler.ts`
    - `src/services/genericApiHandler.test.ts`

- [ ] **EP1-S04: Intelligent Caching Layer**
  - **Story:** As a system, I need transparent caching to minimize API calls and improve performance
  - **Tasks:**
    - Integrate cache checks before API calls (GET only)
    - Generate deterministic cache keys from endpoint + params
    - Support configurable TTL per endpoint type
    - Cache responses after successful requests
    - Implement cache hit/miss tracking
    - Add cache invalidation on write operations
    - Write unit tests with mock cache
  - **Acceptance Criteria:**
    - GET requests check cache first
    - Cache keys are deterministic
    - TTLs applied correctly per endpoint type
    - Write operations invalidate related cache
    - >95% test coverage
  - **Effort:** 8 points
  - **Files:**
    - `src/services/caching.ts`
    - `src/services/cacheKeys.ts`
    - `src/services/caching.test.ts`

- [ ] **EP1-S05: Auto-Pagination Engine**
  - **Story:** As an agent, I want optional auto-pagination so I can fetch all results with a single tool call
  - **Tasks:**
    - Detect pagination in API responses (PaginationResponse field)
    - Implement auto-pagination loop when flag enabled
    - Increment offset and fetch next page
    - Aggregate results across pages
    - Track total API calls used
    - Handle pagination edge cases (empty, single page)
    - Write unit tests with multi-page mock data
  - **Acceptance Criteria:**
    - Auto-pagination fetches all pages when enabled
    - Returns aggregated results with metadata
    - Works with any endpoint that supports pagination
    - Edge cases handled correctly
    - >95% test coverage
  - **Effort:** 8 points
  - **Files:**
    - `src/services/pagination.ts`
    - `src/services/pagination.test.ts`

- [ ] **EP1-S06: Rate Limiting Guard**
  - **Story:** As a system, I need rate limiting to prevent exceeding Mindbody's 1,000 calls/day limit
  - **Tasks:**
    - Integrate existing RateLimitGuard before all requests
    - Count API calls (including retries)
    - Reject requests when limit reached (unless force=true)
    - Support configurable threshold (default 950)
    - Persist counter to SQLite
    - Write unit tests for limit enforcement
  - **Acceptance Criteria:**
    - Rate limiter checks before every request
    - Calls are counted accurately
    - Threshold enforced correctly
    - Force flag bypasses limit
    - >95% test coverage
  - **Effort:** 5 points
  - **Files:**
    - Integration in `src/services/genericApiHandler.ts`
    - Unit tests in `src/services/rateLimit.test.ts`

- [ ] **EP1-S07: Token Management & Auto-Retry**
  - **Story:** As a system, I need automatic token refresh and retry on auth failures
  - **Tasks:**
    - Integrate existing AuthService
    - Detect 401/403 responses
    - Invalidate and refresh token
    - Retry original request with new token
    - Track retry API calls in rate limiter
    - Write unit tests for auth failure scenarios
  - **Acceptance Criteria:**
    - Auth failures trigger token refresh
    - Original request retried successfully
    - Retry calls counted in rate limit
    - Transparent to caller
    - >95% test coverage
  - **Effort:** 5 points
  - **Files:**
    - Integration in `src/services/genericApiHandler.ts`
    - Unit tests with mock auth failures

- [ ] **EP1-S08: Response Transformation System**
  - **Story:** As a developer, I need consistent response formats across all endpoints
  - **Tasks:**
    - Define standard response wrapper interface
    - Extract data from Mindbody response structure
    - Preserve pagination metadata
    - Handle different response formats (arrays, objects, paginated)
    - Transform field names to camelCase consistently
    - Write unit tests for various response types
  - **Acceptance Criteria:**
    - All responses follow standard format
    - Pagination metadata extracted correctly
    - Field names normalized
    - Handles all Mindbody response structures
    - >90% test coverage
  - **Effort:** 5 points
  - **Files:**
    - `src/services/responseTransformer.ts`
    - `src/services/responseTransformer.test.ts`

- [ ] **EP1-S09: Error Handling Framework**
  - **Story:** As a system, I need comprehensive error handling for all failure scenarios
  - **Tasks:**
    - Define custom error classes (MindbodyAPIError, RateLimitError, etc.)
    - Handle HTTP errors with status codes
    - Handle network errors
    - Handle validation errors
    - Return errors in MCP-compliant format
    - Write unit tests for all error types
  - **Acceptance Criteria:**
    - All error types handled gracefully
    - Error messages are actionable
    - MCP error format followed
    - Stack traces preserved for debugging
    - >95% test coverage
  - **Effort:** 5 points
  - **Files:**
    - `src/errors/types.ts`
    - `src/errors/handlers.ts`
    - `src/errors/handlers.test.ts`

- [ ] **EP1-S10: Dynamic MCP Tool Registration**
  - **Story:** As a system, I need to auto-generate MCP tools from endpoint metadata
  - **Tasks:**
    - Read endpoint registry
    - Generate MCP tool definitions dynamically
    - Convert metadata to inputSchema (JSON Schema format)
    - Register all tools in MCP server
    - Support tool filtering by category
    - Write unit tests for tool generation
  - **Acceptance Criteria:**
    - Tools generated from metadata automatically
    - inputSchema matches endpoint requirements
    - All tools registered in MCP server
    - Tool names follow convention (endpoint_name)
    - >90% test coverage
  - **Effort:** 8 points
  - **Files:**
    - `src/mcp/toolGenerator.ts`
    - `src/mcp/toolGenerator.test.ts`

- [ ] **EP1-S11: Generic Tool Handler**
  - **Story:** As a system, I need a single handler that routes all tool calls to the generic API handler
  - **Tasks:**
    - Implement MCP CallToolRequest handler
    - Lookup endpoint metadata by tool name
    - Validate input parameters with Zod
    - Call GenericApiHandler with metadata + params
    - Format response for MCP protocol
    - Handle errors and return MCP error format
    - Write comprehensive unit tests
  - **Acceptance Criteria:**
    - Single handler routes all tool calls
    - Parameter validation works
    - Responses formatted correctly for MCP
    - Errors handled gracefully
    - >95% test coverage
  - **Effort:** 8 points
  - **Files:**
    - `src/mcp/handlers/genericToolHandler.ts`
    - `src/mcp/handlers/genericToolHandler.test.ts`

- [ ] **EP1-S12: Infrastructure Integration & Testing**
  - **Story:** As a developer, I need end-to-end tests proving the infrastructure works
  - **Tasks:**
    - Create sample endpoint metadata (3-4 endpoints)
    - Register sample tools in MCP server
    - Test complete request flow (MCP → Handler → API → Cache → Response)
    - Test auto-pagination with mock multi-page data
    - Test caching with mock data
    - Test rate limiting enforcement
    - Test token refresh and retry
    - Document infrastructure usage patterns
  - **Acceptance Criteria:**
    - Sample endpoints work end-to-end
    - All intelligence features demonstrated
    - Integration tests pass
    - Infrastructure ready for endpoint expansion
    - Documentation complete
  - **Effort:** 8 points
  - **Files:**
    - `src/__tests__/integration/infrastructure.test.ts`
    - `docs/INFRASTRUCTURE.md`

---

## EP-2: Client API Coverage (20 endpoints) 🔴

**Description:** Expose all 20 Mindbody /client/* endpoints as MCP tools using the generic infrastructure.

**Business Value:** Critical - Enables complete client lifecycle management.

**API Endpoints:** 20 from /client/*

**Test Coverage Target:** 90%+

**Acceptance Criteria:**
- All 20 client endpoints have metadata defined
- All tools registered and functional
- Input validation works for all endpoints
- Caching configured appropriately
- Comprehensive tests for all endpoints

### Stories

#### Sprint 2: Client Endpoints

- [ ] **EP2-S01: Client Read Endpoints Metadata (10 endpoints)**
  - **Story:** Define metadata for all read-only client endpoints
  - **Endpoints:**
    - GET /client/clients
    - GET /client/clientcompleteinfo
    - GET /client/clientcontracts
    - GET /client/clientformulanotes
    - GET /client/clientindexes
    - GET /client/clientpurchases
    - GET /client/clientreferraltypes
    - GET /client/clientservices
    - GET /client/clientvisits
    - GET /client/activeClientMemberships
  - **Tasks:**
    - Define metadata for each endpoint
    - Create input schemas (Zod)
    - Define output types
    - Set cache TTLs (1 hour for dynamic, 24 hours for semi-static)
    - Add to endpoint registry
    - Write unit tests for each endpoint's metadata
  - **Acceptance Criteria:**
    - Metadata defined for all 10 endpoints
    - Input validation schemas complete
    - Cache TTLs configured
    - Tests verify metadata structure
  - **Effort:** 13 points
  - **Files:**
    - `src/metadata/endpoints/client.ts`
    - `src/metadata/endpoints/client.test.ts`

- [ ] **EP2-S02: Client Write Endpoints Metadata (4 endpoints)**
  - **Story:** Define metadata for client mutation endpoints
  - **Endpoints:**
    - POST /client/addclient
    - POST /client/updateclient
    - POST /client/sendPasswordResetEmail
    - POST /client/uploadClientDocument
    - POST /client/uploadClientPhoto
  - **Tasks:**
    - Define metadata for each endpoint
    - Create input schemas with validation rules
    - Enable dry_run flag for mutations
    - Configure cache invalidation patterns
    - Add to endpoint registry
    - Write unit tests
  - **Acceptance Criteria:**
    - Metadata defined for all mutation endpoints
    - Dry-run support enabled
    - Cache invalidation configured
    - Tests pass
  - **Effort:** 8 points
  - **Files:**
    - Addition to `src/metadata/endpoints/client.ts`

- [ ] **EP2-S03: Client Reference Data Endpoints (5 endpoints)**
  - **Story:** Define metadata for client reference data endpoints
  - **Endpoints:**
    - GET /client/customclientfields
    - GET /client/requiredClientFields
    - GET /client/crossregionalclientassociations
    - GET /client/contactlogs
    - POST /client/contactlogs (add logs)
  - **Tasks:**
    - Define metadata for reference endpoints
    - Set long cache TTLs for static data (24 hours)
    - Create schemas
    - Add to registry
    - Write tests
  - **Acceptance Criteria:**
    - All 5 reference endpoints defined
    - Static data cached appropriately
    - Tests pass
  - **Effort:** 5 points
  - **Files:**
    - Addition to `src/metadata/endpoints/client.ts`

- [ ] **EP2-S04: Client Endpoints Testing**
  - **Story:** Comprehensive testing of all client endpoints
  - **Tasks:**
    - Create mock data for all client endpoints
    - Test each endpoint with generic handler
    - Test input validation for all endpoints
    - Test caching behavior
    - Test dry-run mode for mutations
    - Test cache invalidation on writes
    - Verify >90% coverage
  - **Acceptance Criteria:**
    - All 20 client endpoints tested
    - Mock data covers edge cases
    - Validation tests pass
    - Caching tests pass
    - >90% coverage achieved
  - **Effort:** 13 points
  - **Files:**
    - `src/__tests__/endpoints/client.test.ts`
    - `src/__tests__/fixtures/clientData.ts`

- [ ] **EP2-S05: Client Endpoints Documentation**
  - **Story:** Document all client endpoints for agent usage
  - **Tasks:**
    - Create endpoint reference guide
    - Document input parameters for each endpoint
    - Document output formats
    - Document cache behavior
    - Document dry-run usage
    - Add usage examples
  - **Acceptance Criteria:**
    - Reference guide complete
    - Examples provided
    - Agent-friendly documentation
  - **Effort:** 3 points
  - **Files:**
    - `docs/endpoints/CLIENT.md`

---

## EP-3: Appointment API Coverage (12 endpoints) 🔴

**Description:** Expose all 12 Mindbody /appointment/* endpoints as MCP tools.

**Business Value:** Critical - Core scheduling functionality.

**API Endpoints:** 12 from /appointment/*

**Test Coverage Target:** 90%+

### Stories

#### Sprint 2: Appointment Endpoints

- [ ] **EP3-S01: Appointment Read Endpoints Metadata (6 endpoints)**
  - **Story:** Define metadata for appointment read endpoints
  - **Endpoints:**
    - GET /appointment/appointments
    - GET /appointment/staffappointments
    - GET /appointment/bookableItems
    - GET /appointment/scheduleItems
    - GET /appointment/appointmentOptions
    - GET /appointment/appointmentAddOns
  - **Tasks:**
    - Define metadata for each endpoint
    - Create input schemas
    - Set cache TTLs (1 hour for appointments, 24 hours for bookable items)
    - Add to endpoint registry
    - Write unit tests
  - **Acceptance Criteria:**
    - All 6 read endpoints defined
    - Cache configuration appropriate
    - Tests pass
  - **Effort:** 8 points
  - **Files:**
    - `src/metadata/endpoints/appointment.ts`
    - `src/metadata/endpoints/appointment.test.ts`

- [ ] **EP3-S02: Appointment Write Endpoints Metadata (6 endpoints)**
  - **Story:** Define metadata for appointment mutation endpoints
  - **Endpoints:**
    - POST /appointment/addappointment
    - POST /appointment/updateappointment
    - POST /appointment/cancelAppointment
    - POST /appointment/addItemToShoppingCart
    - POST /appointment/removeFromShoppingCart
    - POST /appointment/checkoutShoppingCart
  - **Tasks:**
    - Define metadata for mutations
    - Enable dry_run flag
    - Configure cache invalidation
    - Add to registry
    - Write tests
  - **Acceptance Criteria:**
    - All 6 mutation endpoints defined
    - Dry-run supported
    - Cache invalidation configured
    - Tests pass
  - **Effort:** 8 points
  - **Files:**
    - Addition to `src/metadata/endpoints/appointment.ts`

- [ ] **EP3-S03: Appointment Endpoints Testing**
  - **Story:** Comprehensive testing of all appointment endpoints
  - **Tasks:**
    - Create mock appointment data
    - Test all endpoints with generic handler
    - Test validation
    - Test caching
    - Test dry-run
    - Verify >90% coverage
  - **Acceptance Criteria:**
    - All 12 endpoints tested
    - >90% coverage
  - **Effort:** 13 points
  - **Files:**
    - `src/__tests__/endpoints/appointment.test.ts`

- [ ] **EP3-S04: Appointment Endpoints Documentation**
  - **Story:** Document appointment endpoints
  - **Tasks:**
    - Create reference guide
    - Add examples
  - **Acceptance Criteria:**
    - Documentation complete
  - **Effort:** 3 points
  - **Files:**
    - `docs/endpoints/APPOINTMENT.md`

---

## EP-4: Class API Coverage (15 endpoints) 🔴

**Description:** Expose all 15 Mindbody /class/* endpoints.

**Business Value:** Critical - Group fitness functionality.

**API Endpoints:** 15 from /class/*

**Test Coverage Target:** 90%+

### Stories

#### Sprint 3: Class Endpoints

- [ ] **EP4-S01: Class Read Endpoints Metadata (8 endpoints)**
  - **Endpoints:**
    - GET /class/classes
    - GET /class/classDescriptions
    - GET /class/classSchedules
    - GET /class/bookableItems
    - GET /class/classVisits
    - GET /class/waitlistEntries
    - GET /class/semesterSchedule
  - **Effort:** 10 points

- [ ] **EP4-S02: Class Write Endpoints Metadata (7 endpoints)**
  - **Endpoints:**
    - POST /class/addClientToClass
    - POST /class/removeClientFromClass
    - POST /class/addClientToWaitlist
    - POST /class/removeClientFromWaitlist
    - POST /class/substituteClassTeacher
    - POST /class/cancelClass
    - POST /class/checkoutShoppingCart
  - **Effort:** 10 points

- [ ] **EP4-S03: Class Endpoints Testing**
  - **Effort:** 13 points

- [ ] **EP4-S04: Class Endpoints Documentation**
  - **Effort:** 3 points

---

## EP-5: Sale API Coverage (15 endpoints) 🔴

**Description:** Expose all 15 Mindbody /sale/* endpoints.

**Business Value:** Critical - Revenue generation.

**API Endpoints:** 15 from /sale/*

**Test Coverage Target:** 95%+

### Stories

#### Sprint 3: Sale Endpoints

- [ ] **EP5-S01: Sale Catalog Endpoints Metadata (7 endpoints)**
  - **Endpoints:**
    - GET /sale/services
    - GET /sale/contracts
    - GET /sale/packages
    - GET /sale/products
    - GET /sale/contractPricingOptions
    - GET /sale/customPaymentMethods
    - GET /sale/sales (already implemented, migrate to new system)
  - **Effort:** 10 points

- [ ] **EP5-S02: Sale Transaction Endpoints Metadata (8 endpoints)**
  - **Endpoints:**
    - POST /sale/purchaseContract
    - POST /sale/checkoutShoppingCart
    - POST /sale/refundPayment
    - POST /sale/voidSale
    - GET /sale/transactions
    - GET /sale/giftCards
    - POST /sale/giftCards
    - POST /sale/addOrUpdateContactLogs
  - **Effort:** 10 points

- [ ] **EP5-S03: Sale Endpoints Testing**
  - **Effort:** 13 points

- [ ] **EP5-S04: Sale Endpoints Documentation**
  - **Effort:** 3 points

---

## EP-6: Staff API Coverage (8 endpoints) 🟡

**Description:** Expose all 8 Mindbody /staff/* endpoints.

**Business Value:** High - Staff management.

**API Endpoints:** 8 from /staff/*

**Test Coverage Target:** 90%+

### Stories

#### Sprint 4: Staff Endpoints

- [ ] **EP6-S01: Staff Endpoints Metadata (8 endpoints)**
  - **Endpoints:**
    - GET /staff/staff
    - GET /staff/availabilities
    - GET /staff/staffPermissions
    - GET /staff/getStaffImageURL
    - GET /staff/loginLocations
    - POST /staff/addStaff
    - POST /staff/updateStaff
  - **Effort:** 10 points

- [ ] **EP6-S02: Staff Endpoints Testing**
  - **Effort:** 8 points

- [ ] **EP6-S03: Staff Endpoints Documentation**
  - **Effort:** 2 points

---

## EP-7: Site API Coverage (12 endpoints) 🟡

**Description:** Expose all 12 Mindbody /site/* endpoints.

**Business Value:** High - Configuration and multi-location.

**API Endpoints:** 12 from /site/*

**Test Coverage Target:** 85%+

### Stories

#### Sprint 4: Site Endpoints

- [ ] **EP7-S01: Site Endpoints Metadata (12 endpoints)**
  - **Endpoints:**
    - GET /site/locations
    - GET /site/programs
    - GET /site/sessionTypes
    - GET /site/resources
    - GET /site/countries
    - GET /site/stateprovinces
    - GET /site/genders
    - GET /site/relationships
    - GET /site/activationcode
    - GET /site/mobileProviders
    - GET /site/paymentMethods
    - GET /site/sites
  - **Effort:** 13 points

- [ ] **EP7-S02: Site Endpoints Testing**
  - **Effort:** 8 points

- [ ] **EP7-S03: Site Endpoints Documentation**
  - **Effort:** 2 points

---

## EP-8: Enrollment & Payroll Coverage (11 endpoints) 🟢

**Description:** Expose enrollment and payroll endpoints.

**Business Value:** Medium - Specialized features.

**API Endpoints:** 6 enrollment + 5 payroll = 11 total

**Test Coverage Target:** 85%+

### Stories

#### Sprint 4: Enrollment & Payroll Endpoints

- [ ] **EP8-S01: Enrollment Endpoints Metadata (6 endpoints)**
  - **Endpoints:**
    - GET /enrollment/programs
    - GET /enrollment/enrollments
    - POST /enrollment/addClientToEnrollment
    - POST /enrollment/removeClientFromEnrollment
    - GET /enrollment/classSchedules
    - GET /enrollment/waitlistEntries
  - **Effort:** 8 points

- [ ] **EP8-S02: Payroll Endpoints Metadata (5 endpoints)**
  - **Endpoints:**
    - GET /payroll/classTeacherSchedules
    - GET /payroll/classInstructorSchedule
    - GET /payroll/getTimeCard
    - GET /payroll/staffCommissions
    - GET /payroll/tips
  - **Effort:** 5 points

- [ ] **EP8-S03: Enrollment & Payroll Testing**
  - **Effort:** 8 points

---

## Progress Tracking

### Overall Progress

- [ ] **EPIC-EP1** - Core Infrastructure (0/12 stories complete)
- [ ] **EPIC-EP2** - Client API Coverage (0/5 stories complete)
- [ ] **EPIC-EP3** - Appointment API Coverage (0/4 stories complete)
- [ ] **EPIC-EP4** - Class API Coverage (0/4 stories complete)
- [ ] **EPIC-EP5** - Sale API Coverage (0/4 stories complete)
- [ ] **EPIC-EP6** - Staff API Coverage (0/3 stories complete)
- [ ] **EPIC-EP7** - Site API Coverage (0/3 stories complete)
- [ ] **EPIC-EP8** - Enrollment & Payroll Coverage (0/3 stories complete)

**Total Stories:** 0/38 complete (0%)

### Sprint Progress

| Sprint | Status | Stories Complete | Effort Complete |
|--------|--------|------------------|-----------------|
| Sprint 1 | ⬜ Not Started | 0/12 | 0/76 points |
| Sprint 2 | ⬜ Not Started | 0/9 | 0/56 points |
| Sprint 3 | ⬜ Not Started | 0/8 | 0/59 points |
| Sprint 4 | ⬜ Not Started | 0/9 | 0/64 points |

**Total Effort:** 0/255 points complete (0%)

### Coverage Progress

| Category | Current | Target | Status |
|----------|---------|--------|--------|
| Infrastructure | 0% | 100% | ⬜ Not Started |
| Client | 20% | 100% | ⬜ Not Started |
| Appointment | 17% | 100% | ⬜ Not Started |
| Class | 0% | 100% | ⬜ Not Started |
| Sale | 13% | 100% | ⬜ Not Started |
| Staff | 0% | 100% | ⬜ Not Started |
| Site | 0% | 100% | ⬜ Not Started |
| Enrollment | 0% | 100% | ⬜ Not Started |
| Payroll | 0% | 100% | ⬜ Not Started |
| **OVERALL** | **9%** | **100%** | **⬜ Not Started** |

---

## Architecture Comparison

### Old Approach (Abandoned)
- **Stories:** 83 custom high-level tools
- **Timeline:** 12 weeks (6 sprints)
- **Complexity:** High - custom logic per endpoint
- **Coverage:** 7% → 100%

### New Approach (Current)
- **Stories:** 38 generic endpoint exposures
- **Timeline:** 8 weeks (4 sprints)
- **Complexity:** Low - single generic handler
- **Coverage:** 9% → 100%
- **Speed:** 3x faster to complete

---

## Success Metrics

### Technical Metrics
- ✅ All 95+ Mindbody API endpoints exposed as MCP tools
- ✅ Generic infrastructure handles all requests
- ✅ Intelligence layer (caching, pagination, rate limiting) works transparently
- ✅ >90% test coverage for infrastructure
- ✅ >85% test coverage for endpoint metadata

### Business Metrics
- ✅ 100% API coverage achieved in 8 weeks
- ✅ Agent can orchestrate any Mindbody workflow
- ✅ Rate limiting prevents API quota exhaustion
- ✅ Caching minimizes redundant API calls
- ✅ Auto-pagination simplifies agent logic

---

## Migration Notes

### Existing Code to Migrate

The following existing implementations should be migrated to the new generic system:

1. **get_appointments** (EP1-S01, EP1-S02) - Already partially implemented
   - Migrate to new metadata-driven approach
   - Preserve existing cache logic
   - Update tests to new structure

2. **sync_clients** - Convert to `get_clients` with auto_paginate flag
3. **export_sales_history** - Convert to `get_sales` with auto_paginate + date range
4. **analyze_formula_notes** - Convert to `get_client_formula_notes`
5. **write_client_profile** - Convert to `update_client` with dry_run

### Backward Compatibility

During Sprint 1-2, maintain existing tools alongside new infrastructure until migration is complete. Mark old tools as deprecated in Sprint 3.

---

## License

MIT
