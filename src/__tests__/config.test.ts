import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig } from "../config.js";

describe("Config", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("loadConfig", () => {
    test("should load valid configuration", () => {
      process.env.MBO_API_KEY = "test-api-key";
      process.env.MBO_SITE_ID = "123456";
      process.env.MBO_STAFF_USERNAME = "test-user";
      process.env.MBO_STAFF_PASSWORD = "test-pass";

      const config = loadConfig();

      expect(config).toEqual({
        MBO_API_KEY: "test-api-key",
        MBO_SITE_ID: "123456",
        MBO_STAFF_USERNAME: "test-user",
        MBO_STAFF_PASSWORD: "test-pass",
        MCP_SERVER_NAME: "mindbody-migrator",
        LOG_LEVEL: "info",
        DATA_DIR: "./data",
        DAILY_API_LIMIT_OVERRIDE: 950,
      });
    });

    test("should throw error when MBO_API_KEY is missing", () => {
      delete process.env.MBO_API_KEY;
      process.env.MBO_SITE_ID = "123456";
      process.env.MBO_STAFF_USERNAME = "test-user";
      process.env.MBO_STAFF_PASSWORD = "test-pass";

      expect(() => loadConfig()).toThrow("Environment validation failed");
    });

    test("should throw error when MBO_SITE_ID is missing", () => {
      process.env.MBO_API_KEY = "test-api-key";
      delete process.env.MBO_SITE_ID;
      process.env.MBO_STAFF_USERNAME = "test-user";
      process.env.MBO_STAFF_PASSWORD = "test-pass";

      expect(() => loadConfig()).toThrow("Environment validation failed");
    });

    test("should throw error when MBO_STAFF_USERNAME is missing", () => {
      process.env.MBO_API_KEY = "test-api-key";
      process.env.MBO_SITE_ID = "123456";
      delete process.env.MBO_STAFF_USERNAME;
      process.env.MBO_STAFF_PASSWORD = "test-pass";

      expect(() => loadConfig()).toThrow("Environment validation failed");
    });

    test("should throw error when MBO_STAFF_PASSWORD is missing", () => {
      process.env.MBO_API_KEY = "test-api-key";
      process.env.MBO_SITE_ID = "123456";
      process.env.MBO_STAFF_USERNAME = "test-user";
      delete process.env.MBO_STAFF_PASSWORD;

      expect(() => loadConfig()).toThrow("Environment validation failed");
    });

    test("should use default values for optional fields", () => {
      process.env.MBO_API_KEY = "test-api-key";
      process.env.MBO_SITE_ID = "123456";
      process.env.MBO_STAFF_USERNAME = "test-user";
      process.env.MBO_STAFF_PASSWORD = "test-pass";

      const config = loadConfig();

      expect(config.MCP_SERVER_NAME).toBe("mindbody-migrator");
      expect(config.LOG_LEVEL).toBe("info");
      expect(config.DATA_DIR).toBe("./data");
      expect(config.DAILY_API_LIMIT_OVERRIDE).toBe(950);
    });

    test("should override default values when provided", () => {
      process.env.MBO_API_KEY = "test-api-key";
      process.env.MBO_SITE_ID = "123456";
      process.env.MBO_STAFF_USERNAME = "test-user";
      process.env.MBO_STAFF_PASSWORD = "test-pass";
      process.env.MCP_SERVER_NAME = "custom-server";
      process.env.LOG_LEVEL = "debug";
      process.env.DATA_DIR = "/custom/data";
      process.env.DAILY_API_LIMIT_OVERRIDE = "500";

      const config = loadConfig();

      expect(config.MCP_SERVER_NAME).toBe("custom-server");
      expect(config.LOG_LEVEL).toBe("debug");
      expect(config.DATA_DIR).toBe("/custom/data");
      expect(config.DAILY_API_LIMIT_OVERRIDE).toBe(500);
    });

    test("should validate LOG_LEVEL enum", () => {
      process.env.MBO_API_KEY = "test-api-key";
      process.env.MBO_SITE_ID = "123456";
      process.env.MBO_STAFF_USERNAME = "test-user";
      process.env.MBO_STAFF_PASSWORD = "test-pass";
      process.env.LOG_LEVEL = "invalid";

      expect(() => loadConfig()).toThrow("Environment validation failed");
    });

    test("should coerce DAILY_API_LIMIT_OVERRIDE to number", () => {
      process.env.MBO_API_KEY = "test-api-key";
      process.env.MBO_SITE_ID = "123456";
      process.env.MBO_STAFF_USERNAME = "test-user";
      process.env.MBO_STAFF_PASSWORD = "test-pass";
      process.env.DAILY_API_LIMIT_OVERRIDE = "1000";

      const config = loadConfig();

      expect(config.DAILY_API_LIMIT_OVERRIDE).toBe(1000);
      expect(typeof config.DAILY_API_LIMIT_OVERRIDE).toBe("number");
    });

    test("should throw error for empty string values in required fields", () => {
      process.env.MBO_API_KEY = "";
      process.env.MBO_SITE_ID = "123456";
      process.env.MBO_STAFF_USERNAME = "test-user";
      process.env.MBO_STAFF_PASSWORD = "test-pass";

      expect(() => loadConfig()).toThrow("Environment validation failed");
    });
  });
});
