# MINDBODY Sandbox Setup Guide

This guide explains how to set up your MINDBODY developer account and configure the MCP server for sandbox testing.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Create MINDBODY Developer Account](#step-1-create-mindbody-developer-account)
- [Step 2: Get Sandbox Credentials](#step-2-get-sandbox-credentials)
- [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
- [Step 4: Test Connectivity](#step-4-test-connectivity)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Bun.js**: Version 1.1.0 or higher ([Install Bun](https://bun.sh/docs/installation))
- **MINDBODY Developer Account**: Free to create
- **Stable Internet Connection**: For API calls

---

## Step 1: Create MINDBODY Developer Account

### 1.1 Sign Up for Developer Portal

1. Visit the MINDBODY Developer Portal: [https://developers.mindbodyonline.com/](https://developers.mindbodyonline.com/)
2. Click **"Sign Up"** or **"Get Started"**
3. Fill out the registration form:
   - Email address
   - Password
   - Company/Organization name
   - Purpose (select "Integration Development" or "API Testing")
4. Verify your email address

### 1.2 Accept Terms of Service

1. Log in to the Developer Portal
2. Review and accept the MINDBODY API Terms of Service
3. Complete any additional onboarding steps

---

## Step 2: Get Sandbox Credentials

### 2.1 Request Sandbox Site Access

The MINDBODY sandbox is a **free test environment** with sample data.

1. Log in to [https://developers.mindbodyonline.com/](https://developers.mindbodyonline.com/)
2. Navigate to **"Sandbox"** or **"Test Environment"**
3. Request access to a sandbox site:
   - You may receive an existing sandbox site
   - Or create a new sandbox site with sample data

#### Sandbox Site Login
- Studio Id: `-99`
- User Name: `mindbodysandbox99@gmail.com`
- Password: `Apitest1234`

#### Your API credentials
Source name: `CyberOptixSoftware`

### 2.2 Obtain API Key

1. In the Developer Portal, go to **"My Applications"** or **"API Keys"**
2. Click **"Create New Application"** or **"Generate API Key"**
3. Fill in application details:
   - **Name**: `mindbody-mcp-test` (or any descriptive name)
   - **Description**: Testing MCP server connectivity
   - **Environment**: Sandbox
4. Copy your **API Key** (it looks like: `_xxxxxxxxxxxxxxxxxxxxxxxxxx`)
5. **IMPORTANT**: Save this key securely - you cannot retrieve it later

### 2.3 Get Site ID

Your sandbox site will have a **Site ID** (a numeric identifier).

1. In the Developer Portal, navigate to **"Sandbox Sites"**
2. Find your assigned sandbox site
3. Note the **Site ID** (example: `-99`, `123456`, etc.)
   - Sandbox sites often use negative numbers (e.g., `-99`)
   - Production sites use positive numbers

### 2.4 Get Staff Credentials

You need a staff account with API access permissions.

1. In the Developer Portal or sandbox documentation, find:
   - **Staff Username**: Often provided as `Siteowner` or similar
   - **Staff Password**: Provided by MINDBODY for sandbox
2. If not provided, you may need to:
   - Log in to your sandbox site via the MINDBODY Business app
   - Create a staff user with **"API Access"** permissions
   - Or contact MINDBODY support for sandbox credentials

**Common Sandbox Staff Credentials** (may vary):
```
Username: Siteowner
Password: apitest1234
```

**Note**: These are example credentials. Use the actual credentials provided by MINDBODY for your sandbox.

---

## Step 3: Configure Environment Variables

### 3.1 Copy Environment Template

```bash
cd /path/to/mindobody-mcp
cp .env.example .env
```

### 3.2 Edit `.env` File

Open `.env` in your text editor and fill in your credentials:

```env
# MINDBODY API Credentials (REQUIRED)
MBO_API_KEY=_your_api_key_from_step_2.2
MBO_SITE_ID=-99
MBO_STAFF_USERNAME=Siteowner
MBO_STAFF_PASSWORD=apitest1234

# Optional Configuration
MCP_SERVER_NAME=mindbody-migrator
LOG_LEVEL=info
DATA_DIR=./data
DAILY_API_LIMIT_OVERRIDE=950
```

**Field Descriptions:**

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `MBO_API_KEY` | Yes | API Key from Developer Portal | `_xxxxxxxxxxxxxxxxxxxxxx` |
| `MBO_SITE_ID` | Yes | Sandbox Site ID | `-99` |
| `MBO_STAFF_USERNAME` | Yes | Staff account username | `Siteowner` |
| `MBO_STAFF_PASSWORD` | Yes | Staff account password | `apitest1234` |
| `MCP_SERVER_NAME` | No | Display name for MCP server | `mindbody-migrator` |
| `LOG_LEVEL` | No | Logging verbosity | `info` |
| `DATA_DIR` | No | SQLite database directory | `./data` |
| `DAILY_API_LIMIT_OVERRIDE` | No | API call limit per day | `950` |

### 3.3 Verify File Permissions

Ensure `.env` is not committed to version control:

```bash
# Should already be in .gitignore
grep -q ".env" .gitignore && echo "✓ .env is ignored" || echo "✗ Add .env to .gitignore"
```

---

## Step 4: Test Connectivity

### 4.1 Install Dependencies

```bash
bun install
```

### 4.2 Run Connectivity Test

```bash
bun run test:connectivity
```

### 4.3 Expected Output

If successful, you should see:

```
╔══════════════════════════════════════════════════════════╗
║  MINDBODY Sandbox API Connectivity Test                 ║
╚══════════════════════════════════════════════════════════╝

============================================================
1. Configuration Validation
============================================================
ℹ Running: Load and validate environment variables...
  Site ID: -99
  API Key: _xxxxxxxxx...
  Username: Siteowner
  Data Directory: ./data
  Daily API Limit: 950
✓ Load and validate environment variables

============================================================
2. Authentication
============================================================
ℹ Running: Obtain user token from staff credentials...
  Token obtained: eyJhbGciOiJIUzI1NiIs...
✓ Obtain user token from staff credentials

============================================================
3. Rate Limiting
============================================================
ℹ Running: Check API usage quota...
  Calls made today: 15
  Calls remaining: 935
  Daily limit: 950
  Reset time: 12/31/2024, 12:00:00 AM
✓ Check API usage quota

============================================================
4. Read Operations (GET Endpoints)
============================================================
ℹ Running: GET /site/locations...
  Retrieved 2 location(s)
  First location: Main Studio (ID: 1)
✓ GET /site/locations

ℹ Running: GET /staff/staff...
  Retrieved 3 staff member(s)
  First staff: John Doe (ID: 100000001)
✓ GET /staff/staff

ℹ Running: GET /client/clients...
  Retrieved 5 client(s)
  First client: Jane Smith (ID: 100000123)
✓ GET /client/clients

ℹ Running: GET /appointment/appointments...
  Date range: 2024-01-15 to 2024-01-22
  Retrieved 8 appointment(s)
  First appointment: 60-Minute Massage on 2024-01-15T10:00:00Z
✓ GET /appointment/appointments

ℹ Running: GET /appointment/bookableItems...
  Retrieved 12 bookable item(s)
  First item: Swedish Massage (Type: Appointment)
✓ GET /appointment/bookableItems

============================================================
5. Write Operations (POST Endpoints - DRY RUN)
============================================================
ℹ Running: POST /client/updateclient (dry-run)...
  Test client: Jane Smith (ID: 100000123)
  Simulating update with email: jane.smith@example.com
⚠  DRY RUN: Not actually sending update to API
✓ POST /client/updateclient (dry-run)

============================================================
Test Summary
============================================================

Configuration
✓ Load and validate environment variables

Authentication
✓ Obtain user token from staff credentials

Rate Limiting
✓ Check API usage quota

Read Operations
✓ GET /site/locations
✓ GET /staff/staff
✓ GET /client/clients
✓ GET /appointment/appointments
✓ GET /appointment/bookableItems

Write Operations
✓ POST /client/updateclient (dry-run)

============================================================
Total Tests: 11
Passed: 11
Failed: 0
============================================================

✓ All connectivity tests passed! Your MINDBODY sandbox is configured correctly.
```

---

## Troubleshooting

### Issue 1: "Missing required field: MBO_API_KEY"

**Cause**: Environment variables not loaded or `.env` file missing.

**Solution**:
1. Ensure `.env` file exists in project root
2. Verify all required fields are filled
3. Restart your terminal session

```bash
# Check if .env exists
ls -la .env

# Verify contents
cat .env
```

---

### Issue 2: "Authentication failed: 401 Unauthorized"

**Cause**: Invalid API key, Site ID, or staff credentials.

**Solution**:
1. Verify API key from Developer Portal (should start with `_`)
2. Confirm Site ID matches your sandbox site
3. Check staff username and password
4. Ensure staff account has "API Access" permission
5. Try regenerating your API key

**Debug Steps**:
```bash
# Test authentication manually
curl -X POST "https://api.mindbodyonline.com/public/v6/usertoken/issue" \
  -H "Content-Type: application/json" \
  -H "Api-Key: YOUR_API_KEY" \
  -H "SiteId: YOUR_SITE_ID" \
  -d '{"Username":"YOUR_USERNAME","Password":"YOUR_PASSWORD"}'
```

---

### Issue 3: "Rate limit exceeded"

**Cause**: You've made more than 1000 API calls today.

**Solution**:
1. Wait until midnight UTC for reset
2. Review `DAILY_API_LIMIT_OVERRIDE` in `.env`
3. Use `force: false` in tool calls to respect limits
4. Check current usage:

```bash
# Run connectivity test to see usage
bun run test:connectivity
```

---

### Issue 4: "No clients/appointments returned"

**Cause**: Sandbox site may have limited or no sample data.

**Solution**:
1. This is normal for new sandbox sites
2. You can populate data via:
   - MINDBODY Business web app (sandbox login)
   - POST endpoints (create clients, appointments)
3. Some sandbox sites come pre-populated with sample data
4. Contact MINDBODY support to request a sandbox with sample data

---

### Issue 5: "Cannot find module 'zod'"

**Cause**: Dependencies not installed.

**Solution**:
```bash
bun install
```

---

### Issue 6: "Permission denied" when accessing database

**Cause**: Data directory doesn't exist or lacks write permissions.

**Solution**:
```bash
# Create data directory
mkdir -p ./data

# Fix permissions (Unix/macOS)
chmod 755 ./data
```

---

## Additional Resources

### MINDBODY Developer Documentation
- **Main Portal**: [https://developers.mindbodyonline.com/](https://developers.mindbodyonline.com/)
- **API Reference**: [https://developers.mindbodyonline.com/PublicDocumentation/V6](https://developers.mindbodyonline.com/PublicDocumentation/V6)
- **API Explorer**: [https://developers.mindbodyonline.com/explorer](https://developers.mindbodyonline.com/explorer)
- **Support**: [https://support.mindbodyonline.com/s/](https://support.mindbodyonline.com/s/)

### Sandbox Limitations
- **Free**: No cost for sandbox usage
- **API Rate Limit**: 1000 calls per day per Site ID
- **Data**: Sample data or empty site
- **Features**: Full API access (same as production)
- **Environment**: Isolated from production data

### Production Migration
When ready to migrate to production:

1. Obtain production Site ID
2. Create production staff account with API access
3. Update `.env` with production credentials
4. Increase `DAILY_API_LIMIT_OVERRIDE` if approved by MINDBODY
5. Test with production data cautiously

---

## Next Steps

After successful connectivity test:

1. **Explore MCP Tools**: Use Claude Desktop to interact with MINDBODY data
2. **Sync Clients**: Run `sync_clients` tool to populate local database
3. **Export Sales**: Test `export_sales_history` for data migration
4. **Build Integrations**: Develop custom workflows using MCP tools

---

## Need Help?

- **MCP Server Issues**: Open an issue in this repository
- **MINDBODY API Questions**: Contact [MINDBODY Developer Support](https://support.mindbodyonline.com/s/)
- **Sandbox Access**: Email [devsupport@mindbodyonline.com](mailto:devsupport@mindbodyonline.com)

---

**Last Updated**: 2024-01-24
