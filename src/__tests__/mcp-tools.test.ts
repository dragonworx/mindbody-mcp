import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import {
  handleSyncClients,
  handleExportSalesHistory,
  handleAnalyzeFormulaNotes,
  handleWriteClientProfile,
} from "../mcp/tools/index.js";
import { SyncService } from "../services/sync.js";
import { MindbodyApiClient } from "../services/mindbody.js";
import { DatabaseClient } from "../db/client.js";
import { RateLimitGuard } from "../services/rateLimit.js";
import type { Config } from "../config.js";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

describe("MCP Tools", () => {
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
    apiClient = new MindbodyApiClient(testConfig, rateLimitGuard);
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

  describe("handleSyncClients", () => {
    test("should sync clients successfully", async () => {
      const syncClientsSpy = spyOn(syncService, "syncClients").mockResolvedValue({
        totalSynced: 10,
        errors: [],
      });

      const result = await handleSyncClients(
        { status: "Active", force: false },
        syncService
      );

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.text).toContain("Successfully synced 10 clients");
      expect(syncClientsSpy).toHaveBeenCalledWith({
        status: "Active",
        sinceDate: undefined,
        force: false,
      });

      syncClientsSpy.mockRestore();
    });

    test("should include warnings in response", async () => {
      const syncClientsSpy = spyOn(syncService, "syncClients").mockResolvedValue({
        totalSynced: 5,
        errors: ["Error 1", "Error 2"],
      });

      const result = await handleSyncClients(
        { status: "Active", force: false },
        syncService
      );

      expect(result.content[0]?.text).toContain("Successfully synced 5 clients");
      expect(result.content[0]?.text).toContain("Warnings");
      expect(result.content[0]?.text).toContain("Error 1");
      expect(result.content[0]?.text).toContain("Error 2");

      syncClientsSpy.mockRestore();
    });

    test("should handle errors gracefully", async () => {
      const syncClientsSpy = spyOn(syncService, "syncClients").mockRejectedValue(
        new Error("Sync failed")
      );

      const result = await handleSyncClients(
        { status: "Active", force: false },
        syncService
      );

      expect(result.content[0]?.text).toContain("Error syncing clients");
      expect(result.content[0]?.text).toContain("Sync failed");

      syncClientsSpy.mockRestore();
    });

    test("should pass since_date parameter", async () => {
      const syncClientsSpy = spyOn(syncService, "syncClients").mockResolvedValue({
        totalSynced: 3,
        errors: [],
      });

      await handleSyncClients(
        { status: "Active", since_date: "2024-01-01", force: false },
        syncService
      );

      expect(syncClientsSpy).toHaveBeenCalledWith({
        status: "Active",
        sinceDate: "2024-01-01",
        force: false,
      });

      syncClientsSpy.mockRestore();
    });
  });

  describe("handleExportSalesHistory", () => {
    test("should export sales to JSON successfully", async () => {
      const syncSalesSpy = spyOn(syncService, "syncSales").mockResolvedValue({
        totalSynced: 5,
        errors: [],
      });

      // Add some test sales to the database
      db.saveSales([
        {
          id: "sale-1",
          saleDate: "2024-01-01",
          clientId: "client-1",
          totalAmount: 100,
          rawData: { test: "data1" },
        },
        {
          id: "sale-2",
          saleDate: "2024-01-02",
          clientId: "client-2",
          totalAmount: 200,
          rawData: { test: "data2" },
        },
      ]);

      const result = await handleExportSalesHistory(
        {
          start_date: "2024-01-01",
          end_date: "2024-01-31",
          format: "json",
          force: false,
        },
        syncService,
        db,
        testConfig
      );

      expect(result.content[0]?.text).toContain("Successfully exported");
      expect(result.content[0]?.text).toContain("sales_export_");
      expect(result.content[0]?.text).toContain(".json");

      syncSalesSpy.mockRestore();
    });

    test("should export sales to CSV successfully", async () => {
      const syncSalesSpy = spyOn(syncService, "syncSales").mockResolvedValue({
        totalSynced: 2,
        errors: [],
      });

      db.saveSales([
        {
          id: "sale-1",
          saleDate: "2024-01-01",
          clientId: "client-1",
          totalAmount: 100,
          rawData: {},
        },
      ]);

      const result = await handleExportSalesHistory(
        {
          start_date: "2024-01-01",
          end_date: "2024-01-31",
          format: "csv",
          force: false,
        },
        syncService,
        db,
        testConfig
      );

      expect(result.content[0]?.text).toContain("Successfully exported");
      expect(result.content[0]?.text).toContain(".csv");

      syncSalesSpy.mockRestore();
    });

    test("should handle errors during export", async () => {
      const syncSalesSpy = spyOn(syncService, "syncSales").mockRejectedValue(
        new Error("Export failed")
      );

      const result = await handleExportSalesHistory(
        {
          start_date: "2024-01-01",
          end_date: "2024-01-31",
          format: "json",
          force: false,
        },
        syncService,
        db,
        testConfig
      );

      expect(result.content[0]?.text).toContain("Error exporting sales");
      expect(result.content[0]?.text).toContain("Export failed");

      syncSalesSpy.mockRestore();
    });
  });

  describe("handleAnalyzeFormulaNotes", () => {
    test("should analyze formula notes successfully", async () => {
      const mockResponse = {
        ClientFormulaNotes: [
          {
            ClientId: "client-1",
            Notes: "Hair color: 5N + 6G",
          },
        ],
      };

      const getNotesSpy = spyOn(apiClient, "getClientFormulaNotes").mockResolvedValue(
        mockResponse
      );

      const result = await handleAnalyzeFormulaNotes(
        { client_id_list: ["client-1"], force: false },
        apiClient
      );

      expect(result.content[0]?.text).toContain("Client ID: client-1");
      expect(result.content[0]?.text).toContain("Hair color: 5N + 6G");
      expect(result.content[0]?.text).toContain("Hair color formula detected");

      getNotesSpy.mockRestore();
    });

    test("should detect medical/sensitive information", async () => {
      const mockResponse = {
        ClientFormulaNotes: [
          {
            ClientId: "client-1",
            Notes: "Client has allergies to certain products",
          },
        ],
      };

      const getNotesSpy = spyOn(apiClient, "getClientFormulaNotes").mockResolvedValue(
        mockResponse
      );

      const result = await handleAnalyzeFormulaNotes(
        { client_id_list: ["client-1"], force: false },
        apiClient
      );

      expect(result.content[0]?.text).toContain("medical/sensitive information");

      getNotesSpy.mockRestore();
    });

    test("should handle empty notes", async () => {
      const mockResponse = {
        ClientFormulaNotes: [],
      };

      const getNotesSpy = spyOn(apiClient, "getClientFormulaNotes").mockResolvedValue(
        mockResponse
      );

      const result = await handleAnalyzeFormulaNotes(
        { client_id_list: ["client-1"], force: false },
        apiClient
      );

      expect(result.content[0]?.text).toContain("No formula notes found");

      getNotesSpy.mockRestore();
    });

    test("should handle errors gracefully", async () => {
      const getNotesSpy = spyOn(apiClient, "getClientFormulaNotes").mockRejectedValue(
        new Error("API error")
      );

      const result = await handleAnalyzeFormulaNotes(
        { client_id_list: ["client-1"], force: false },
        apiClient
      );

      expect(result.content[0]?.text).toContain("Error analyzing formula notes");
      expect(result.content[0]?.text).toContain("API error");

      getNotesSpy.mockRestore();
    });
  });

  describe("handleWriteClientProfile", () => {
    test("should show preview in dry run mode", async () => {
      const result = await handleWriteClientProfile(
        {
          client_id: "client-1",
          data: { FirstName: "Jane", Email: "jane@example.com" },
          dry_run: true,
          force: false,
        },
        apiClient
      );

      expect(result.content[0]?.text).toContain("DRY RUN");
      expect(result.content[0]?.text).toContain("client-1");
      expect(result.content[0]?.text).toContain("Jane");
      expect(result.content[0]?.text).toContain("jane@example.com");
    });

    test("should update client when dry_run is false", async () => {
      const mockResponse = {
        Client: {
          Id: "client-1",
          FirstName: "Jane",
          Email: "jane@example.com",
        },
      };

      const updateClientSpy = spyOn(apiClient, "updateClient").mockResolvedValue(
        mockResponse
      );

      const result = await handleWriteClientProfile(
        {
          client_id: "client-1",
          data: { FirstName: "Jane" },
          dry_run: false,
          force: false,
        },
        apiClient
      );

      expect(result.content[0]?.text).toContain("Successfully updated client");
      expect(result.content[0]?.text).toContain("client-1");
      expect(updateClientSpy).toHaveBeenCalledWith({
        clientId: "client-1",
        data: { FirstName: "Jane" },
        force: false,
      });

      updateClientSpy.mockRestore();
    });

    test("should handle update errors", async () => {
      const updateClientSpy = spyOn(apiClient, "updateClient").mockRejectedValue(
        new Error("Update failed")
      );

      const result = await handleWriteClientProfile(
        {
          client_id: "client-1",
          data: { FirstName: "Jane" },
          dry_run: false,
          force: false,
        },
        apiClient
      );

      expect(result.content[0]?.text).toContain("Error updating client profile");
      expect(result.content[0]?.text).toContain("Update failed");

      updateClientSpy.mockRestore();
    });
  });
});
