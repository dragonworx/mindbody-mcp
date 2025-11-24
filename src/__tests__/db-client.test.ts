import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { DatabaseClient } from "../db/client.js";
import type { Config } from "../config.js";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

describe("DatabaseClient", () => {
  let db: DatabaseClient;
  const testConfig: Config = {
    MBO_API_KEY: "test-key",
    MBO_SITE_ID: "123456",
    MBO_STAFF_USERNAME: "test-user",
    MBO_STAFF_PASSWORD: "test-pass",
    MCP_SERVER_NAME: "test-server",
    LOG_LEVEL: "info",
    DATA_DIR: "./test-data",
    DAILY_API_LIMIT_OVERRIDE: 950,
  };

  beforeEach(async () => {
    // Ensure test data directory exists
    await Bun.write(`${testConfig.DATA_DIR}/.gitkeep`, "");
    db = new DatabaseClient(testConfig);
  });

  afterEach(async () => {
    db.close();
    // Clean up test database
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

  describe("saveClient", () => {
    test("should save a new client", () => {
      db.saveClient({
        id: "client-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        status: "Active",
        rawData: { test: "data" },
      });

      const clients = db.getClients();
      expect(clients).toHaveLength(1);
      expect(clients[0]?.id).toBe("client-1");
      expect(clients[0]?.first_name).toBe("John");
      expect(clients[0]?.last_name).toBe("Doe");
      expect(clients[0]?.email).toBe("john@example.com");
      expect(clients[0]?.status).toBe("Active");
    });

    test("should update an existing client", () => {
      db.saveClient({
        id: "client-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        status: "Active",
        rawData: { test: "data" },
      });

      db.saveClient({
        id: "client-1",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        status: "Inactive",
        rawData: { test: "updated" },
      });

      const clients = db.getClients();
      expect(clients).toHaveLength(1);
      expect(clients[0]?.id).toBe("client-1");
      expect(clients[0]?.first_name).toBe("Jane");
      expect(clients[0]?.last_name).toBe("Smith");
      expect(clients[0]?.email).toBe("jane@example.com");
      expect(clients[0]?.status).toBe("Inactive");
    });

    test("should handle null values", () => {
      db.saveClient({
        id: "client-1",
        rawData: { test: "data" },
      });

      const clients = db.getClients();
      expect(clients[0]?.id).toBe("client-1");
      expect(clients[0]?.first_name).toBeNull();
      expect(clients[0]?.last_name).toBeNull();
      expect(clients[0]?.email).toBeNull();
      expect(clients[0]?.status).toBeNull();
    });
  });

  describe("saveClients", () => {
    test("should save multiple clients in a transaction", () => {
      const clientsToSave = [
        {
          id: "client-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          status: "Active",
          rawData: {},
        },
        {
          id: "client-2",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          status: "Active",
          rawData: {},
        },
      ];

      db.saveClients(clientsToSave);

      const clients = db.getClients();
      expect(clients).toHaveLength(2);
    });

    test("should handle empty array", () => {
      db.saveClients([]);

      const clients = db.getClients();
      expect(clients).toHaveLength(0);
    });
  });

  describe("getClients", () => {
    beforeEach(() => {
      db.saveClients([
        {
          id: "client-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          status: "Active",
          rawData: {},
        },
        {
          id: "client-2",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          status: "Inactive",
          rawData: {},
        },
      ]);
    });

    test("should get all clients when no status is provided", () => {
      const clients = db.getClients();
      expect(clients).toHaveLength(2);
    });

    test("should filter clients by status", () => {
      const activeClients = db.getClients("Active");
      expect(activeClients).toHaveLength(1);
      expect(activeClients[0]?.status).toBe("Active");

      const inactiveClients = db.getClients("Inactive");
      expect(inactiveClients).toHaveLength(1);
      expect(inactiveClients[0]?.status).toBe("Inactive");
    });

    test("should return empty array for non-existent status", () => {
      const clients = db.getClients("NonExistent");
      expect(clients).toHaveLength(0);
    });
  });

  describe("saveSale", () => {
    test("should save a new sale", () => {
      db.saveSale({
        id: "sale-1",
        saleDate: "2024-01-01",
        clientId: "client-1",
        totalAmount: 100.50,
        rawData: { test: "data" },
      });

      const summary = db.getCacheSummary();
      expect(summary.sales).toBe(1);
    });

    test("should update an existing sale", () => {
      db.saveSale({
        id: "sale-1",
        saleDate: "2024-01-01",
        clientId: "client-1",
        totalAmount: 100.50,
        rawData: { test: "data" },
      });

      db.saveSale({
        id: "sale-1",
        saleDate: "2024-01-02",
        clientId: "client-2",
        totalAmount: 200.75,
        rawData: { test: "updated" },
      });

      const summary = db.getCacheSummary();
      expect(summary.sales).toBe(1);
    });

    test("should handle null values", () => {
      db.saveSale({
        id: "sale-1",
        saleDate: "2024-01-01",
        rawData: { test: "data" },
      });

      const summary = db.getCacheSummary();
      expect(summary.sales).toBe(1);
    });
  });

  describe("saveSales", () => {
    test("should save multiple sales in a transaction", () => {
      const salesToSave = [
        {
          id: "sale-1",
          saleDate: "2024-01-01",
          clientId: "client-1",
          totalAmount: 100.50,
          rawData: {},
        },
        {
          id: "sale-2",
          saleDate: "2024-01-02",
          clientId: "client-2",
          totalAmount: 200.75,
          rawData: {},
        },
      ];

      db.saveSales(salesToSave);

      const summary = db.getCacheSummary();
      expect(summary.sales).toBe(2);
    });
  });

  describe("getApiUsage", () => {
    test("should return 0 for a date with no usage", () => {
      const usage = db.getApiUsage("2024-01-01");
      expect(usage).toBe(0);
    });

    test("should return correct usage count", () => {
      db.incrementApiUsage("2024-01-01");
      db.incrementApiUsage("2024-01-01");
      db.incrementApiUsage("2024-01-01");

      const usage = db.getApiUsage("2024-01-01");
      expect(usage).toBe(3);
    });
  });

  describe("incrementApiUsage", () => {
    test("should increment usage for a new date", () => {
      db.incrementApiUsage("2024-01-01");

      const usage = db.getApiUsage("2024-01-01");
      expect(usage).toBe(1);
    });

    test("should increment usage for an existing date", () => {
      db.incrementApiUsage("2024-01-01");
      db.incrementApiUsage("2024-01-01");

      const usage = db.getApiUsage("2024-01-01");
      expect(usage).toBe(2);
    });

    test("should track separate dates independently", () => {
      db.incrementApiUsage("2024-01-01");
      db.incrementApiUsage("2024-01-01");
      db.incrementApiUsage("2024-01-02");

      expect(db.getApiUsage("2024-01-01")).toBe(2);
      expect(db.getApiUsage("2024-01-02")).toBe(1);
    });
  });

  describe("addSyncLog", () => {
    test("should add a sync log entry", () => {
      db.addSyncLog({
        operation: "sync_clients",
        status: "success",
        message: "Test message",
      });

      const logs = db.getSyncLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        operation: "sync_clients",
        status: "success",
        message: "Test message",
      });
    });

    test("should add sync log with details", () => {
      db.addSyncLog({
        operation: "sync_clients",
        status: "error",
        message: "Test error",
        details: { errorCode: 500 },
      });

      const logs = db.getSyncLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]?.details).toBe(JSON.stringify({ errorCode: 500 }));
    });
  });

  describe("getSyncLogs", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        db.addSyncLog({
          operation: `operation-${i}`,
          status: "success",
          message: `Message ${i}`,
        });
      }
    });

    test("should return logs in descending order by timestamp", () => {
      const logs = db.getSyncLogs();
      expect(logs[0]?.operation).toBe("operation-9");
      expect(logs[9]?.operation).toBe("operation-0");
    });

    test("should respect the limit parameter", () => {
      const logs = db.getSyncLogs(5);
      expect(logs).toHaveLength(5);
    });

    test("should default to 50 logs", () => {
      for (let i = 10; i < 60; i++) {
        db.addSyncLog({
          operation: `operation-${i}`,
          status: "success",
          message: `Message ${i}`,
        });
      }

      const logs = db.getSyncLogs();
      expect(logs).toHaveLength(50);
    });
  });

  describe("getCacheSummary", () => {
    test("should return empty summary for new database", () => {
      const summary = db.getCacheSummary();
      expect(summary).toEqual({
        clients: 0,
        sales: 0,
        lastSync: null,
      });
    });

    test("should return correct counts", () => {
      db.saveClients([
        { id: "1", rawData: {} },
        { id: "2", rawData: {} },
      ]);

      db.saveSales([
        { id: "1", saleDate: "2024-01-01", rawData: {} },
        { id: "2", saleDate: "2024-01-02", rawData: {} },
        { id: "3", saleDate: "2024-01-03", rawData: {} },
      ]);

      const summary = db.getCacheSummary();
      expect(summary.clients).toBe(2);
      expect(summary.sales).toBe(3);
      expect(summary.lastSync).not.toBeNull();
    });
  });
});
