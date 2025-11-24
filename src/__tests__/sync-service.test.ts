import { describe, test, expect, beforeEach, afterEach, spyOn, mock } from "bun:test";
import { SyncService } from "../services/sync.js";
import { MindbodyApiClient } from "../services/mindbody.js";
import { AuthService } from "../services/auth.js";
import { DatabaseClient } from "../db/client.js";
import { RateLimitGuard } from "../services/rateLimit.js";
import type { Config } from "../config.js";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

describe("SyncService", () => {
  let syncService: SyncService;
  let apiClient: MindbodyApiClient;
  let db: DatabaseClient;
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
    const rateLimitGuard = new RateLimitGuard(db, testConfig);

    // Create a mock AuthService to prevent real API calls
    const mockFetch = mock(async () =>
      new Response(JSON.stringify({
        AccessToken: "mock-token",
        TokenType: "Bearer",
        ExpiresIn: 3600,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const mockAuthService = new AuthService(testConfig, mockFetch);

    apiClient = new MindbodyApiClient(testConfig, rateLimitGuard, mockAuthService);
    syncService = new SyncService(apiClient, db);
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

  describe("syncClients", () => {
    test("should sync clients successfully", async () => {
      const mockResponse = {
        Clients: [
          {
            Id: "client-1",
            FirstName: "John",
            LastName: "Doe",
            Email: "john@example.com",
            Status: "Active",
          },
        ],
        PaginationResponse: {
          RequestedLimit: 100,
          RequestedOffset: 0,
          PageSize: 1,
          TotalResults: 1,
        },
      };

      const getClientsSpy = spyOn(apiClient, "getClients").mockResolvedValue(
        mockResponse
      );

      const result = await syncService.syncClients({ status: "Active" });

      expect(result.totalSynced).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(getClientsSpy).toHaveBeenCalledTimes(1);

      const cachedClients = db.getClients();
      expect(cachedClients).toHaveLength(1);
      expect(cachedClients[0]?.id).toBe("client-1");

      getClientsSpy.mockRestore();
    });

    test("should handle pagination correctly", async () => {
      const mockResponse1 = {
        Clients: Array.from({ length: 100 }, (_, i) => ({
          Id: `client-${i}`,
          FirstName: `First${i}`,
          LastName: `Last${i}`,
          Status: "Active",
        })),
        PaginationResponse: {
          RequestedLimit: 100,
          RequestedOffset: 0,
          PageSize: 100,
          TotalResults: 150,
        },
      };

      const mockResponse2 = {
        Clients: Array.from({ length: 50 }, (_, i) => ({
          Id: `client-${100 + i}`,
          FirstName: `First${100 + i}`,
          LastName: `Last${100 + i}`,
          Status: "Active",
        })),
        PaginationResponse: {
          RequestedLimit: 100,
          RequestedOffset: 100,
          PageSize: 50,
          TotalResults: 150,
        },
      };

      const getClientsSpy = spyOn(apiClient, "getClients")
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result = await syncService.syncClients({ status: "Active" });

      expect(result.totalSynced).toBe(150);
      expect(getClientsSpy).toHaveBeenCalledTimes(2);

      const cachedClients = db.getClients();
      expect(cachedClients).toHaveLength(150);

      getClientsSpy.mockRestore();
    });

    test("should stop when no more clients are returned", async () => {
      const mockResponse = {
        Clients: [{ Id: "client-1", Status: "Active" }],
        PaginationResponse: {
          RequestedLimit: 100,
          RequestedOffset: 0,
          PageSize: 1,
          TotalResults: 1,
        },
      };

      const getClientsSpy = spyOn(apiClient, "getClients")
        .mockResolvedValueOnce(mockResponse);

      const result = await syncService.syncClients({ status: "Active" });

      expect(result.totalSynced).toBe(1);
      expect(getClientsSpy).toHaveBeenCalledTimes(1);

      getClientsSpy.mockRestore();
    });

    test("should handle errors and continue", async () => {
      const mockResponse1 = {
        Clients: Array.from({ length: 100 }, (_, i) => ({
          Id: `client-${i}`,
          Status: "Active",
        })),
        PaginationResponse: {
          RequestedLimit: 100,
          RequestedOffset: 0,
          PageSize: 100,
          TotalResults: 200,
        },
      };

      // After error, return empty to stop the loop
      const mockResponse2 = {
        Clients: [],
        PaginationResponse: {
          RequestedLimit: 100,
          RequestedOffset: 200,
          PageSize: 0,
          TotalResults: 200,
        },
      };

      const getClientsSpy = spyOn(apiClient, "getClients")
        .mockResolvedValueOnce(mockResponse1)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(mockResponse2);

      const result = await syncService.syncClients({ status: "Active" });

      expect(result.totalSynced).toBe(100);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Network error");

      getClientsSpy.mockRestore();
    });

    test("should stop on rate limit error", async () => {
      const mockResponse1 = {
        Clients: Array.from({ length: 100 }, (_, i) => ({
          Id: `client-${i}`,
          Status: "Active",
        })),
        PaginationResponse: {
          RequestedLimit: 100,
          RequestedOffset: 0,
          PageSize: 100,
          TotalResults: 200,
        },
      };

      const getClientsSpy = spyOn(apiClient, "getClients")
        .mockResolvedValueOnce(mockResponse1)
        .mockRejectedValueOnce(new Error("Daily API limit reached"));

      const result = await syncService.syncClients({ status: "Active" });

      expect(result.totalSynced).toBe(100);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(getClientsSpy).toHaveBeenCalledTimes(2);

      getClientsSpy.mockRestore();
    });

    test("should log sync operations", async () => {
      const mockResponse = {
        Clients: [{ Id: "client-1", Status: "Active" }],
      };

      const getClientsSpy = spyOn(apiClient, "getClients").mockResolvedValue(
        mockResponse
      );

      await syncService.syncClients({ status: "Active" });

      const logs = db.getSyncLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((log) => log.operation === "sync_clients")).toBe(true);

      getClientsSpy.mockRestore();
    });
  });

  describe("syncSales", () => {
    test("should sync sales successfully", async () => {
      const mockResponse = {
        Sales: [
          {
            Id: "sale-1",
            SaleDate: "2024-01-01",
            ClientId: "client-1",
            TotalAmount: 100.50,
          },
        ],
        PaginationResponse: {
          RequestedLimit: 100,
          RequestedOffset: 0,
          PageSize: 1,
          TotalResults: 1,
        },
      };

      const getSalesSpy = spyOn(apiClient, "getSales").mockResolvedValue(
        mockResponse
      );

      const result = await syncService.syncSales({
        startDate: "2024-01-01",
        endDate: "2024-01-07",
      });

      expect(result.totalSynced).toBe(1);
      expect(result.errors).toHaveLength(0);

      const summary = db.getCacheSummary();
      expect(summary.sales).toBe(1);

      getSalesSpy.mockRestore();
    });

    test("should chunk date ranges into weekly intervals", async () => {
      const mockResponse = {
        Sales: [],
        PaginationResponse: {
          RequestedLimit: 100,
          RequestedOffset: 0,
          PageSize: 0,
          TotalResults: 0,
        },
      };

      const getSalesSpy = spyOn(apiClient, "getSales").mockResolvedValue(
        mockResponse
      );

      await syncService.syncSales({
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      // 31 days should be chunked into at least 4 calls (7-day chunks)
      expect(getSalesSpy.mock.calls.length).toBeGreaterThan(3);

      getSalesSpy.mockRestore();
    });

    test("should handle pagination within chunks", async () => {
      const mockResponse1 = {
        Sales: Array.from({ length: 100 }, (_, i) => ({
          Id: `sale-${i}`,
          SaleDate: "2024-01-01",
        })),
        PaginationResponse: {
          RequestedLimit: 100,
          RequestedOffset: 0,
          PageSize: 100,
          TotalResults: 150,
        },
      };

      const mockResponse2 = {
        Sales: Array.from({ length: 50 }, (_, i) => ({
          Id: `sale-${100 + i}`,
          SaleDate: "2024-01-01",
        })),
        PaginationResponse: {
          RequestedLimit: 100,
          RequestedOffset: 100,
          PageSize: 50,
          TotalResults: 150,
        },
      };

      const getSalesSpy = spyOn(apiClient, "getSales")
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result = await syncService.syncSales({
        startDate: "2024-01-01",
        endDate: "2024-01-03",
      });

      expect(result.totalSynced).toBe(150);
      expect(getSalesSpy).toHaveBeenCalledTimes(2);

      getSalesSpy.mockRestore();
    });

    test("should stop on rate limit error and return partial results", async () => {
      const mockResponse = {
        Sales: [{ Id: "sale-1", SaleDate: "2024-01-01" }],
      };

      const getSalesSpy = spyOn(apiClient, "getSales")
        .mockResolvedValueOnce(mockResponse)
        .mockRejectedValueOnce(new Error("Daily API limit reached"));

      const result = await syncService.syncSales({
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      expect(result.totalSynced).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);

      getSalesSpy.mockRestore();
    });

    test("should log sync operations", async () => {
      const mockResponse = {
        Sales: [{ Id: "sale-1", SaleDate: "2024-01-01" }],
      };

      const getSalesSpy = spyOn(apiClient, "getSales").mockResolvedValue(
        mockResponse
      );

      await syncService.syncSales({
        startDate: "2024-01-01",
        endDate: "2024-01-07",
      });

      const logs = db.getSyncLogs();
      expect(logs.some((log) => log.operation === "sync_sales")).toBe(true);

      getSalesSpy.mockRestore();
    });

    test("should handle errors within chunks and continue", async () => {
      const mockResponse = {
        Sales: [{ Id: "sale-1", SaleDate: "2024-01-01" }],
      };

      const getSalesSpy = spyOn(apiClient, "getSales")
        .mockResolvedValueOnce(mockResponse)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(mockResponse);

      const result = await syncService.syncSales({
        startDate: "2024-01-01",
        endDate: "2024-01-21",
      });

      expect(result.totalSynced).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);

      getSalesSpy.mockRestore();
    });
  });
});
