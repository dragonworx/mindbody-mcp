/**
 * Integration Tests: Sales Export Tools
 *
 * Tests sales export MCP tools against the real Mindbody sandbox API.
 * These tests validate:
 * - export_sales_history tool
 * - Date range chunking for large exports
 * - CSV export functionality
 *
 * API Calls per test run: ~5-15 calls (depending on date range)
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { existsSync } from "fs";
import { unlink } from "fs/promises";
import {
  setupIntegrationTest,
  teardownIntegrationTest,
  assertMcpToolResponse,
  extractResponseText,
  getApiUsageStats,
  type IntegrationTestContext,
} from "./test-helpers.js";
import { handleExportSalesHistory } from "../../mcp/tools/index.js";

describe("Integration: Sales Export Tools", () => {
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

  describe("export_sales_history tool", () => {
    test("should export sales for 7-day period", async () => {
      // Calculate date range (7 days ago to today)
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const startDate = sevenDaysAgo.toISOString().split("T")[0] as string;
      const endDate = today.toISOString().split("T")[0] as string;

      // Call tool as agent would
      const response = await handleExportSalesHistory(
        {
          startDate,
          endDate,
        },
        context.syncService,
        context.config
      );

      // Validate response
      assertMcpToolResponse(response);
      const text = extractResponseText(response);

      // Should mention export completion
      expect(text.toLowerCase()).toMatch(/export|sales|completed/);

      // Should have written to database
      const summary = context.db.getCacheSummary();
      expect(summary).toHaveProperty("sales");

      console.log(`✅ Exported sales for ${startDate} to ${endDate}`);
      console.log(`   Total sales in cache: ${summary.sales}`);
    }, 60000); // 60s timeout for potentially large export

    test("should handle date range chunking for 30-day period", async () => {
      // 30-day period should be chunked into ~4-5 weekly chunks
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const startDate = thirtyDaysAgo.toISOString().split("T")[0] as string;
      const endDate = today.toISOString().split("T")[0] as string;

      const statsBefore = getApiUsageStats(context);

      const response = await handleExportSalesHistory(
        {
          startDate,
          endDate,
        },
        context.syncService,
        context.config
      );

      const statsAfter = getApiUsageStats(context);
      const apiCallsMade = statsAfter.callsMade - statsBefore.callsMade;

      assertMcpToolResponse(response);

      // Should have made multiple API calls (one per chunk)
      expect(apiCallsMade).toBeGreaterThan(1);

      console.log(
        `✅ 30-day export completed with ${apiCallsMade} API calls (date chunking working)`
      );
    }, 120000); // 2 minute timeout

    test("should export to CSV file", async () => {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const startDate = sevenDaysAgo.toISOString().split("T")[0] as string;
      const endDate = today.toISOString().split("T")[0] as string;

      const response = await handleExportSalesHistory(
        {
          startDate,
          endDate,
          format: "csv",
        },
        context.syncService,
        context.config
      );

      assertMcpToolResponse(response);
      const text = extractResponseText(response);

      // Should mention CSV file location
      expect(text.toLowerCase()).toContain(".csv");

      // Extract file path from response
      const filePathMatch = text.match(/([^\s]+\.csv)/);
      if (filePathMatch) {
        const filePath = filePathMatch[1];

        // Check file exists
        expect(existsSync(filePath ?? "")).toBe(true);

        console.log(`✅ CSV export created at: ${filePath}`);

        // Clean up
        if (filePath && existsSync(filePath)) {
          await unlink(filePath);
        }
      }
    }, 60000);

    test("should handle empty date ranges gracefully", async () => {
      // Use future dates (should have no sales)
      const futureStart = new Date();
      futureStart.setFullYear(futureStart.getFullYear() + 1);
      const futureEnd = new Date(futureStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      const startDate = futureStart.toISOString().split("T")[0] as string;
      const endDate = futureEnd.toISOString().split("T")[0] as string;

      const response = await handleExportSalesHistory(
        {
          startDate,
          endDate,
        },
        context.syncService,
        context.config
      );

      assertMcpToolResponse(response);
      const text = extractResponseText(response);

      // Should complete without error
      expect(text).toBeDefined();
      expect(text.toLowerCase()).not.toContain("error");

      console.log(`✅ Handled empty date range gracefully`);
    }, 60000);

    test("should track sync logs", async () => {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const startDate = sevenDaysAgo.toISOString().split("T")[0] as string;
      const endDate = today.toISOString().split("T")[0] as string;

      await handleExportSalesHistory(
        {
          startDate,
          endDate,
        },
        context.syncService,
        context.config
      );

      // Check sync logs
      const logs = context.db.getSyncLogs();
      const salesLog = logs.find((log) => log.operation === "sync_sales");

      expect(salesLog).toBeDefined();
      expect(salesLog?.status).toBe("completed");

      console.log(`✅ Sync log recorded: ${JSON.stringify(salesLog, null, 2)}`);
    }, 60000);
  });

  describe("Agent workflow: Sales analysis", () => {
    test("should enable agent to analyze sales trends", async () => {
      // Step 1: Export sales data
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const startDate = thirtyDaysAgo.toISOString().split("T")[0] as string;
      const endDate = today.toISOString().split("T")[0] as string;

      await handleExportSalesHistory(
        {
          startDate,
          endDate,
        },
        context.syncService,
        context.config
      );

      // Step 2: Query sales from database
      const sales = context.db.db.query("SELECT * FROM sales").all() as Array<{
        id: string;
        sale_date: string;
        raw_data: string;
      }>;

      // Step 3: Agent analyzes data
      const salesByDay = new Map<string, number>();
      for (const sale of sales) {
        const day = sale.sale_date?.split("T")[0];
        if (day) {
          salesByDay.set(day, (salesByDay.get(day) ?? 0) + 1);
        }
      }

      console.log(`✅ Sales analysis:`);
      console.log(`   - Total sales: ${sales.length}`);
      console.log(`   - Days with sales: ${salesByDay.size}`);

      if (sales.length > 0) {
        // Calculate average sales per day
        const avgPerDay = sales.length / Math.max(salesByDay.size, 1);
        console.log(`   - Average per day: ${avgPerDay.toFixed(2)}`);
      }
    }, 120000);

    test("should enable agent to calculate revenue", async () => {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const startDate = sevenDaysAgo.toISOString().split("T")[0] as string;
      const endDate = today.toISOString().split("T")[0] as string;

      await handleExportSalesHistory(
        {
          startDate,
          endDate,
        },
        context.syncService,
        context.config
      );

      // Query sales
      const sales = context.db.db.query("SELECT * FROM sales").all() as Array<{
        raw_data: string;
      }>;

      // Calculate total revenue
      let totalRevenue = 0;
      for (const sale of sales) {
        const data = JSON.parse(sale.raw_data ?? "{}") as { TotalAmount?: number };
        totalRevenue += data.TotalAmount ?? 0;
      }

      console.log(`✅ Revenue calculation:`);
      console.log(`   - Total sales transactions: ${sales.length}`);
      console.log(`   - Total revenue: $${totalRevenue.toFixed(2)}`);
    }, 60000);

    test("should enable agent to identify top clients by sales", async () => {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const startDate = sevenDaysAgo.toISOString().split("T")[0] as string;
      const endDate = today.toISOString().split("T")[0] as string;

      await handleExportSalesHistory(
        {
          startDate,
          endDate,
        },
        context.syncService,
        context.config
      );

      // Query and analyze
      const sales = context.db.db.query("SELECT * FROM sales").all() as Array<{
        raw_data: string;
      }>;

      const salesByClient = new Map<string, number>();
      for (const sale of sales) {
        const data = JSON.parse(sale.raw_data ?? "{}") as {
          ClientId?: string;
          TotalAmount?: number;
        };
        if (data.ClientId) {
          const current = salesByClient.get(data.ClientId) ?? 0;
          salesByClient.set(data.ClientId, current + (data.TotalAmount ?? 0));
        }
      }

      // Get top 5 clients
      const topClients = Array.from(salesByClient.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      console.log(`✅ Top clients by revenue:`);
      for (const [clientId, revenue] of topClients) {
        console.log(`   - Client ${clientId}: $${revenue.toFixed(2)}`);
      }
    }, 60000);
  });
});
