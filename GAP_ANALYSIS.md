# Mindbody MCP Server - Comprehensive Gap Analysis

**Version:** 1.0.0
**Date:** 2024-11-24
**API Version:** Mindbody Public API v6

## Executive Summary

This gap analysis compares the current MCP server implementation against the full capabilities of the Mindbody Public API v6. The analysis reveals that **only 4 out of approximately 80+ API endpoints are currently implemented**, representing roughly **5% coverage** of the complete API surface.

### Current Coverage: 5% ✗
- ✅ Implemented: 4 endpoints (Basic client and sales operations)
- ❌ Missing: 76+ endpoints (Scheduling, classes, memberships, packages, staff, payroll, locations, etc.)

---

## Table of Contents

1. [What's Currently Implemented](#whats-currently-implemented)
2. [Complete Mindbody API v6 Capabilities](#complete-mindbody-api-v6-capabilities)
3. [Detailed Gap Analysis by Category](#detailed-gap-analysis-by-category)
4. [Priority Recommendations](#priority-recommendations)
5. [Implementation Roadmap](#implementation-roadmap)

---

## What's Currently Implemented

### ✅ Implemented Tools (4)

| Tool | Endpoint(s) Used | Coverage |
|------|-----------------|----------|
| `sync_clients` | GET `/client/clients` | Partial - Read-only client list |
| `export_sales_history` | GET `/sale/sales` | Partial - Read-only sales transactions |
| `analyze_formula_notes` | GET `/client/clientformulanotes` | Partial - Read-only notes |
| `write_client_profile` | POST `/client/updateclient` | Partial - Update existing clients only |

### ✅ Implemented Resources (3)

- `mindbody://quota/status` - Local rate limit tracking
- `mindbody://sync/logs` - Local operation logs
- `mindbody://cache/summary` - Local database statistics

### Current Limitations

1. **Client Management**: Cannot create new clients, only update existing ones
2. **Sales**: Read-only; cannot create sales, process payments, or manage pricing
3. **No Scheduling**: Cannot view or manage appointments or classes
4. **No Memberships/Packages**: Cannot access or manage contracts, packages, or pricing options
5. **No Staff Management**: Cannot access staff information or schedules
6. **No Location/Site Data**: Cannot retrieve business locations or resources
7. **No Class Management**: Cannot view, book, or manage classes
8. **No Enrollment Management**: Cannot manage enrollment programs
9. **No Payroll**: Cannot access payroll data

---

## Complete Mindbody API v6 Capabilities

The Mindbody Public API v6 is organized into **9 major categories** with 80+ total endpoints:

### API Categories

1. **Appointment** (~12 endpoints)
2. **Class** (~15 endpoints)
3. **Client** (~20 endpoints)
4. **Enrollment** (~6 endpoints)
5. **Payroll** (~5 endpoints)
6. **Sale** (~15 endpoints)
7. **Site** (~12 endpoints)
8. **Staff** (~8 endpoints)
9. **UserToken** (~2 endpoints)

---

## Detailed Gap Analysis by Category

### 1. Client Management 👤

**Current Coverage: 20% (4/20 endpoints)**

#### ✅ Implemented (4)
- GET `/client/clients` - List clients (via sync_clients)
- POST `/client/updateclient` - Update existing clients (via write_client_profile)
- GET `/client/clientformulanotes` - Get formula notes (via analyze_formula_notes)
- GET `/client/clients/{clientId}` - Get single client (partial, through sync)

#### ❌ Missing Critical Endpoints (16)

| Endpoint | HTTP | Purpose | Business Impact |
|----------|------|---------|-----------------|
| `/client/addclient` | POST | Create new clients | **CRITICAL** - Cannot onboard new customers |
| `/client/clientcompleteinfo` | GET | Get comprehensive client data | Missing full profile details |
| `/client/clientcontracts` | GET | View client memberships/contracts | Cannot see what clients have purchased |
| `/client/clientindexes` | GET | Get custom client fields | Missing custom data |
| `/client/clientpurchases` | GET | View purchase history | Limited sales insights |
| `/client/clientreferraltypes` | GET | Referral tracking | No marketing attribution |
| `/client/clientservices` | GET | Active services/packages | Cannot see service entitlements |
| `/client/clientvisits` | GET | Visit history | No attendance tracking |
| `/client/contactlogs` | GET/POST | Client communication logs | Cannot track interactions |
| `/client/customclientfields` | GET | Custom field definitions | Missing business-specific fields |
| `/client/crossregionalclientassociations` | GET | Multi-location client data | No enterprise features |
| `/client/activeClientMemberships` | GET | Active membership status | Cannot verify access rights |
| `/client/sendPasswordResetEmail` | POST | Password resets | No self-service support |
| `/client/uploadClientDocument` | POST | Document storage | Cannot attach files |
| `/client/uploadClientPhoto` | POST | Profile photos | Limited UX |
| `/client/requiredClientFields` | GET | Field requirements | Form validation issues |

**Business Impact:**
- ❌ Cannot perform full client lifecycle management
- ❌ No visibility into client purchases and services
- ❌ Missing critical data for personalization
- ❌ Cannot handle document uploads (waivers, contracts)

---

### 2. Appointment Management 📅

**Current Coverage: 0% (0/12 endpoints)**

#### ❌ All Endpoints Missing (12)

| Endpoint | HTTP | Purpose | Business Impact |
|----------|------|---------|-----------------|
| `/appointment/addappointment` | POST | Create appointments | **CRITICAL** - Core scheduling feature missing |
| `/appointment/appointments` | GET | List appointments | Cannot view schedule |
| `/appointment/bookableItems` | GET | Available appointment types | Cannot show options to users |
| `/appointment/staffAppointments` | GET | Staff schedules | No staff management |
| `/appointment/updateappointment` | POST | Modify appointments | Cannot reschedule |
| `/appointment/scheduleItems` | GET | Schedule availability | Cannot check openings |
| `/appointment/appointmentOptions` | GET | Booking options | Missing configuration |
| `/appointment/appointmentAddOns` | GET | Service add-ons | Cannot upsell |
| `/appointment/cancelAppointment` | POST | Cancel bookings | Manual cancellation required |
| `/appointment/checkoutShoppingCart` | POST | Complete booking | No checkout flow |
| `/appointment/addItemToShoppingCart` | POST | Multi-service booking | Limited booking UX |
| `/appointment/removeFromShoppingCart` | POST | Modify cart | Cannot edit selections |

**Business Impact:**
- ❌ **CRITICAL**: No appointment scheduling capability at all
- ❌ Cannot build booking interfaces
- ❌ No availability checking
- ❌ Missing core business functionality for service-based businesses

**Use Cases Blocked:**
- Salon/spa appointment booking
- Fitness training sessions
- Medical/therapy appointments
- Any time-based service scheduling

---

### 3. Class Management 🏋️

**Current Coverage: 0% (0/15 endpoints)**

#### ❌ All Endpoints Missing (15)

| Endpoint | HTTP | Purpose | Business Impact |
|----------|------|---------|-----------------|
| `/class/classes` | GET | List class schedule | **CRITICAL** - Cannot view classes |
| `/class/classDescriptions` | GET | Class details | No class information |
| `/class/classSchedules` | GET | Recurring schedule | Cannot show weekly schedule |
| `/class/addClientToClass` | POST | Book class spot | **CRITICAL** - Cannot reserve spots |
| `/class/removeClientFromClass` | POST | Cancel class booking | Cannot manage cancellations |
| `/class/classVisits` | GET | Class attendance | No attendance tracking |
| `/class/waitlistEntries` | GET | Waitlist management | Cannot handle capacity |
| `/class/addClientToWaitlist` | POST | Add to waitlist | No overflow handling |
| `/class/removeClientFromWaitlist` | POST | Remove from waitlist | Manual waitlist management |
| `/class/substituteClassTeacher` | POST | Staff substitutions | No teacher changes |
| `/class/cancelClass` | POST | Class cancellations | Cannot notify cancellations |
| `/class/bookableItems` | GET | Available classes | Cannot show options |
| `/class/semesterSchedule` | GET | Long-term planning | No semester view |
| `/class/checkoutShoppingCart` | POST | Multi-class booking | No checkout |
| `/class/addItemToShoppingCart` | POST | Add to cart | Single-class only |

**Business Impact:**
- ❌ **CRITICAL**: No group fitness/class functionality
- ❌ Cannot build class schedules
- ❌ No waitlist management
- ❌ Missing core functionality for studios/gyms

**Use Cases Blocked:**
- Yoga studios
- Fitness bootcamps
- Group training
- Dance classes
- Any group-based services

---

### 4. Sale Management 💳

**Current Coverage: 10% (2/15 endpoints)**

#### ✅ Implemented (2)
- GET `/sale/sales` - List sales transactions (via export_sales_history)
- GET `/sale/sales/{saleId}` - Get sale details (partial)

#### ❌ Missing Critical Endpoints (13)

| Endpoint | HTTP | Purpose | Business Impact |
|----------|------|---------|-----------------|
| `/sale/checkoutShoppingCart` | POST | Process payments | **CRITICAL** - Cannot sell anything |
| `/sale/purchaseContract` | POST | Sell memberships | No membership sales |
| `/sale/contracts` | GET | Available contracts | Cannot show pricing |
| `/sale/services` | GET | Service catalog | No service listings |
| `/sale/packages` | GET | Package offerings | Cannot display packages |
| `/sale/products` | GET | Retail products | No retail sales |
| `/sale/customPaymentMethods` | GET | Payment options | Limited payment types |
| `/sale/giftCards` | GET/POST | Gift card management | No gift cards |
| `/sale/transactions` | GET | Payment transactions | Limited financial data |
| `/sale/contractPricingOptions` | GET | Pricing tiers | No pricing flexibility |
| `/sale/addOrUpdateContactLogs` | POST | Sale notes | No sale documentation |
| `/sale/refundPayment` | POST | Process refunds | Manual refund process |
| `/sale/voidSale` | POST | Cancel sales | Cannot reverse sales |

**Business Impact:**
- ❌ **CRITICAL**: Cannot process any payments or sales
- ❌ Cannot sell memberships, packages, or products
- ❌ No pricing information available
- ❌ No refund/void capabilities
- ❌ Read-only sales data only

**Use Cases Blocked:**
- E-commerce integration
- Point-of-sale systems
- Membership sales
- Package purchases
- Retail product sales

---

### 5. Site/Location Management 🏢

**Current Coverage: 0% (0/12 endpoints)**

#### ❌ All Endpoints Missing (12)

| Endpoint | HTTP | Purpose | Business Impact |
|----------|------|---------|-----------------|
| `/site/locations` | GET | Business locations | Cannot show multi-location data |
| `/site/programs` | GET | Available programs | No program visibility |
| `/site/sessionTypes` | GET | Service types | Missing service catalog |
| `/site/resources` | GET | Equipment/rooms | No resource management |
| `/site/relationships` | GET | Client relationships | No family/group features |
| `/site/activationcode` | GET | Integration setup | Manual configuration |
| `/site/countries` | GET | Supported countries | Limited internationalization |
| `/site/stateprovinces` | GET | Geographic data | Form validation issues |
| `/site/genders` | GET | Gender options | Limited profile fields |
| `/site/mobileProviders` | GET | SMS providers | No SMS features |
| `/site/paymentMethods` | GET | Available payment types | Limited payment info |
| `/site/sites` | GET | Multi-site access | No enterprise features |

**Business Impact:**
- ❌ No multi-location support
- ❌ Cannot retrieve business configuration
- ❌ Missing resource/equipment management
- ❌ No program/service categorization

**Use Cases Blocked:**
- Multi-location businesses
- Franchise operations
- Resource booking (rooms, equipment)
- Service categorization

---

### 6. Staff Management 👥

**Current Coverage: 0% (0/8 endpoints)**

#### ❌ All Endpoints Missing (8)

| Endpoint | HTTP | Purpose | Business Impact |
|----------|------|---------|-----------------|
| `/staff/staff` | GET | List staff members | No staff directory |
| `/staff/staffPermissions` | GET | Staff access levels | No permission management |
| `/staff/availabilities` | GET | Staff schedules | Cannot check availability |
| `/staff/loginLocations` | GET | Staff locations | No location tracking |
| `/staff/getStaffImageURL` | GET | Staff photos | Limited UX |
| `/staff/addStaff` | POST | Create staff accounts | Cannot onboard staff |
| `/staff/updateStaff` | POST | Modify staff data | Manual staff updates |
| `/staff/staffAppointments` | GET | Staff bookings | No schedule visibility |

**Business Impact:**
- ❌ No staff management capabilities
- ❌ Cannot display staff profiles
- ❌ No availability checking
- ❌ Missing team management features

**Use Cases Blocked:**
- Staff directories
- Provider selection
- Availability displays
- Staff scheduling

---

### 7. Enrollment Management 🎓

**Current Coverage: 0% (0/6 endpoints)**

#### ❌ All Endpoints Missing (6)

| Endpoint | HTTP | Purpose | Business Impact |
|----------|------|---------|-----------------|
| `/enrollment/enrollments` | GET | List enrollments | No enrollment visibility |
| `/enrollment/addClientToEnrollment` | POST | Enroll clients | **CRITICAL** - Cannot enroll |
| `/enrollment/removeClientFromEnrollment` | POST | Unenroll clients | Manual unenrollment |
| `/enrollment/programs` | GET | Available programs | No program catalog |
| `/enrollment/classSchedules` | GET | Program schedules | No schedule info |
| `/enrollment/waitlistEntries` | GET | Enrollment waitlists | No waitlist management |

**Business Impact:**
- ❌ **CRITICAL**: No enrollment program support
- ❌ Cannot manage courses/programs
- ❌ Missing education/training features

**Use Cases Blocked:**
- Multi-week courses
- Training programs
- Certification programs
- Educational series

---

### 8. Payroll Management 💰

**Current Coverage: 0% (0/5 endpoints)**

#### ❌ All Endpoints Missing (5)

| Endpoint | HTTP | Purpose | Business Impact |
|----------|------|---------|-----------------|
| `/payroll/classTeacherSchedules` | GET | Instructor assignments | No instructor tracking |
| `/payroll/getTimeCard` | GET | Time clock data | No time tracking |
| `/payroll/tips` | GET | Tip distribution | Cannot track tips |
| `/payroll/staffCommissions` | GET | Commission calculations | No commission reports |
| `/payroll/classInstructorSchedule` | GET | Teaching schedules | Limited scheduling |

**Business Impact:**
- ❌ No payroll/compensation features
- ❌ Cannot track instructor time
- ❌ No commission management
- ❌ Missing financial reporting

**Use Cases Blocked:**
- Payroll integration
- Commission tracking
- Time & attendance
- Instructor management

---

### 9. Authentication (UserToken) 🔐

**Current Coverage: 50% (1/2 endpoints)**

#### ✅ Implemented (1)
- POST `/usertoken/issue` - Generate authentication tokens (internally used)

#### ❌ Missing (1)

| Endpoint | HTTP | Purpose | Business Impact |
|----------|------|---------|-----------------|
| `/usertoken/revoke` | POST | Invalidate tokens | Cannot force logout |

**Business Impact:**
- ⚠️ Minor: Cannot explicitly revoke tokens (they expire naturally)

---

## Summary Statistics

### Coverage by Category

| Category | Implemented | Total Available | Coverage % | Priority |
|----------|-------------|-----------------|------------|----------|
| **Client** | 4 | 20 | 20% | 🔴 High |
| **Sale** | 2 | 15 | 13% | 🔴 Critical |
| **Appointment** | 0 | 12 | 0% | 🔴 Critical |
| **Class** | 0 | 15 | 0% | 🔴 Critical |
| **Site** | 0 | 12 | 0% | 🟡 Medium |
| **Staff** | 0 | 8 | 0% | 🟡 Medium |
| **Enrollment** | 0 | 6 | 0% | 🟡 Medium |
| **Payroll** | 0 | 5 | 0% | 🟢 Low |
| **UserToken** | 1 | 2 | 50% | ✅ Adequate |
| **TOTAL** | **7** | **95** | **7%** | - |

### Functionality Gaps by Business Function

| Business Function | Can Do | Cannot Do | Impact |
|-------------------|---------|-----------|--------|
| **Client Management** | View, update existing | Create, manage documents, track visits | 🟡 Medium |
| **Scheduling** | Nothing | Appointments, classes, availability | 🔴 Critical |
| **Sales/Commerce** | View transactions | Process payments, sell products/memberships | 🔴 Critical |
| **Staff Management** | Nothing | View staff, schedules, permissions | 🔴 High |
| **Multi-Location** | Nothing | Location data, site configuration | 🟡 Medium |
| **Programs/Enrollments** | Nothing | Courses, training programs | 🟡 Medium |
| **Reporting** | Sales list, client list | Detailed analytics, commission, payroll | 🟡 Medium |

---

## Priority Recommendations

### 🔴 CRITICAL - Must Implement (Blocks Core Use Cases)

These gaps prevent the MCP from handling basic business operations:

1. **Appointment Scheduling (Priority #1)**
   - `GET /appointment/appointments` - View schedule
   - `GET /appointment/bookableItems` - Available services
   - `POST /appointment/addappointment` - Create bookings
   - `POST /appointment/updateappointment` - Reschedule
   - `POST /appointment/cancelAppointment` - Cancel bookings
   - **Impact**: Service-based businesses cannot function

2. **Class Management (Priority #2)**
   - `GET /class/classes` - View class schedule
   - `GET /class/classDescriptions` - Class details
   - `POST /class/addClientToClass` - Book classes
   - `POST /class/removeClientFromClass` - Cancel bookings
   - **Impact**: Fitness studios/group services blocked

3. **Sales Processing (Priority #3)**
   - `GET /sale/contracts` - View memberships
   - `GET /sale/packages` - View packages
   - `GET /sale/services` - Service catalog
   - `POST /sale/purchaseContract` - Sell memberships
   - `POST /sale/checkoutShoppingCart` - Process payments
   - **Impact**: Cannot generate revenue

4. **Complete Client Management (Priority #4)**
   - `POST /client/addclient` - Create new clients
   - `GET /client/clientservices` - Active services
   - `GET /client/clientcontracts` - Membership status
   - `GET /client/clientvisits` - Attendance history
   - **Impact**: Incomplete customer lifecycle

### 🟡 HIGH - Should Implement (Major Features)

5. **Staff Management**
   - `GET /staff/staff` - Staff directory
   - `GET /staff/availabilities` - Staff schedules
   - **Impact**: Cannot show provider options

6. **Site Configuration**
   - `GET /site/locations` - Multi-location support
   - `GET /site/programs` - Program catalog
   - `GET /site/sessionTypes` - Service types
   - **Impact**: Limited business configuration

### 🟢 MEDIUM - Nice to Have (Enhancement)

7. **Enrollment Programs**
   - All enrollment endpoints
   - **Impact**: Educational/course businesses only

8. **Payroll Integration**
   - All payroll endpoints
   - **Impact**: Back-office operations only

---

## Implementation Roadmap

### Phase 1: Core Scheduling (Weeks 1-3)
**Goal**: Enable basic appointment and class booking

**Tools to Add:**
1. `get_appointments` - View appointment schedule
2. `get_classes` - View class schedule
3. `book_appointment` - Create appointments
4. `book_class` - Reserve class spots
5. `get_availability` - Check scheduling availability
6. `cancel_booking` - Cancel appointments/classes

**Resources to Add:**
- `mindbody://schedule/appointments` - Current appointments
- `mindbody://schedule/classes` - Upcoming classes
- `mindbody://schedule/availability` - Open slots

**Estimated API Calls Added:** ~15-20 per operation

---

### Phase 2: Sales & Commerce (Weeks 4-6)
**Goal**: Enable purchasing and membership sales

**Tools to Add:**
1. `get_service_catalog` - Browse services/products
2. `get_memberships` - View membership options
3. `get_packages` - View package offerings
4. `purchase_membership` - Buy memberships
5. `process_payment` - Complete transactions
6. `get_client_purchases` - View purchase history

**Resources to Add:**
- `mindbody://catalog/services` - Available services
- `mindbody://catalog/memberships` - Membership plans
- `mindbody://catalog/packages` - Package options

**Estimated API Calls Added:** ~20-25 per operation

---

### Phase 3: Enhanced Client Management (Weeks 7-8)
**Goal**: Complete client lifecycle

**Tools to Add:**
1. `create_client` - Add new clients
2. `get_client_services` - View active entitlements
3. `get_client_visits` - Attendance tracking
4. `upload_client_document` - Document management
5. `get_client_memberships` - Membership status

**Resources to Add:**
- `mindbody://client/{id}/services` - Client's services
- `mindbody://client/{id}/visits` - Visit history
- `mindbody://client/{id}/memberships` - Active memberships

**Estimated API Calls Added:** ~5-10 per operation

---

### Phase 4: Staff & Configuration (Weeks 9-10)
**Goal**: Multi-user and multi-location support

**Tools to Add:**
1. `get_staff` - Staff directory
2. `get_staff_availability` - Provider schedules
3. `get_locations` - Business locations
4. `get_programs` - Program catalog

**Resources to Add:**
- `mindbody://staff/directory` - All staff
- `mindbody://site/locations` - All locations
- `mindbody://site/programs` - Program list

**Estimated API Calls Added:** ~3-5 per operation

---

### Phase 5: Advanced Features (Weeks 11-12)
**Goal**: Enrollments, waitlists, and advanced booking

**Tools to Add:**
1. `enroll_client` - Course enrollment
2. `add_to_waitlist` - Waitlist management
3. `get_shopping_cart` - Multi-item booking
4. `checkout_cart` - Complete multi-purchase

**Resources to Add:**
- `mindbody://enrollment/programs` - Available programs
- `mindbody://waitlist/status` - Waitlist positions

**Estimated API Calls Added:** ~10-15 per operation

---

## Rate Limit Impact Analysis

### Current State
- Daily limit: 1,000 API calls
- Current tools: 4 (mostly read operations)
- Typical daily usage: 50-200 calls (sync operations)

### With Complete Implementation

**Conservative Estimate (Full Feature Set):**

| Operation Type | Calls/Transaction | Daily Volume (Est.) | Total Calls |
|----------------|-------------------|---------------------|-------------|
| Appointment bookings | 3-5 | 20 bookings | 60-100 |
| Class bookings | 2-3 | 15 bookings | 30-45 |
| Client syncs | 1 per 100 clients | 1000 clients | 10 |
| Sales transactions | 4-6 | 10 sales | 40-60 |
| Staff lookups | 1 | 50 lookups | 50 |
| Availability checks | 2-3 | 30 checks | 60-90 |
| Client creation | 2-3 | 5 new clients | 10-15 |
| **TOTAL DAILY** | - | - | **260-370** |

**Aggressive Usage (Busy Business):**
- Could reach 600-800 calls/day with heavy usage
- Still within 1,000 limit with buffer

**Recommendation**:
- Current 950 limit is appropriate
- Add usage analytics per tool
- Implement caching for read-heavy operations (staff, locations, programs)
- Consider smart caching for:
  - Class schedules (cache 1 hour)
  - Staff directory (cache 24 hours)
  - Service catalog (cache 24 hours)
  - Locations (cache 24 hours)

---

## Database Schema Updates Required

### New Tables Needed

```sql
-- Appointments
CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    staff_id TEXT,
    location_id TEXT,
    session_type_id TEXT,
    start_datetime TEXT,
    end_datetime TEXT,
    status TEXT,
    notes TEXT,
    raw_data JSON,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Classes
CREATE TABLE classes (
    id TEXT PRIMARY KEY,
    class_description_id TEXT,
    staff_id TEXT,
    location_id TEXT,
    start_datetime TEXT,
    end_datetime TEXT,
    max_capacity INTEGER,
    total_booked INTEGER,
    total_waitlist INTEGER,
    is_canceled BOOLEAN,
    raw_data JSON,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Class Bookings
CREATE TABLE class_bookings (
    id TEXT PRIMARY KEY,
    class_id TEXT,
    client_id TEXT,
    visit_id TEXT,
    status TEXT,
    booked_at DATETIME,
    raw_data JSON,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Staff
CREATE TABLE staff (
    id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    image_url TEXT,
    bio TEXT,
    is_active BOOLEAN,
    raw_data JSON,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Locations
CREATE TABLE locations (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    phone TEXT,
    raw_data JSON,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contracts/Memberships
CREATE TABLE contracts (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    sold_online BOOLEAN,
    price REAL,
    autopay_schedule TEXT,
    raw_data JSON,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Client Contracts (purchased memberships)
CREATE TABLE client_contracts (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    contract_id TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT,
    auto_renew BOOLEAN,
    raw_data JSON,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- Services
CREATE TABLE services (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    price REAL,
    online_price REAL,
    tax_included BOOLEAN,
    program_id TEXT,
    raw_data JSON,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Client Services (purchased services/packages)
CREATE TABLE client_services (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    service_id TEXT,
    remaining INTEGER,
    total INTEGER,
    expiration_date TEXT,
    raw_data JSON,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Programs
CREATE TABLE programs (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    schedule_type TEXT,
    cancel_offset INTEGER,
    raw_data JSON,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments
CREATE TABLE enrollments (
    id TEXT PRIMARY KEY,
    program_id TEXT,
    name TEXT,
    start_date TEXT,
    end_date TEXT,
    raw_data JSON,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id)
);

-- Client Enrollments
CREATE TABLE client_enrollments (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    enrollment_id TEXT,
    enrollment_date TEXT,
    status TEXT,
    raw_data JSON,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
);
```

---

## Caching Strategy Recommendations

### High-Value Caching Opportunities

1. **Staff Directory** (24-hour cache)
   - Changes infrequently
   - Heavily accessed
   - Saves ~50-100 calls/day

2. **Class Schedules** (1-hour cache)
   - Relatively stable
   - Frequently queried
   - Saves ~30-50 calls/day

3. **Service Catalog** (24-hour cache)
   - Rarely changes
   - Booking reference data
   - Saves ~40-60 calls/day

4. **Locations** (24-hour cache)
   - Almost never changes
   - Site configuration
   - Saves ~20-30 calls/day

5. **Programs** (24-hour cache)
   - Seasonal updates only
   - Reference data
   - Saves ~10-20 calls/day

**Total Potential Savings:** 150-260 API calls/day through intelligent caching

---

## Testing Recommendations

### Critical Test Scenarios

1. **Appointment Booking Flow**
   - Check availability
   - Book appointment
   - Confirm booking
   - Reschedule
   - Cancel

2. **Class Booking Flow**
   - View schedule
   - Check capacity
   - Book class
   - Waitlist if full
   - Cancel booking

3. **Purchase Flow**
   - Browse catalog
   - Add to cart
   - Apply pricing
   - Process payment
   - Confirm sale

4. **Client Lifecycle**
   - Create client
   - Book service
   - Track visits
   - Renew membership
   - View history

---

## References

- [Mindbody Public API V6.0 Documentation](https://developers.mindbodyonline.com/PublicDocumentation/V6)
- [Mindbody API Endpoints Reference](https://developers.mindbodyonline.com/Resources/Endpoints)
- [Mindbody API Release Notes](https://developers.mindbodyonline.com/Resources/ApiReleaseNotes)
- [Swagger API Explorer](https://api.mindbodyonline.com/public/v6/swagger/index)
- [SplitPass Mindbody API Library](https://github.com/SplitPass/mindbody-api)

---

## Conclusion

The current MCP server provides only **7% coverage** of the Mindbody API v6 capabilities. While it successfully handles basic client listing and sales history viewing, it lacks critical functionality needed for:

### ❌ **Missing Core Features:**
- Appointment scheduling (service businesses)
- Class management (fitness/studios)
- Payment processing (e-commerce)
- Membership sales (subscription businesses)
- Multi-location support (franchises)
- Staff management (multi-provider businesses)

### ✅ **What Works Well:**
- Rate limiting infrastructure
- Authentication management
- Pagination handling
- Local caching foundation
- Basic client sync

### 📈 **Recommended Next Steps:**

1. **Immediate** (Week 1): Implement appointment viewing and booking
2. **Short-term** (Weeks 2-4): Add class management and sales catalog
3. **Medium-term** (Weeks 5-8): Complete client management and payment processing
4. **Long-term** (Weeks 9-12): Staff, locations, and enrollment features

This phased approach will incrementally increase coverage from 7% to approximately 80% over 12 weeks, enabling the MCP to handle most common Mindbody business operations.
