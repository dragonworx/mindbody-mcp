import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  getQuotaStatus,
  getSyncLogs,
  getCacheSummary,
  listResources,
} from "../mcp/resources/index.js";
import { MindbodyApiClient } from "../services/mindbody.js";
import { DatabaseClient } from "../db/client.js";
import { RateLimitGuard } from "../services/rateLimit.js";
import type { Config } from "../config.js";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

describe("MCP Resources", () => {
  let apiClient: MindbodyApiClient;
  let db: DatabaseClient;
  let rateLimitGuard: RateLimitGuard;
  const testConfig: Config = {
    MBO_API_KEY: "test-api-key",
    MBO_SITE_ID: "123456",
    MBO_STAFF_USERNAME: "test-user",
    MBO_STAFF_PASSWORD: "test-pass",
    MCP_SERVER_NAME: "test-server",
    LOG_LEVEL: "info",
    DATA_DIR: "./test-data",
    DAILY_API_LIMIT_OVERRIDE: 950,
  };

  beforeEach(async () => {
    await Bun.write(`${testConfig.DATA_DIR}/.gitkeep`, "");
    db = new DatabaseClient(testConfig);
    rateLimitGuard = new RateLimitGuard(db, testConfig);
    apiClient = new MindbodyApiClient(testConfig, rateLimitGuard);
  });

  afterEach(async () => {
    db.close();
    const dbPath = `${testConfig.DATA_DIR}/mindbody.db`;
    if (existsSync(dbPath)) {
      await unlink(dbPath);
    }
    if (existsSync(`${dbPath}-shm`)) {
      await unlink(`${dbPath}-shm`);
    }
    if (existsSync(`${dbPath}-wal`)) {
      await unlink(`${dbPath}-wal`);
    }
  });

  describe("getQuotaStatus", () => {
    test("should return quota status with no usage", () => {
      const result = getQuotaStatus(apiClient);

      expect(result.uri).toBe("mindbody://quota/status");
      expect(result.mimeType).toBe("application/json");

      const data = JSON.parse(result.text);
      expect(data.callsMade).toBe(0);
      expect(data.limit).toBe(950);
      expect(data.callsRemaining).toBe(950);
      expect(data.status).toBe("available");
      expect(data.isApproachingLimit).toBe(false);
    });

    test("should show correct status with some usage", () => {
      rateLimitGuard.recordCall();
      rateLimitGuard.recordCall();
      rateLimitGuard.recordCall();

      const result = getQuotaStatus(apiClient);
      const data = JSON.parse(result.text);

      expect(data.callsMade).toBe(3);
      expect(data.callsRemaining).toBe(947);
      expect(data.status).toBe("available");
    });

    test("should indicate when approaching limit", () => {
      const today = new Date().toISOString().split("T")[0] as string;
      const threshold = Math.ceil(testConfig.DAILY_API_LIMIT_OVERRIDE * 0.8);

      for (let i = 0; i < threshold; i++) {
        db.incrementApiUsage(today);
      }

      const result = getQuotaStatus(apiClient);
      const data = JSON.parse(result.text);

      expect(data.isApproachingLimit).toBe(true);
    });

    test("should show exhausted status when limit reached", () => {
      const today = new Date().toISOString().split("T")[0] as string;

      for (let i = 0; i < testConfig.DAILY_API_LIMIT_OVERRIDE; i++) {
        db.incrementApiUsage(today);
      }

      const result = getQuotaStatus(apiClient);
      const data = JSON.parse(result.text);

      expect(data.status).toBe("exhausted");
      expect(data.callsRemaining).toBe(0);
    });

    test("should include reset time", () => {
      const result = getQuotaStatus(apiClient);
      const data = JSON.parse(result.text);

      expect(data.resetTime).toBeDefined();
      expect(typeof data.resetTime).toBe("string");

      // Verify it's a valid ISO date
      const resetTime = new Date(data.resetTime);
      expect(resetTime.toString()).not.toBe("Invalid Date");
    });

    test("should include warning threshold", () => {
      const result = getQuotaStatus(apiClient);
      const data = JSON.parse(result.text);

      expect(data.warningThreshold).toBe(testConfig.DAILY_API_LIMIT_OVERRIDE * 0.8);
    });
  });

  describe("getSyncLogs", () => {
    test("should return empty logs for new database", () => {
      const result = getSyncLogs(db);

      expect(result.uri).toBe("mindbody://sync/logs");
      expect(result.mimeType).toBe("application/json");

      const data = JSON.parse(result.text);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    test("should return sync logs", () => {
      db.addSyncLog({
        operation: "sync_clients",
        status: "success",
        message: "Synced 100 clients",
      });

      db.addSyncLog({
        operation: "sync_sales",
        status: "success",
        message: "Synced 50 sales",
      });

      const result = getSyncLogs(db);
      const data = JSON.parse(result.text);

      expect(data).toHaveLength(2);
      expect(data[0].operation).toBeDefined();
      expect(data[0].status).toBeDefined();
      expect(data[0].message).toBeDefined();
      expect(data[0].timestamp).toBeDefined();
    });

    test("should return logs in descending order", () => {
      db.addSyncLog({
        operation: "operation-1",
        status: "success",
        message: "First",
      });

      db.addSyncLog({
        operation: "operation-2",
        status: "success",
        message: "Second",
      });

      const result = getSyncLogs(db);
      const data = JSON.parse(result.text);

      // Most recent should be first
      expect(data[0].operation).toBe("operation-2");
      expect(data[1].operation).toBe("operation-1");
    });

    test("should include log details when present", () => {
      db.addSyncLog({
        operation: "sync_clients",
        status: "warning",
        message: "Partial sync",
        details: { errors: ["Error 1", "Error 2"] },
      });

      const result = getSyncLogs(db);
      const data = JSON.parse(result.text);

      expect(data[0].details).toBeDefined();
      expect(data[0].details.errors).toHaveLength(2);
    });

    test("should respect limit parameter", () => {
      for (let i = 0; i < 60; i++) {
        db.addSyncLog({
          operation: `operation-${i}`,
          status: "success",
          message: `Message ${i}`,
        });
      }

      const result = getSyncLogs(db, 10);
      const data = JSON.parse(result.text);

      expect(data).toHaveLength(10);
    });

    test("should default to 50 logs", () => {
      for (let i = 0; i < 60; i++) {
        db.addSyncLog({
          operation: `operation-${i}`,
          status: "success",
          message: `Message ${i}`,
        });
      }

      const result = getSyncLogs(db);
      const data = JSON.parse(result.text);

      expect(data).toHaveLength(50);
    });
  });

  describe("getCacheSummary", () => {
    test("should return empty summary for new database", () => {
      const result = getCacheSummary(db);

      expect(result.uri).toBe("mindbody://cache/summary");
      expect(result.mimeType).toBe("application/json");

      const data = JSON.parse(result.text);
      expect(data.clients.total).toBe(0);
      expect(data.sales.total).toBe(0);
      expect(data.clients.lastSync).toBeNull();
      expect(data.status).toBe("empty");
    });

    test("should return summary with cached clients", () => {
      db.saveClients([
        { id: "client-1", rawData: {} },
        { id: "client-2", rawData: {} },
        { id: "client-3", rawData: {} },
      ]);

      const result = getCacheSummary(db);
      const data = JSON.parse(result.text);

      expect(data.clients.total).toBe(3);
      expect(data.clients.lastSync).not.toBeNull();
      expect(data.status).toBe("populated");
    });

    test("should return summary with cached sales", () => {
      db.saveSales([
        { id: "sale-1", saleDate: "2024-01-01", rawData: {} },
        { id: "sale-2", saleDate: "2024-01-02", rawData: {} },
      ]);

      const result = getCacheSummary(db);
      const data = JSON.parse(result.text);

      expect(data.sales.total).toBe(2);
      expect(data.status).toBe("populated");
    });

    test("should return summary with both clients and sales", () => {
      db.saveClients([
        { id: "client-1", rawData: {} },
        { id: "client-2", rawData: {} },
      ]);

      db.saveSales([
        { id: "sale-1", saleDate: "2024-01-01", rawData: {} },
      ]);

      const result = getCacheSummary(db);
      const data = JSON.parse(result.text);

      expect(data.clients.total).toBe(2);
      expect(data.sales.total).toBe(1);
      expect(data.status).toBe("populated");
    });

    test("should include lastSync timestamp", () => {
      db.saveClient({ id: "client-1", rawData: {} });

      const result = getCacheSummary(db);
      const data = JSON.parse(result.text);

      expect(data.clients.lastSync).not.toBeNull();

      // Verify it's a valid timestamp
      const lastSync = new Date(data.clients.lastSync);
      expect(lastSync.toString()).not.toBe("Invalid Date");
    });
  });

  describe("listResources", () => {
    test("should return all available resources", () => {
      const resources = listResources();

      expect(Array.isArray(resources)).toBe(true);
      expect(resources).toHaveLength(3);
    });

    test("should include quota status resource", () => {
      const resources = listResources();
      const quotaResource = resources.find(
        (r) => r.uri === "mindbody://quota/status"
      );

      expect(quotaResource).toBeDefined();
      expect(quotaResource?.name).toBe("API Quota Status");
      expect(quotaResource?.mimeType).toBe("application/json");
      expect(quotaResource?.description).toBeDefined();
    });

    test("should include sync logs resource", () => {
      const resources = listResources();
      const logsResource = resources.find(
        (r) => r.uri === "mindbody://sync/logs"
      );

      expect(logsResource).toBeDefined();
      expect(logsResource?.name).toBe("Sync Logs");
      expect(logsResource?.mimeType).toBe("application/json");
      expect(logsResource?.description).toBeDefined();
    });

    test("should include cache summary resource", () => {
      const resources = listResources();
      const cacheResource = resources.find(
        (r) => r.uri === "mindbody://cache/summary"
      );

      expect(cacheResource).toBeDefined();
      expect(cacheResource?.name).toBe("Cache Summary");
      expect(cacheResource?.mimeType).toBe("application/json");
      expect(cacheResource?.description).toBeDefined();
    });

    test("should have consistent structure for all resources", () => {
      const resources = listResources();

      resources.forEach((resource) => {
        expect(resource.uri).toBeDefined();
        expect(resource.name).toBeDefined();
        expect(resource.description).toBeDefined();
        expect(resource.mimeType).toBe("application/json");
      });
    });
  });
});
