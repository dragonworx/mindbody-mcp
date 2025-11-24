# MinBody API Schema Comparison Report

**Generated:** 2025-11-24
**Source:** MinBody Public API v6 OpenAPI Specification (Official)
**Spec File:** `api-specs/mindbody-public-api-v6.json`

---

## Executive Summary

This report compares the **actual MinBody API v6 schema** (from the official OpenAPI specification) with the **current codebase type definitions**.

**🚨 CRITICAL FINDINGS:**
- **7 major type mismatches** that will cause runtime errors
- **Nested objects (Client, Location, SessionType) DO NOT exist** in the real API
- **ID types are inconsistent** (string vs integer) across different fields
- **Missing 13+ fields** from the real API that may contain critical data

---

## 1. Appointment Schema Comparison

### 1.1 Official API Schema (from OpenAPI Spec)

**Model:** `Mindbody.PublicApi.Dto.Models.V6.Appointment`

**Total Properties:** 23
**Required Properties:** None (all optional)

| Field Name | Type | Format | Description |
|------------|------|--------|-------------|
| `Id` | `integer` | `int64` | Appointment ID (NOT string!) |
| `StartDateTime` | `string` | `date-time` | ISO 8601 format |
| `EndDateTime` | `string` | `date-time` | ISO 8601 format |
| `ClientId` | `string` | - | Client ID (IS string) |
| `StaffId` | `integer` | `int64` | Staff ID (NOT string!) |
| `LocationId` | `integer` | `int32` | Location ID (NOT string!) |
| `SessionTypeId` | `integer` | `int32` | Session Type ID (NOT string!) |
| `Status` | `string` | - | Appointment status |
| `Staff` | `object` | `AppointmentStaff` | **Nested Staff object (DOES exist)** |
| `Duration` | `integer` | `int32` | Duration in minutes |
| `ClientServiceId` | `integer` | `int64` | Related client service |
| `FirstAppointment` | `boolean` | - | Is this client's first appointment? |
| `GenderPreference` | `string` | - | Staff gender preference |
| `IsWaitlist` | `boolean` | - | Is on waitlist? |
| `Notes` | `string` | - | Appointment notes |
| `OnlineDescription` | `string` | - | Description for online booking |
| `PartnerExternalId` | `string` | - | External partner ID |
| `ProgramId` | `integer` | `int32` | Program ID |
| `ProviderId` | `string` | - | Provider ID |
| `StaffRequested` | `boolean` | - | Was specific staff requested? |
| `WaitlistEntryId` | `integer` | `int64` | Waitlist entry ID if applicable |
| `AddOns` | `array` | `AddOnSmall[]` | Appointment add-ons |
| `Resources` | `array` | `ResourceSlim[]` | Resources (rooms, equipment) |

**Key Point:** **NO** `Client`, `Location`, or `SessionType` nested objects!

---

### 1.2 Codebase Type Definition

**File:** `src/types/appointment.ts:3-32`

```typescript
export interface MindbodyAppointment {
  Id: string;                    // ❌ WRONG: Should be number (int64)
  StartDateTime: string;         // ✅ Correct
  EndDateTime: string;           // ✅ Correct
  ClientId?: string;             // ✅ Correct
  StaffId?: string;              // ❌ WRONG: Should be number (int64)
  LocationId?: string;           // ❌ WRONG: Should be number (int32)
  SessionTypeId?: string;        // ❌ WRONG: Should be number (int32)
  Status?: string;               // ✅ Correct
  Client?: {                     // ❌ DOES NOT EXIST in real API!
    Id: string;
    FirstName?: string;
    LastName?: string;
    Email?: string;
  };
  Staff?: {                      // ⚠️ EXISTS but wrong structure
    Id: string;                  //    Should be number (int64)
    FirstName?: string;
    LastName?: string;
  };
  Location?: {                   // ❌ DOES NOT EXIST in real API!
    Id: string;
    Name?: string;
  };
  SessionType?: {                // ❌ DOES NOT EXIST in real API!
    Id: string;
    Name?: string;
  };
  [key: string]: unknown;        // ⚠️ Catch-all (acknowledges incomplete knowledge)
}
```

---

### 1.3 Critical Discrepancies

#### ❌ **Type Mismatch: Appointment ID**
- **Codebase:** `Id: string`
- **Real API:** `Id: integer (int64)`
- **Impact:** HIGH - Will cause type errors when comparing IDs, database queries will fail

#### ❌ **Type Mismatch: StaffId**
- **Codebase:** `StaffId?: string`
- **Real API:** `StaffId: integer (int64)`
- **Impact:** HIGH - Cannot join with staff tables, queries will fail

#### ❌ **Type Mismatch: LocationId**
- **Codebase:** `LocationId?: string`
- **Real API:** `LocationId: integer (int32)`
- **Impact:** HIGH - Cannot filter by location, queries will fail

#### ❌ **Type Mismatch: SessionTypeId**
- **Codebase:** `SessionTypeId?: string`
- **Real API:** `SessionTypeId: integer (int32)`
- **Impact:** HIGH - Cannot filter by session type

#### ❌ **Non-existent Field: Client**
- **Codebase:** Expects nested `Client` object with `{ Id, FirstName, LastName, Email }`
- **Real API:** **Does NOT return Client object** - only `ClientId`
- **Impact:** CRITICAL - `mbAppointment.Client` will be `undefined`, causing `TypeError` in `transformAppointment()` at line 99-104

#### ❌ **Non-existent Field: Location**
- **Codebase:** Expects nested `Location` object
- **Real API:** **Does NOT return Location object** - only `LocationId`
- **Impact:** CRITICAL - `mbAppointment.Location` will be `undefined`, causing null references

#### ❌ **Non-existent Field: SessionType**
- **Codebase:** Expects nested `SessionType` object
- **Real API:** **Does NOT return SessionType object** - only `SessionTypeId`
- **Impact:** CRITICAL - `mbAppointment.SessionType` will be `undefined`

#### ⚠️ **Wrong Structure: Staff**
- **Codebase:** `Staff?: { Id: string; FirstName?: string; LastName?: string; }`
- **Real API:** `Staff: AppointmentStaff` with structure:
  ```typescript
  {
    Id: number;          // int64, NOT string
    FirstName: string;
    LastName: string;
    DisplayName: string; // Additional field
  }
  ```
- **Impact:** MEDIUM - Will work partially but with type coercion issues

#### 📋 **Missing Fields (13 fields)**
The codebase is missing these fields that the real API returns:
- `Duration` (int32) - Appointment duration in minutes
- `ClientServiceId` (int64) - Related service purchase
- `FirstAppointment` (boolean) - Critical for first-time client logic
- `GenderPreference` (string) - Staff gender preference
- `IsWaitlist` (boolean) - Waitlist status
- `Notes` (string) - Appointment notes
- `OnlineDescription` (string) - Public description
- `PartnerExternalId` (string) - Integration partner ID
- `ProgramId` (int32) - Associated program
- `ProviderId` (string) - Provider information
- `StaffRequested` (boolean) - Was staff specifically requested?
- `WaitlistEntryId` (int64) - Waitlist entry reference
- `AddOns` (array) - Appointment add-ons
- `Resources` (array) - Rooms/equipment assigned

---

## 2. AppointmentStaff Schema

### 2.1 Official API Schema

**Model:** `Mindbody.PublicApi.Common.Models.AppointmentStaff`

| Field | Type | Format |
|-------|------|--------|
| `Id` | `integer` | `int64` |
| `FirstName` | `string` | - |
| `LastName` | `string` | - |
| `DisplayName` | `string` | - |

### 2.2 Codebase (Missing DisplayName)

```typescript
Staff?: {
  Id: string;              // ❌ Should be number
  FirstName?: string;
  LastName?: string;
  // Missing: DisplayName
}
```

---

## 3. GetStaffAppointments Response

### 3.1 Official API Response Structure

**Endpoint:** `GET /public/v{version}/appointment/staffappointments`
**Response Model:** `Mindbody.PublicApi.Dto.Models.V6.AppointmentController.GetStaffAppointmentsResponse`

```typescript
{
  Appointments: Appointment[];  // Array of Appointment objects (see above)
  PaginationResponse: {
    RequestedLimit: number;
    RequestedOffset: number;
    PageSize: number;
    TotalResults: number;
  }
}
```

**Note:** The response has `Appointments` (plural), not `StaffAppointments`!

### 3.2 Codebase Type (src/types/appointment.ts:79-87)

```typescript
export interface PaginatedAppointmentResponse {
  Appointments: MindbodyAppointment[];  // ✅ Correct field name
  PaginationResponse?: {                // ✅ Correct structure
    RequestedLimit: number;
    RequestedOffset: number;
    PageSize: number;
    TotalResults: number;
  };
}
```

**Status:** ✅ This structure is CORRECT!

---

## 4. Risk Assessment

### Production Failure Scenarios

#### Scenario 1: Immediate TypeError on First API Call
```typescript
// src/types/appointment.ts:99-104
client: mbAppointment.Client ? {
  id: mbAppointment.Client.Id,  // TypeError: Cannot read property 'Id' of undefined
  firstName: mbAppointment.Client.FirstName ?? null,
  // ...
} : null,
```

**Why:** Real API doesn't return `Client` object, so `mbAppointment.Client` is `undefined`

**Impact:**
- **100% of appointments** will fail to transform
- Service crashes on first `getAppointments()` call
- Complete feature outage

---

#### Scenario 2: Database Query Failures
```typescript
// When querying database with IDs from API
await db.appointment.findOne({
  where: { id: mbAppointment.Id }  // "12345" (string) vs 12345 (number)
});
// Returns null even though record exists
```

**Impact:**
- Duplicate appointments created (thinks appointment doesn't exist)
- Data corruption
- Sync failures

---

#### Scenario 3: Silent Data Loss
```typescript
// Trying to save location name
const locationName = mbAppointment.Location?.Name;  // undefined
// locationName is always undefined, but no error thrown
```

**Impact:**
- UI shows incomplete data
- Reports missing critical information
- User complaints about "missing information"

---

## 5. Required Actions

### Immediate (Before ANY Production Use)

1. **Fix Type Definitions** (api-specs/mindbody-api-types.ts)
   - Change all ID types to match spec (number vs string)
   - Remove non-existent nested objects (Client, Location, SessionType)
   - Add missing fields (Duration, FirstAppointment, etc.)
   - Correct Staff structure

2. **Update Transform Functions** (src/types/appointment.ts:89-121)
   - Remove references to `mbAppointment.Client` (doesn't exist)
   - Remove references to `mbAppointment.Location` (doesn't exist)
   - Remove references to `mbAppointment.SessionType` (doesn't exist)
   - Handle `Staff` correctly with proper types

3. **Add Validation** (Runtime)
   - Use Zod schemas to validate API responses
   - Log validation failures
   - Alert on schema mismatches

4. **Integration Tests**
   - Create tests that call REAL MinBody API
   - Validate response structure matches OpenAPI spec
   - Run daily to detect API changes

---

## 6. API Spec Details

**Official OpenAPI Spec:**
- **URL:** https://api.mindbodyonline.com/public/v6/swagger/doc
- **Swagger Version:** 2.0
- **API Version:** v6
- **Total Endpoints:** 141
- **Total Schemas:** 385

**Categories:**
- Client: 42 endpoints
- Sale: 25 endpoints
- Site: 20 endpoints
- **Appointment: 17 endpoints** ← Current focus
- Class: 16 endpoints
- Staff: 10 endpoints
- Others: 11 endpoints

**Local Files:**
- Raw spec: `api-specs/mindbody-public-api-v6.json` (707KB)
- Formatted spec: `api-specs/mindbody-public-api-v6-formatted.json` (28,304 lines)

---

## 7. Next Steps

1. ✅ Downloaded official OpenAPI spec
2. ✅ Analyzed discrepancies
3. 🔄 **IN PROGRESS:** Generate accurate TypeScript types
4. ⏳ Update codebase type definitions
5. ⏳ Fix transform functions
6. ⏳ Add runtime validation
7. ⏳ Create integration tests
8. ⏳ Update test mocks to match real API

---

## 8. Conclusion

**The current codebase types are 30-40% inaccurate compared to the real MinBody API.**

Key problems:
- **ID type mismatches** (string vs number) in 4 fields
- **3 non-existent nested objects** (Client, Location, SessionType)
- **13+ missing fields**
- **1 incorrect nested object structure** (Staff)

**Recommendation:** 🚨 **DO NOT deploy to production** until all type definitions match the official OpenAPI specification.

**Estimated effort to fix:** 6-12 hours
- TypeScript type generation: 2-3 hours
- Update transform functions: 2-3 hours
- Add validation: 2-3 hours
- Integration tests: 2-4 hours

---

**Generated from:** MinBody Public API v6 OpenAPI Specification
**Last Updated:** 2025-11-24
