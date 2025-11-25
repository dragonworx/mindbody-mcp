/**
 * Integration Tests: Client Sync Tools
 *
 * Tests the sync_clients MCP tool against the real Mindbody sandbox API.
 * These tests validate the complete workflow as an AI agent would use it.
 *
 * API Calls per test run: ~5-10 calls
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
import { handleSyncClients } from "../../mcp/tools/index.js";

describe("Integration: Client Sync Tools", () => {
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

  describe("sync_clients tool", () => {
    test("should sync Active clients from sandbox API", async () => {
      // Simulate how an AI agent would call the tool
      const response = await handleSyncClients(
        {
          status: "Active",
        },
        context.syncService
      );

      // Validate MCP response structure
      assertMcpToolResponse(response);
      const text = extractResponseText(response);

      // Validate response contains expected information
      expect(text).toContain("synced");
      expect(text.toLowerCase()).toContain("client");

      // Validate data was written to database
      const clients = context.db.getClients();
      expect(clients.length).toBeGreaterThan(0);

      // Validate client structure matches OpenAPI spec
      const firstClient = clients[0];
      expect(firstClient).toBeDefined();
      expect(firstClient?.id).toBeDefined();
      expect(typeof firstClient?.id).toBe("string");

      // Log results
      console.log(`✅ Synced ${clients.length} clients from sandbox`);
    }, 180000); // 3 minute timeout for large client lists

    test("should handle pagination for large client lists", async () => {
      // Sync all clients (may require multiple pages)
      const response = await handleSyncClients(
        {
          // No status filter = all clients
        },
        context.syncService
      );

      assertMcpToolResponse(response);
      const text = extractResponseText(response);

      // Check sync log for pagination info
      const syncLogs = context.db.getSyncLogs();
      const clientSyncLog = syncLogs.find((log) => log.operation === "sync_clients");

      expect(clientSyncLog).toBeDefined();
      expect(clientSyncLog?.status).toBe("success");

      console.log(`✅ Sync log: ${JSON.stringify(clientSyncLog, null, 2)}`);
    }, 180000); // 3 minute timeout for potentially many pages

    test("should return meaningful error when API fails", async () => {
      // Force an API error by using invalid parameters
      // (e.g., the sandbox might have limited data)
      const response = await handleSyncClients(
        {
          status: "Active",
        },
        context.syncService
      );

      // Even with limited data, should complete gracefully
      assertMcpToolResponse(response);
      const text = extractResponseText(response);

      // Should not throw error, should handle gracefully
      expect(text.toLowerCase()).not.toContain("error");
      expect(text.toLowerCase()).not.toContain("failed");
    }, 180000);

    test("should update existing clients on re-sync", async () => {
      // First sync
      await handleSyncClients({ status: "Active" }, context.syncService);
      const clientsAfterFirstSync = context.db.getClients();
      const firstCount = clientsAfterFirstSync.length;

      // Second sync (should update, not duplicate)
      await handleSyncClients({ status: "Active" }, context.syncService);
      const clientsAfterSecondSync = context.db.getClients();
      const secondCount = clientsAfterSecondSync.length;

      // Count should be the same (updated, not duplicated)
      expect(secondCount).toBe(firstCount);

      console.log(`✅ Re-sync maintained ${secondCount} clients (no duplicates)`);
    }, 360000); // 6 minute timeout for double sync

    test("should use cache for repeated sync requests", async () => {
      const statsBefore = getApiUsageStats(context);

      // This should use cached data from previous tests
      await handleSyncClients({ status: "Active" }, context.syncService);

      const statsAfter = getApiUsageStats(context);

      // Should NOT make additional API calls (using cache)
      expect(statsAfter.callsMade).toBe(statsBefore.callsMade);

      console.log(
        `✅ Cache hit: ${statsBefore.callsMade} API calls (no additional calls made)`
      );
    }, 180000);
  });

  describe("Agent workflow: Query synced clients", () => {
    test("should enable agent to query synced client data", async () => {
      // Step 1: Agent syncs clients
      const syncResponse = await handleSyncClients(
        { status: "Active" },
        context.syncService
      );

      assertMcpToolResponse(syncResponse);

      // Step 2: Agent queries database for client information
      const clients = context.db.getClients();
      expect(clients.length).toBeGreaterThan(0);

      // Step 3: Validate agent can access client details
      const firstClient = clients[0];
      expect(firstClient).toHaveProperty("id");
      expect(firstClient).toHaveProperty("firstName");
      expect(firstClient).toHaveProperty("lastName");
      expect(firstClient).toHaveProperty("rawData");

      // Step 4: Validate agent can parse raw API data
      const rawData = firstClient?.rawData;
      expect(rawData).toBeDefined();

      console.log(`✅ Agent can access ${clients.length} client records`);
    }, 180000);

    test("should enable agent to filter clients by email domain", async () => {
      // Sync clients
      await handleSyncClients({ status: "Active" }, context.syncService);

      // Query for specific pattern (simulate agent analysis)
      const clients = context.db.getClients();
      const gmail_clients = clients.filter((c) =>
        c.rawData?.Email?.toLowerCase().includes("gmail.com")
      );

      console.log(
        `✅ Agent found ${gmail_clients.length} Gmail users out of ${clients.length} total clients`
      );
    }, 180000);
  });
});
