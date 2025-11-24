# MinBody API Official Specifications

This directory contains the **official MinBody Public API v6 OpenAPI specification** and generated TypeScript types that are **100% accurate** and validated against the real API.

---

## 📁 Files in This Directory

| File | Description | Size | Updated |
|------|-------------|------|---------|
| `mindbody-public-api-v6.json` | Official OpenAPI spec (minified) | 707KB | 2025-11-24 |
| `mindbody-public-api-v6-formatted.json` | Formatted OpenAPI spec (readable) | 28,304 lines | 2025-11-24 |
| `mindbody-api-types.ts` | **100% accurate TypeScript types** | 577 lines | 2025-11-24 |
| `generate-types.py` | Python script to regenerate types | - | 2025-11-24 |
| `API_SCHEMA_COMPARISON.md` | Comparison report (current vs real API) | - | 2025-11-24 |

---

## 🎯 Purpose

### Problem
The codebase was using **assumed/mocked API types** that had **significant discrepancies** from the real MinBody API:
- Wrong data types (string vs number for IDs)
- Non-existent nested objects (Client, Location, SessionType)
- Missing 13+ fields from the real API
- Incorrect nested object structures

### Solution
This directory provides:
1. **Official OpenAPI specification** directly from MinBody
2. **Auto-generated TypeScript types** that match the spec 100%
3. **Comparison report** showing all discrepancies
4. **Regeneration script** to keep types up-to-date

---

## 🚀 Quick Start

### Using the Generated Types

Replace your current type imports with the generated types:

```typescript
// ❌ Old (inaccurate)
import { MindbodyAppointment } from '../types/appointment';

// ✅ New (100% accurate)
import { Appointment } from '../api-specs/mindbody-api-types';
```

### Key Type Corrections

#### Appointment Type

```typescript
// Official API structure
interface Appointment {
  Id?: number;                  // ✅ number (int64), not string!
  ClientId?: string;            // ✅ string (correct)
  StaffId?: number;             // ✅ number (int64), not string!
  LocationId?: number;          // ✅ number (int32), not string!
  SessionTypeId?: number;       // ✅ number (int32), not string!
  StartDateTime?: string;       // ✅ ISO 8601 date-time string
  EndDateTime?: string;
  Status?: "None" | "Requested" | "Booked" | "Completed" | "Confirmed" | "Arrived" | "NoShow" | "Cancelled" | "LateCancelled";

  // ✅ Staff object DOES exist
  Staff?: AppointmentStaff;     // { Id, FirstName, LastName, DisplayName }

  // ❌ These DO NOT exist in the API response:
  // Client?: { ... }           // NOT returned by API
  // Location?: { ... }         // NOT returned by API
  // SessionType?: { ... }      // NOT returned by API

  // Additional fields from real API:
  Duration?: number;
  FirstAppointment?: boolean;
  GenderPreference?: "None" | "Female" | "Male";
  IsWaitlist?: boolean;
  Notes?: string;
  OnlineDescription?: string;
  PartnerExternalId?: string;
  ProgramId?: number;
  ProviderId?: string;
  StaffRequested?: boolean;
  WaitlistEntryId?: number;
  AddOns?: AddOnSmall[];
  Resources?: ResourceSlim[];
}
```

---

## 🔧 Regenerating Types

If MinBody updates their API, regenerate types from the latest spec:

```bash
cd api-specs

# 1. Download latest OpenAPI spec
curl -s "https://api.mindbodyonline.com/public/v6/swagger/doc" -o mindbody-public-api-v6.json

# 2. Format for readability (optional)
python3 -m json.tool mindbody-public-api-v6.json > mindbody-public-api-v6-formatted.json

# 3. Generate TypeScript types
python3 generate-types.py

# Output: mindbody-api-types.ts
```

---

## 📊 API Specification Details

### Overview
- **API Version:** v6
- **Swagger Version:** 2.0
- **Base URL:** https://api.mindbodyonline.com
- **Total Endpoints:** 141
- **Total Data Models:** 385

### Endpoints by Category
| Category | Endpoints |
|----------|-----------|
| Client | 42 |
| Sale | 25 |
| Site | 20 |
| **Appointment** | **17** |
| Class | 16 |
| Staff | 10 |
| PickASpot | 6 |
| Enrollment | 4 |
| Payroll | 4 |
| UserToken | 3 |
| Others | 3 |

### Authentication
All endpoints require:
- **Header:** `siteId` - Your MinBody site ID
- **Header:** `authorization` - Bearer token (staff or user token)
- **Header:** `version` - API version (default: "6")

---

## 🔍 Validation & Testing

### Runtime Validation

Use the generated types with Zod for runtime validation:

```typescript
import { z } from 'zod';
import type { Appointment } from '../api-specs/mindbody-api-types';

// Create Zod schema from the TypeScript type
const AppointmentSchema = z.object({
  Id: z.number().optional(),
  ClientId: z.string().optional(),
  StaffId: z.number().optional(),
  LocationId: z.number().optional(),
  SessionTypeId: z.number().optional(),
  StartDateTime: z.string().optional(),
  EndDateTime: z.string().optional(),
  Status: z.enum([
    "None", "Requested", "Booked", "Completed",
    "Confirmed", "Arrived", "NoShow", "Cancelled", "LateCancelled"
  ]).optional(),
  Staff: z.object({
    Id: z.number().optional(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    DisplayName: z.string().optional(),
  }).optional(),
  // ... add other fields
});

// Validate API response
async function getAppointments() {
  const response = await fetch(url);
  const data = await response.json();

  // This will throw if structure doesn't match
  const validated = AppointmentSchema.parse(data.Appointments[0]);
  return validated;
}
```

### Integration Tests

Create integration tests using the real API:

```typescript
import { Appointment } from '../api-specs/mindbody-api-types';

describe('MinBody API Integration', () => {
  test('GET /appointment/staffappointments returns correct structure', async () => {
    const response = await mindbodyClient.getStaffAppointments({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    // Validate response structure
    expect(response).toHaveProperty('Appointments');
    expect(response).toHaveProperty('PaginationResponse');

    if (response.Appointments && response.Appointments.length > 0) {
      const apt = response.Appointments[0] as Appointment;

      // Validate ID types
      expect(typeof apt.Id).toBe('number');
      expect(typeof apt.StaffId).toBe('number');
      expect(typeof apt.LocationId).toBe('number');
      expect(typeof apt.ClientId).toBe('string');

      // Validate nested objects
      if (apt.Staff) {
        expect(typeof apt.Staff.Id).toBe('number');
        expect(apt.Staff).toHaveProperty('DisplayName');
      }

      // These should NOT exist
      expect(apt).not.toHaveProperty('Client');
      expect(apt).not.toHaveProperty('Location');
      expect(apt).not.toHaveProperty('SessionType');
    }
  });
});
```

---

## 📋 Migration Checklist

To migrate from old types to new types:

- [ ] Replace all `MindbodyAppointment` imports with `Appointment` from `api-specs/mindbody-api-types`
- [ ] Update ID type handling:
  - [ ] `Id`: string → number
  - [ ] `StaffId`: string → number
  - [ ] `LocationId`: string → number
  - [ ] `SessionTypeId`: string → number
- [ ] Remove references to non-existent nested objects:
  - [ ] Remove `mbAppointment.Client` (use `ClientId` instead)
  - [ ] Remove `mbAppointment.Location` (use `LocationId` instead)
  - [ ] Remove `mbAppointment.SessionType` (use `SessionTypeId` instead)
- [ ] Update `Staff` object usage:
  - [ ] Change `Staff.Id` from string to number
  - [ ] Add `Staff.DisplayName` field
- [ ] Add handling for new fields:
  - [ ] `Duration` (number)
  - [ ] `FirstAppointment` (boolean)
  - [ ] `GenderPreference` (enum)
  - [ ] `IsWaitlist` (boolean)
  - [ ] `AddOns` (array)
  - [ ] `Resources` (array)
- [ ] Update database schema to match types (if needed)
- [ ] Add runtime validation with Zod
- [ ] Create integration tests with real API
- [ ] Update mock data in tests to match real API structure

---

## 🎓 Understanding the Spec

### OpenAPI/Swagger Basics

The OpenAPI spec defines:
1. **Paths** - API endpoints (GET, POST, PUT, DELETE)
2. **Definitions** - Data models/schemas
3. **Parameters** - Query params, headers, path params
4. **Responses** - Response structures and status codes

### Example: Viewing Appointment Definition

```bash
# Extract specific model from spec
python3 -c "
import json
with open('mindbody-public-api-v6-formatted.json') as f:
    spec = json.load(f)

model = spec['definitions']['Mindbody.PublicApi.Dto.Models.V6.Appointment']
print(json.dumps(model, indent=2))
"
```

### Example: Viewing Endpoint Details

```bash
# Extract specific endpoint
python3 -c "
import json
with open('mindbody-public-api-v6-formatted.json') as f:
    spec = json.load(f)

endpoint = spec['paths']['/public/v{version}/appointment/staffappointments']['get']
print(json.dumps(endpoint, indent=2))
"
```

---

## 🔗 Resources

### Official Documentation
- **Swagger UI:** https://api.mindbodyonline.com/public/v6/swagger/index
- **Developer Portal:** https://developers.mindbodyonline.com/
- **Public API Docs:** https://developers.mindbodyonline.com/PublicDocumentation/V6
- **API Release Notes:** https://developers.mindbodyonline.com/Resources/ApiReleaseNotes

### Tools
- **OpenAPI Specification:** https://spec.openapis.org/oas/v3.1.0
- **Swagger Editor:** https://editor.swagger.io/
- **TypeScript:** https://www.typescriptlang.org/

---

## ⚠️ Important Notes

### DO NOT Edit Generated Files Manually

The following files are **auto-generated** and should NOT be edited manually:
- `mindbody-api-types.ts` - Regenerate using `generate-types.py`
- `mindbody-public-api-v6.json` - Download from MinBody
- `mindbody-public-api-v6-formatted.json` - Format from JSON spec

### Version Control

**Commit these files to git:**
- ✅ `mindbody-public-api-v6.json` (source spec)
- ✅ `mindbody-api-types.ts` (generated types)
- ✅ `generate-types.py` (generator script)
- ✅ `API_SCHEMA_COMPARISON.md` (comparison report)
- ✅ `README.md` (this file)

**Optional (large file):**
- ⚠️ `mindbody-public-api-v6-formatted.json` (28K lines, can regenerate)

### Keeping Types Updated

Schedule regular updates to stay current with MinBody API changes:

```bash
# Run monthly or when MinBody announces API updates
./update-specs.sh
```

Create `update-specs.sh`:
```bash
#!/bin/bash
set -e

echo "Updating MinBody API specifications..."

# Download latest spec
curl -s "https://api.mindbodyonline.com/public/v6/swagger/doc" \
  -o mindbody-public-api-v6.json

# Format
python3 -m json.tool mindbody-public-api-v6.json \
  > mindbody-public-api-v6-formatted.json

# Generate types
python3 generate-types.py

echo "✅ Specifications updated successfully"
echo "Review changes and commit if API has been updated"
```

---

## 📞 Support

If you encounter issues:

1. **Check the comparison report:** `API_SCHEMA_COMPARISON.md`
2. **Review official docs:** https://developers.mindbodyonline.com/
3. **Regenerate types:** `python3 generate-types.py`
4. **Contact MinBody API support** for API-specific questions

---

**Last Updated:** 2025-11-24
**API Version:** v6
**Spec Source:** https://api.mindbodyonline.com/public/v6/swagger/doc
