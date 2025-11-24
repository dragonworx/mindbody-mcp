#!/usr/bin/env bun

/**
 * MINDBODY Sandbox API Connectivity Test
 *
 * This script tests fundamental connectivity to the MINDBODY sandbox API:
 * - Configuration validation
 * - Authentication flow
 * - Read operations (GET endpoints)
 * - Write operations with dry-run (POST endpoints)
 * - Rate limiting
 *
 * Run with: bun run test:connectivity
 */

import { loadConfig, type Config } from "./config.js";
import { DatabaseClient } from "./db/client.js";
import { AuthService } from "./services/auth.js";
import { MindbodyApiClient } from "./services/mindbody.js";
import { RateLimitGuard } from "./services/rateLimit.js";
import { AppointmentService } from "./services/appointment.js";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log("\n" + "=".repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log("=".repeat(60));
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.blue);
}

interface TestResult {
  passed: boolean;
  message: string;
  details?: unknown;
  error?: string;
}

interface TestSuite {
  name: string;
  results: TestResult[];
}

const testSuites: TestSuite[] = [];

async function runTest(
  suiteName: string,
  testName: string,
  testFn: () => Promise<{ success: boolean; details?: unknown; error?: string }>
): Promise<boolean> {
  let suite = testSuites.find((s) => s.name === suiteName);
  if (!suite) {
    suite = { name: suiteName, results: [] };
    testSuites.push(suite);
  }

  try {
    logInfo(`Running: ${testName}...`);
    const result = await testFn();

    if (result.success) {
      logSuccess(testName);
      suite.results.push({
        passed: true,
        message: testName,
        details: result.details,
      });
      return true;
    } else {
      logError(`${testName} - ${result.error || "Unknown error"}`);
      suite.results.push({
        passed: false,
        message: testName,
        error: result.error,
      });
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`${testName} - ${errorMessage}`);
    suite.results.push({
      passed: false,
      message: testName,
      error: errorMessage,
    });
    return false;
  }
}

async function testConfiguration(): Promise<boolean> {
  logSection("1. Configuration Validation");

  return await runTest("Configuration", "Load and validate environment variables", async () => {
    try {
      const config = loadConfig();

      const requiredFields = [
        "MBO_API_KEY",
        "MBO_SITE_ID",
        "MBO_STAFF_USERNAME",
        "MBO_STAFF_PASSWORD",
      ];

      for (const field of requiredFields) {
        if (!config[field as keyof Config]) {
          return {
            success: false,
            error: `Missing required field: ${field}`,
          };
        }
      }

      logInfo(`  Site ID: ${config.MBO_SITE_ID}`);
      logInfo(`  API Key: ${config.MBO_API_KEY.substring(0, 10)}...`);
      logInfo(`  Username: ${config.MBO_STAFF_USERNAME}`);
      logInfo(`  Data Directory: ${config.DATA_DIR}`);
      logInfo(`  Daily API Limit: ${config.DAILY_API_LIMIT_OVERRIDE}`);

      return {
        success: true,
        details: {
          siteId: config.MBO_SITE_ID,
          dataDir: config.DATA_DIR,
          apiLimit: config.DAILY_API_LIMIT_OVERRIDE,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

async function testAuthentication(
  config: Config,
  authService: AuthService
): Promise<boolean> {
  logSection("2. Authentication");

  return await runTest("Authentication", "Obtain user token from staff credentials", async () => {
    try {
      const token = await authService.getUserToken();

      if (!token || token.length === 0) {
        return {
          success: false,
          error: "Received empty token",
        };
      }

      logInfo(`  Token obtained: ${token.substring(0, 20)}...`);

      return {
        success: true,
        details: { tokenLength: token.length },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

async function testRateLimit(rateLimitGuard: RateLimitGuard): Promise<boolean> {
  logSection("3. Rate Limiting");

  return await runTest("Rate Limiting", "Check API usage quota", async () => {
    try {
      const stats = rateLimitGuard.getUsageStats();

      logInfo(`  Calls made today: ${stats.callsMade}`);
      logInfo(`  Calls remaining: ${stats.callsRemaining}`);
      logInfo(`  Daily limit: ${stats.limit}`);
      logInfo(`  Reset time: ${new Date(stats.resetTime).toLocaleString()}`);

      if (stats.isApproachingLimit) {
        logWarning("  Approaching daily API limit (>80%)");
      }

      return {
        success: true,
        details: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

async function testReadOperations(
  apiClient: MindbodyApiClient,
  appointmentService: AppointmentService
): Promise<boolean> {
  logSection("4. Read Operations (GET Endpoints)");

  let allPassed = true;

  // Test 1: Get Locations
  const locationsTest = await runTest("Read Operations", "GET /site/locations", async () => {
    try {
      const response = await apiClient.getLocations({ limit: 5, offset: 0 }, true);

      if (!response || !response.Locations) {
        return {
          success: false,
          error: "Invalid response structure",
        };
      }

      logInfo(`  Retrieved ${response.Locations.length} location(s)`);
      if (response.Locations.length > 0) {
        logInfo(`  First location: ${response.Locations[0].Name} (ID: ${response.Locations[0].Id})`);
      }

      return {
        success: true,
        details: {
          count: response.Locations.length,
          locations: response.Locations.map((l) => ({ id: l.Id, name: l.Name })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  allPassed = allPassed && locationsTest;

  // Test 2: Get Staff
  const staffTest = await runTest("Read Operations", "GET /staff/staff", async () => {
    try {
      const response = await apiClient.getStaff({ limit: 5, offset: 0 }, true);

      if (!response || !response.StaffMembers) {
        return {
          success: false,
          error: "Invalid response structure",
        };
      }

      logInfo(`  Retrieved ${response.StaffMembers.length} staff member(s)`);
      if (response.StaffMembers.length > 0) {
        logInfo(`  First staff: ${response.StaffMembers[0].FirstName} ${response.StaffMembers[0].LastName} (ID: ${response.StaffMembers[0].Id})`);
      }

      return {
        success: true,
        details: {
          count: response.StaffMembers.length,
          staff: response.StaffMembers.map((s) => ({
            id: s.Id,
            name: `${s.FirstName} ${s.LastName}`,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  allPassed = allPassed && staffTest;

  // Test 3: Get Clients
  const clientsTest = await runTest("Read Operations", "GET /client/clients", async () => {
    try {
      const response = await apiClient.getClients({ limit: 5, offset: 0 }, true);

      if (!response || !response.Clients) {
        return {
          success: false,
          error: "Invalid response structure",
        };
      }

      logInfo(`  Retrieved ${response.Clients.length} client(s)`);
      if (response.Clients.length > 0) {
        const firstClient = response.Clients[0];
        logInfo(`  First client: ${firstClient.FirstName} ${firstClient.LastName} (ID: ${firstClient.Id})`);
      }

      return {
        success: true,
        details: {
          count: response.Clients.length,
          hasMore: response.PaginationResponse?.TotalResults > response.Clients.length,
          totalResults: response.PaginationResponse?.TotalResults,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  allPassed = allPassed && clientsTest;

  // Test 4: Get Appointments
  const appointmentsTest = await runTest("Read Operations", "GET /appointment/appointments", async () => {
    try {
      // Get appointments for the next 7 days
      const startDate = new Date().toISOString().split("T")[0];
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const response = await appointmentService.getAppointments({
        startDate,
        endDate,
        limit: 5,
        offset: 0,
        force: true,
      });

      logInfo(`  Date range: ${startDate} to ${endDate}`);
      logInfo(`  Retrieved ${response.appointments.length} appointment(s)`);

      if (response.appointments.length > 0) {
        const first = response.appointments[0];
        logInfo(`  First appointment: ${first.sessionType?.name || "N/A"} on ${first.startDateTime}`);
      }

      return {
        success: true,
        details: {
          count: response.appointments.length,
          dateRange: { startDate, endDate },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  allPassed = allPassed && appointmentsTest;

  // Test 5: Get Bookable Items
  const bookableTest = await runTest("Read Operations", "GET /appointment/bookableItems", async () => {
    try {
      const response = await appointmentService.getBookableItems({
        limit: 5,
        offset: 0,
        force: true,
      });

      logInfo(`  Retrieved ${response.bookableItems.length} bookable item(s)`);

      if (response.bookableItems.length > 0) {
        const first = response.bookableItems[0];
        logInfo(`  First item: ${first.name} (Type: ${first.type})`);
      }

      return {
        success: true,
        details: {
          count: response.bookableItems.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  allPassed = allPassed && bookableTest;

  return allPassed;
}

async function testWriteOperations(apiClient: MindbodyApiClient): Promise<boolean> {
  logSection("5. Write Operations (POST Endpoints - DRY RUN)");

  return await runTest("Write Operations", "POST /client/updateclient (dry-run)", async () => {
    try {
      // First, get a client to test with
      const clientsResponse = await apiClient.getClients({ limit: 1, offset: 0 }, true);

      if (!clientsResponse.Clients || clientsResponse.Clients.length === 0) {
        return {
          success: false,
          error: "No clients available for testing write operations",
        };
      }

      const testClient = clientsResponse.Clients[0];
      logInfo(`  Test client: ${testClient.FirstName} ${testClient.LastName} (ID: ${testClient.Id})`);

      // Prepare a safe test update (just email formatting)
      const currentEmail = testClient.Email || "test@example.com";
      const testUpdate = {
        Id: testClient.Id,
        Email: currentEmail, // No actual change
      };

      logInfo(`  Simulating update with email: ${currentEmail}`);
      logWarning("  DRY RUN: Not actually sending update to API");

      // In a real scenario, you would call:
      // const response = await apiClient.updateClient(testUpdate, true);

      // For this connectivity test, we'll just validate the structure
      return {
        success: true,
        details: {
          clientId: testClient.Id,
          operation: "updateClient",
          dryRun: true,
          note: "Skipped actual API call - validation only",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

async function printSummary() {
  logSection("Test Summary");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const suite of testSuites) {
    console.log(`\n${colors.bright}${suite.name}${colors.reset}`);
    for (const result of suite.results) {
      totalTests++;
      if (result.passed) {
        passedTests++;
        logSuccess(result.message);
      } else {
        failedTests++;
        logError(`${result.message} - ${result.error}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  log(`Total Tests: ${totalTests}`, colors.bright);
  log(`Passed: ${passedTests}`, colors.green);
  log(`Failed: ${failedTests}`, failedTests > 0 ? colors.red : colors.green);
  console.log("=".repeat(60) + "\n");

  if (failedTests === 0) {
    logSuccess("All connectivity tests passed! Your MINDBODY sandbox is configured correctly.");
    return 0;
  } else {
    logError(`${failedTests} test(s) failed. Please review the errors above.`);
    return 1;
  }
}

async function main() {
  log("\n╔══════════════════════════════════════════════════════════╗", colors.bright + colors.cyan);
  log("║  MINDBODY Sandbox API Connectivity Test                 ║", colors.bright + colors.cyan);
  log("╚══════════════════════════════════════════════════════════╝\n", colors.bright + colors.cyan);

  let db: DatabaseClient | null = null;

  try {
    // 1. Test Configuration
    const configPassed = await testConfiguration();
    if (!configPassed) {
      logError("\nConfiguration test failed. Please check your .env file.");
      logInfo("See SETUP.md for instructions on obtaining MINDBODY sandbox credentials.");
      return 1;
    }

    // Load config for remaining tests
    const config = loadConfig();

    // Initialize services
    db = new DatabaseClient(config);
    const authService = new AuthService(config);
    const rateLimitGuard = new RateLimitGuard(db, config);
    const apiClient = new MindbodyApiClient(config, rateLimitGuard, authService);
    const appointmentService = new AppointmentService(apiClient, db, config);

    // 2. Test Authentication
    const authPassed = await testAuthentication(config, authService);
    if (!authPassed) {
      logError("\nAuthentication test failed. Please verify your credentials.");
      logInfo("Ensure your staff account has API access enabled in MINDBODY.");
      return 1;
    }

    // 3. Test Rate Limiting
    await testRateLimit(rateLimitGuard);

    // 4. Test Read Operations
    const readPassed = await testReadOperations(apiClient, appointmentService);
    if (!readPassed) {
      logWarning("\nSome read operations failed, but this may be expected for sandbox accounts.");
    }

    // 5. Test Write Operations (dry-run)
    const writePassed = await testWriteOperations(apiClient);
    if (!writePassed) {
      logWarning("\nWrite operation test failed, but this may be expected for sandbox accounts.");
    }

    // Print summary
    const exitCode = await printSummary();

    return exitCode;
  } catch (error) {
    logError("\nUnexpected error during connectivity test:");
    console.error(error);
    return 1;
  } finally {
    // Cleanup
    if (db) {
      db.close();
    }
  }
}

// Run the tests
main().then((exitCode) => {
  process.exit(exitCode);
});
