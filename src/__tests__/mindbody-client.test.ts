import { describe, test, expect, beforeEach, afterEach, spyOn, mock } from "bun:test";
import { MindbodyApiClient } from "../services/mindbody.js";
import { AuthService } from "../services/auth.js";
import { DatabaseClient } from "../db/client.js";
import { RateLimitGuard } from "../services/rateLimit.js";
import type { Config } from "../config.js";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

describe("MindbodyApiClient", () => {
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

  describe("getClients", () => {
    test("should fetch clients successfully", async () => {
      const mockClientsResponse = {
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

      // Only mock the API call (auth is already mocked in beforeEach)
      const fetchMock = spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockClientsResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await apiClient.getClients({ limit: 100, offset: 0 });

      expect(result.Clients).toHaveLength(1);
      expect(result.Clients?.[0]?.Id).toBe("client-1");

      fetchMock.mockRestore();
    });

    test("should include status parameter when provided", async () => {
      const mockClientsResponse = {
        Clients: [],
        PaginationResponse: {
          RequestedLimit: 100,
          RequestedOffset: 0,
          PageSize: 0,
          TotalResults: 0,
        },
      };

      const fetchMock = spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockClientsResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      await apiClient.getClients({ status: "Active" });

      const calls = fetchMock.mock.calls;
      const clientsCall = calls[0];
      expect(clientsCall?.[0]).toContain("status=Active");

      fetchMock.mockRestore();
    });

    test("should record API call", async () => {
      const mockClientsResponse = {
        Clients: [],
      };

      const fetchMock = spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockClientsResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const statsBefore = rateLimitGuard.getUsageStats();
      await apiClient.getClients({});
      const statsAfter = rateLimitGuard.getUsageStats();

      expect(statsAfter.callsMade).toBe(statsBefore.callsMade + 1);

      fetchMock.mockRestore();
    });

    test("should retry with new token on 401 error", async () => {
      const mockClientsResponse = {
        Clients: [],
      };

      const fetchMock = spyOn(global, "fetch")
        .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockClientsResponse), { status: 200 })
        );

      await apiClient.getClients({});

      // Should have called fetch 2 times: failed request, retry
      expect(fetchMock).toHaveBeenCalledTimes(2);

      fetchMock.mockRestore();
    });

    test("should throw error when retry also fails", async () => {
      const fetchMock = spyOn(global, "fetch")
        .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
        .mockResolvedValueOnce(
          new Response("Still Unauthorized", { status: 401 })
        );

      await expect(apiClient.getClients({})).rejects.toThrow(
        "API request failed after retry"
      );

      fetchMock.mockRestore();
    });

    test("should respect rate limit", async () => {
      const today = new Date().toISOString().split("T")[0] as string;

      // Reach the limit
      for (let i = 0; i < testConfig.DAILY_API_LIMIT_OVERRIDE; i++) {
        db.incrementApiUsage(today);
      }

      await expect(apiClient.getClients({})).rejects.toThrow(
        "Daily API limit reached"
      );
    });

    test("should bypass rate limit with force flag", async () => {
      const today = new Date().toISOString().split("T")[0] as string;

      // Reach the limit
      for (let i = 0; i < testConfig.DAILY_API_LIMIT_OVERRIDE; i++) {
        db.incrementApiUsage(today);
      }

      const mockTokenResponse = {
        AccessToken: "test-token",
        TokenType: "Bearer",
        ExpiresIn: 3600,
      };

      const mockClientsResponse = {
        Clients: [],
      };

      const fetchMock = spyOn(global, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockTokenResponse), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockClientsResponse), { status: 200 })
        );

      await expect(apiClient.getClients({ force: true })).resolves.toBeDefined();

      fetchMock.mockRestore();
    });
  });

  describe("getSales", () => {
    test("should fetch sales successfully", async () => {
      const mockSalesResponse = {
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

      const fetchMock = spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockSalesResponse), { status: 200 })
      );

      const result = await apiClient.getSales({
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      expect(result.Sales).toHaveLength(1);
      expect(result.Sales?.[0]?.Id).toBe("sale-1");

      fetchMock.mockRestore();
    });

    test("should include date parameters in request", async () => {
      const mockSalesResponse = {
        Sales: [],
      };

      const fetchMock = spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockSalesResponse), { status: 200 })
      );

      await apiClient.getSales({
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      const calls = fetchMock.mock.calls;
      const salesCall = calls[0];
      expect(salesCall?.[0]).toContain("StartSaleDateTime=2024-01-01");
      expect(salesCall?.[0]).toContain("EndSaleDateTime=2024-01-31");

      fetchMock.mockRestore();
    });
  });

  describe("getClientFormulaNotes", () => {
    test("should fetch formula notes successfully", async () => {
      const mockNotesResponse = {
        ClientFormulaNotes: [
          {
            ClientId: "client-1",
            Notes: "Test notes",
          },
        ],
      };

      const fetchMock = spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockNotesResponse), { status: 200 })
      );

      const result = await apiClient.getClientFormulaNotes({
        clientIds: ["client-1", "client-2"],
      });

      expect(result.ClientFormulaNotes).toHaveLength(1);
      expect(result.ClientFormulaNotes[0]?.ClientId).toBe("client-1");

      fetchMock.mockRestore();
    });

    test("should join client IDs with comma", async () => {
      const mockNotesResponse = {
        ClientFormulaNotes: [],
      };

      const fetchMock = spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockNotesResponse), { status: 200 })
      );

      await apiClient.getClientFormulaNotes({
        clientIds: ["client-1", "client-2", "client-3"],
      });

      const calls = fetchMock.mock.calls;
      const notesCall = calls[0];
      expect(notesCall?.[0]).toContain("ClientIds=client-1%2Cclient-2%2Cclient-3");

      fetchMock.mockRestore();
    });
  });

  describe("updateClient", () => {
    test("should update client successfully", async () => {
      const mockUpdateResponse = {
        Client: {
          Id: "client-1",
          FirstName: "Jane",
          LastName: "Doe",
        },
      };

      const fetchMock = spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockUpdateResponse), { status: 200 })
      );

      const result = await apiClient.updateClient({
        clientId: "client-1",
        data: { FirstName: "Jane" },
      });

      expect(result.Client.Id).toBe("client-1");
      expect(result.Client.FirstName).toBe("Jane");

      fetchMock.mockRestore();
    });

    test("should send POST request with correct body", async () => {
      const mockUpdateResponse = {
        Client: { Id: "client-1" },
      };

      const fetchMock = spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockUpdateResponse), { status: 200 })
      );

      await apiClient.updateClient({
        clientId: "client-1",
        data: { FirstName: "Jane", Email: "jane@example.com" },
      });

      const calls = fetchMock.mock.calls;
      const updateCall = calls[0];
      const options = updateCall?.[1] as RequestInit;

      expect(options.method).toBe("POST");
      expect(options.body).toContain("ClientId");
      expect(options.body).toContain("client-1");
      expect(options.body).toContain("FirstName");
      expect(options.body).toContain("Jane");

      fetchMock.mockRestore();
    });
  });

  describe("getRateLimitGuard", () => {
    test("should return the rate limit guard instance", () => {
      const guard = apiClient.getRateLimitGuard();
      expect(guard).toBe(rateLimitGuard);
    });
  });
});
