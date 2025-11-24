import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { RateLimitGuard } from "../services/rateLimit.js";
import { DatabaseClient } from "../db/client.js";
import type { Config } from "../config.js";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

describe("RateLimitGuard", () => {
  let rateLimitGuard: RateLimitGuard;
  let db: DatabaseClient;
  const testConfig: Config = {
    MBO_API_KEY: "test-key",
    MBO_SITE_ID: "123456",
    MBO_STAFF_USERNAME: "test-user",
    MBO_STAFF_PASSWORD: "test-pass",
    MCP_SERVER_NAME: "test-server",
    LOG_LEVEL: "info",
    DATA_DIR: "./test-data",
    DAILY_API_LIMIT_OVERRIDE: 10, // Low limit for testing
  };

  beforeEach(async () => {
    await Bun.write(`${testConfig.DATA_DIR}/.gitkeep`, "");
    db = new DatabaseClient(testConfig);
    rateLimitGuard = new RateLimitGuard(db, testConfig);
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

  describe("checkLimit", () => {
    test("should pass when under limit", async () => {
      await expect(rateLimitGuard.checkLimit()).resolves.toBeUndefined();
    });

    test("should throw error when limit is reached", async () => {
      const today = new Date().toISOString().split("T")[0] as string;

      // Reach the limit
      for (let i = 0; i < testConfig.DAILY_API_LIMIT_OVERRIDE; i++) {
        db.incrementApiUsage(today);
      }

      await expect(rateLimitGuard.checkLimit()).rejects.toThrow(
        "Daily API limit reached"
      );
    });

    test("should pass when limit is reached but force is true", async () => {
      const today = new Date().toISOString().split("T")[0] as string;

      // Reach the limit
      for (let i = 0; i < testConfig.DAILY_API_LIMIT_OVERRIDE; i++) {
        db.incrementApiUsage(today);
      }

      await expect(rateLimitGuard.checkLimit(true)).resolves.toBeUndefined();
    });

    test("should throw error message with correct usage stats", async () => {
      const today = new Date().toISOString().split("T")[0] as string;

      for (let i = 0; i < testConfig.DAILY_API_LIMIT_OVERRIDE; i++) {
        db.incrementApiUsage(today);
      }

      try {
        await rateLimitGuard.checkLimit();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain(
            `${testConfig.DAILY_API_LIMIT_OVERRIDE}/${testConfig.DAILY_API_LIMIT_OVERRIDE}`
          );
          expect(error.message).toContain("force flag");
        }
      }
    });
  });

  describe("recordCall", () => {
    test("should increment usage counter", () => {
      const today = new Date().toISOString().split("T")[0] as string;

      rateLimitGuard.recordCall();

      const usage = db.getApiUsage(today);
      expect(usage).toBe(1);
    });

    test("should increment counter multiple times", () => {
      const today = new Date().toISOString().split("T")[0] as string;

      rateLimitGuard.recordCall();
      rateLimitGuard.recordCall();
      rateLimitGuard.recordCall();

      const usage = db.getApiUsage(today);
      expect(usage).toBe(3);
    });
  });

  describe("getUsageStats", () => {
    test("should return correct stats with no usage", () => {
      const stats = rateLimitGuard.getUsageStats();

      expect(stats.callsMade).toBe(0);
      expect(stats.limit).toBe(testConfig.DAILY_API_LIMIT_OVERRIDE);
      expect(stats.callsRemaining).toBe(testConfig.DAILY_API_LIMIT_OVERRIDE);
      expect(stats.resetTime).toBeDefined();
    });

    test("should return correct stats with some usage", () => {
      rateLimitGuard.recordCall();
      rateLimitGuard.recordCall();
      rateLimitGuard.recordCall();

      const stats = rateLimitGuard.getUsageStats();

      expect(stats.callsMade).toBe(3);
      expect(stats.limit).toBe(testConfig.DAILY_API_LIMIT_OVERRIDE);
      expect(stats.callsRemaining).toBe(testConfig.DAILY_API_LIMIT_OVERRIDE - 3);
    });

    test("should return correct stats at limit", () => {
      const today = new Date().toISOString().split("T")[0] as string;

      for (let i = 0; i < testConfig.DAILY_API_LIMIT_OVERRIDE; i++) {
        db.incrementApiUsage(today);
      }

      const stats = rateLimitGuard.getUsageStats();

      expect(stats.callsMade).toBe(testConfig.DAILY_API_LIMIT_OVERRIDE);
      expect(stats.callsRemaining).toBe(0);
    });

    test("should never return negative callsRemaining", () => {
      const today = new Date().toISOString().split("T")[0] as string;

      // Exceed the limit
      for (let i = 0; i < testConfig.DAILY_API_LIMIT_OVERRIDE + 5; i++) {
        db.incrementApiUsage(today);
      }

      const stats = rateLimitGuard.getUsageStats();

      expect(stats.callsRemaining).toBe(0);
    });

    test("should return resetTime for next midnight UTC", () => {
      const stats = rateLimitGuard.getUsageStats();
      const resetTime = new Date(stats.resetTime);

      expect(resetTime.getUTCHours()).toBe(0);
      expect(resetTime.getUTCMinutes()).toBe(0);
      expect(resetTime.getUTCSeconds()).toBe(0);
      expect(resetTime.getUTCMilliseconds()).toBe(0);

      // Should be tomorrow
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      expect(resetTime.toISOString().split("T")[0]).toBe(
        tomorrow.toISOString().split("T")[0]
      );
    });
  });

  describe("isApproachingLimit", () => {
    test("should return false when well under limit", () => {
      rateLimitGuard.recordCall();

      expect(rateLimitGuard.isApproachingLimit()).toBe(false);
    });

    test("should return true when at 80% threshold", () => {
      const threshold = Math.ceil(testConfig.DAILY_API_LIMIT_OVERRIDE * 0.8);
      const today = new Date().toISOString().split("T")[0] as string;

      for (let i = 0; i < threshold; i++) {
        db.incrementApiUsage(today);
      }

      expect(rateLimitGuard.isApproachingLimit()).toBe(true);
    });

    test("should return true when over 80% threshold", () => {
      const threshold = Math.ceil(testConfig.DAILY_API_LIMIT_OVERRIDE * 0.9);
      const today = new Date().toISOString().split("T")[0] as string;

      for (let i = 0; i < threshold; i++) {
        db.incrementApiUsage(today);
      }

      expect(rateLimitGuard.isApproachingLimit()).toBe(true);
    });

    test("should return false when just under 80% threshold", () => {
      const threshold = Math.floor(testConfig.DAILY_API_LIMIT_OVERRIDE * 0.79);
      const today = new Date().toISOString().split("T")[0] as string;

      for (let i = 0; i < threshold; i++) {
        db.incrementApiUsage(today);
      }

      expect(rateLimitGuard.isApproachingLimit()).toBe(false);
    });
  });
});
