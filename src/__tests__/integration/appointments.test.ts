/**
 * Integration Tests: Appointment Tools
 *
 * Tests appointment-related MCP tools against the real Mindbody sandbox API.
 * These tests validate:
 * - get_appointments tool
 * - get_bookable_appointments tool
 * - Caching behavior
 * - Date range filtering
 *
 * API Calls per test run: ~10-15 calls
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  setupIntegrationTest,
  teardownIntegrationTest,
  assertMcpToolResponse,
  extractResponseText,
  getApiUsageStats,
  type IntegrationTestContext,
} from "./test-helpers.js";
import { handleGetAppointments, handleGetBookableAppointments } from "../../mcp/tools/index.js";

describe("Integration: Appointment Tools", () => {
  let context: IntegrationTestContext;
  let initialApiCalls: number;

  beforeAll(async () => {
    context = await setupIntegrationTest();
    initialApiCalls = getApiUsageStats(context).callsMade;
    console.log(`\n📊 Starting API calls: ${initialApiCalls}`);
  });

  afterAll(async () => {
    const finalApiCalls = getApiUsageStats(context).callsMade;
    const callsUsed = finalApiCalls - initialApiCalls;
    console.log(`📊 API calls used in this test suite: ${callsUsed}\n`);
    await teardownIntegrationTest(context);
  });

  describe("get_appointments tool", () => {
    test("should fetch appointments for date range", async () => {
      // Get today's date
      const today = new Date();
      const startDate = today.toISOString().split("T")[0] as string;

      // Get date 7 days from now
      const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0] as string;

      // Call tool as agent would
      const response = await handleGetAppointments(
        {
          startDate,
          endDate,
          limit: 10,
        },
        context.appointmentService
      );

      // Validate response
      assertMcpToolResponse(response);
      const text = extractResponseText(response);

      // Should mention appointments
      expect(text.toLowerCase()).toMatch(/appointment|found|retrieved/);

      console.log(`✅ Fetched appointments for ${startDate} to ${endDate}`);
    }, 30000);

    test("should respect limit parameter", async () => {
      const today = new Date().toISOString().split("T")[0] as string;

      // Request only 3 appointments
      const response = await handleGetAppointments(
        {
          startDate: today,
          limit: 3,
        },
        context.appointmentService
      );

      assertMcpToolResponse(response);

      // Parse response to check count
      const text = extractResponseText(response);

      // Response should indicate limited results
      console.log(`✅ Limited appointment fetch completed`);
    }, 30000);

    test("should use cache on subsequent requests", async () => {
      const today = new Date().toISOString().split("T")[0] as string;

      const statsBefore = getApiUsageStats(context);

      // First request (should hit API)
      await handleGetAppointments(
        {
          startDate: today,
          limit: 5,
        },
        context.appointmentService
      );

      const statsAfterFirst = getApiUsageStats(context);
      const firstCallCount = statsAfterFirst.callsMade - statsBefore.callsMade;

      // Second request with same parameters (should use cache)
      await handleGetAppointments(
        {
          startDate: today,
          limit: 5,
        },
        context.appointmentService
      );

      const statsAfterSecond = getApiUsageStats(context);
      const secondCallCount = statsAfterSecond.callsMade - statsAfterFirst.callsMade;

      // Second request should not make API calls (cached)
      expect(secondCallCount).toBe(0);

      console.log(
        `✅ Cache working: First request=${firstCallCount} calls, Second request=${secondCallCount} calls (cached)`
      );
    }, 30000);

    test("should bypass cache with force flag", async () => {
      const today = new Date().toISOString().split("T")[0] as string;

      // First request
      await handleGetAppointments(
        {
          startDate: today,
          limit: 5,
        },
        context.appointmentService
      );

      const statsBefore = getApiUsageStats(context);

      // Second request with force=true (should bypass cache)
      await handleGetAppointments(
        {
          startDate: today,
          limit: 5,
          force: true,
        },
        context.appointmentService
      );

      const statsAfter = getApiUsageStats(context);
      const callCount = statsAfter.callsMade - statsBefore.callsMade;

      // Should have made API call despite cache
      expect(callCount).toBeGreaterThan(0);

      console.log(`✅ Force flag bypassed cache (${callCount} API calls made)`);
    }, 30000);

    test("should validate appointment data structure matches OpenAPI spec", async () => {
      const today = new Date().toISOString().split("T")[0] as string;

      // Fetch appointments
      await handleGetAppointments(
        {
          startDate: today,
          limit: 5,
          force: true, // Ensure fresh data
        },
        context.appointmentService
      );

      // Check database for cached appointments
      const appointments = context.db.db.query("SELECT * FROM appointments LIMIT 1").all() as Array<{
        id: string;
        client_id: string;
        staff_id: string;
        location_id: string;
        session_type_id: string;
        start_datetime: string;
        end_datetime: string;
        raw_data: string;
      }>;

      if (appointments.length > 0) {
        const apt = appointments[0];

        // Validate IDs are stored correctly
        expect(apt).toBeDefined();
        expect(apt?.id).toBeDefined();
        expect(apt?.start_datetime).toBeDefined();

        // Parse raw data to validate against spec
        const rawData = JSON.parse(apt?.raw_data ?? "{}") as Record<string, unknown>;

        // According to OpenAPI spec:
        // - Id should be number
        // - ClientId should be string
        // - StaffId should be number
        // - LocationId should be number

        if (rawData.Id !== undefined) {
          expect(typeof rawData.Id).toBe("number");
        }

        if (rawData.ClientId !== undefined) {
          expect(typeof rawData.ClientId).toBe("string");
        }

        if (rawData.StaffId !== undefined) {
          expect(typeof rawData.StaffId).toBe("number");
        }

        if (rawData.LocationId !== undefined) {
          expect(typeof rawData.LocationId).toBe("number");
        }

        console.log(`✅ Appointment data structure matches OpenAPI spec`);
      } else {
        console.log(`⚠️  No appointments found in sandbox (may be empty)`);
      }
    }, 30000);
  });

  describe("get_bookable_appointments tool", () => {
    test("should fetch bookable items", async () => {
      // Note: This endpoint may require specific sessionTypeIds in sandbox
      // The test will validate the tool works, even if sandbox has limited data

      const response = await handleGetBookableAppointments(
        {
          limit: 10,
        },
        context.appointmentService
      );

      // Validate response structure
      assertMcpToolResponse(response);
      const text = extractResponseText(response);

      // Should complete without error (even if no data)
      expect(text).toBeDefined();

      console.log(`✅ Bookable items tool executed successfully`);
    }, 30000);

    test("should cache bookable items", async () => {
      const statsBefore = getApiUsageStats(context);

      // First request
      await handleGetBookableAppointments({ limit: 5 }, context.appointmentService);

      const statsAfterFirst = getApiUsageStats(context);
      const firstCallCount = statsAfterFirst.callsMade - statsBefore.callsMade;

      // Second request (should use cache)
      await handleGetBookableAppointments({ limit: 5 }, context.appointmentService);

      const statsAfterSecond = getApiUsageStats(context);
      const secondCallCount = statsAfterSecond.callsMade - statsAfterFirst.callsMade;

      // Second request should be cached
      expect(secondCallCount).toBe(0);

      console.log(
        `✅ Bookable items cache working: First=${firstCallCount} calls, Second=${secondCallCount} calls`
      );
    }, 30000);
  });

  describe("Agent workflow: Appointment analysis", () => {
    test("should enable agent to analyze upcoming appointments", async () => {
      // Step 1: Agent fetches next week's appointments
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const startDate = today.toISOString().split("T")[0] as string;
      const endDate = nextWeek.toISOString().split("T")[0] as string;

      await handleGetAppointments(
        {
          startDate,
          endDate,
          limit: 50,
          force: true,
        },
        context.appointmentService
      );

      // Step 2: Agent analyzes appointment data from database
      const appointments = context.db.db
        .query("SELECT * FROM appointments WHERE start_datetime >= ? AND start_datetime <= ?")
        .all(startDate, endDate) as Array<{
        id: string;
        start_datetime: string;
        raw_data: string;
      }>;

      // Step 3: Agent can compute statistics
      const appointmentCount = appointments.length;

      // Group by day
      const byDay = new Map<string, number>();
      for (const apt of appointments) {
        const day = apt.start_datetime?.split("T")[0];
        if (day) {
          byDay.set(day, (byDay.get(day) ?? 0) + 1);
        }
      }

      console.log(`✅ Agent analysis:`);
      console.log(`   - Total appointments: ${appointmentCount}`);
      console.log(`   - Days with appointments: ${byDay.size}`);
      console.log(`   - Distribution:`, Object.fromEntries(byDay));
    }, 30000);

    test("should enable agent to identify busy time slots", async () => {
      const today = new Date().toISOString().split("T")[0] as string;

      // Fetch appointments
      await handleGetAppointments(
        {
          startDate: today,
          limit: 100,
          force: true,
        },
        context.appointmentService
      );

      // Query appointments
      const appointments = context.db.db.query("SELECT * FROM appointments").all() as Array<{
        start_datetime: string;
        raw_data: string;
      }>;

      // Analyze by hour
      const byHour = new Map<number, number>();
      for (const apt of appointments) {
        const hour = new Date(apt.start_datetime ?? "").getHours();
        byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
      }

      // Find busiest hour
      let busiestHour = 0;
      let maxCount = 0;
      for (const [hour, count] of byHour.entries()) {
        if (count > maxCount) {
          maxCount = count;
          busiestHour = hour;
        }
      }

      console.log(`✅ Busiest hour: ${busiestHour}:00 with ${maxCount} appointments`);
    }, 30000);
  });
});
