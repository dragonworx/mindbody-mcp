/**
 * Integration Test Helpers
 *
 * Utilities for setting up real MCP server components with sandbox API connection.
 * These helpers spin up actual services with real database and API clients.
 */

import { DatabaseClient } from "../../db/client.js";
import { AuthService } from "../../services/auth.js";
import { MindbodyApiClient } from "../../services/mindbody.js";
import { RateLimitGuard } from "../../services/rateLimit.js";
import { ApiResponseCache } from "../../services/apiResponseCache.js";
import { loadConfig } from "../../config.js";
import type { Config } from "../../config.js";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

/**
 * Integration test context with foundational components only
 * (Custom orchestration services removed - use metadata-driven tools instead)
 */
export interface IntegrationTestContext {
  config: Config;
  db: DatabaseClient;
  authService: AuthService;
  rateLimitGuard: RateLimitGuard;
  apiResponseCache: ApiResponseCache;
  apiClient: MindbodyApiClient;
}

/**
 * Sets up integration test context with real components
 *
 * This creates:
 * - Real database (isolated test DB)
 * - Real auth service (connects to sandbox API)
 * - Real API client (makes actual HTTP calls)
 * - Real services (sync, appointments, etc.)
 *
 * @returns Test context with all initialized components
 */
export async function setupIntegrationTest(): Promise<IntegrationTestContext> {
  // Get config from environment (should point to sandbox)
  const config = loadConfig();

  // Override database path to use isolated test database
  const testConfig: Config = {
    ...config,
    DATA_DIR: "./test-data",
  };

  // Ensure test data directory exists
  await Bun.write(`${testConfig.DATA_DIR}/.gitkeep`, "");

  // Create real database client
  const db = new DatabaseClient(testConfig);

  // Create real auth service (will connect to sandbox API)
  const authService = new AuthService(testConfig);

  // Create rate limit guard (uses test database)
  const rateLimitGuard = new RateLimitGuard(db, testConfig);

  // Create API response cache (for integration test performance)
  const apiResponseCache = new ApiResponseCache(db);

  // Create real API client with caching enabled (makes actual HTTP requests)
  const apiClient = new MindbodyApiClient(testConfig, rateLimitGuard, authService, apiResponseCache);

  return {
    config: testConfig,
    db,
    authService,
    rateLimitGuard,
    apiResponseCache,
    apiClient,
  };
}

/**
 * Tears down integration test context and cleans up resources
 *
 * This:
 * - Closes database connections
 * - Deletes test database files
 * - Clears any cached tokens
 */
export async function teardownIntegrationTest(context: IntegrationTestContext): Promise<void> {
  // Close database
  context.db.close();

  // Clean up database files
  const dbPath = `${context.config.DATA_DIR}/mindbody.db`;
  if (existsSync(dbPath)) {
    await unlink(dbPath);
  }
  if (existsSync(`${dbPath}-shm`)) {
    await unlink(`${dbPath}-shm`);
  }
  if (existsSync(`${dbPath}-wal`)) {
    await unlink(`${dbPath}-wal`);
  }
}

/**
 * Waits for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Gets current API usage stats (useful for tracking call consumption)
 */
export function getApiUsageStats(context: IntegrationTestContext) {
  return context.rateLimitGuard.getUsageStats();
}

/**
 * Assertion helper: Validates MCP tool response structure
 */
export function assertMcpToolResponse(response: unknown): asserts response is {
  content: Array<{ type: string; text: string }>;
} {
  if (!response || typeof response !== "object") {
    throw new Error("Response is not an object");
  }

  const typedResponse = response as Record<string, unknown>;

  if (!Array.isArray(typedResponse.content)) {
    throw new Error("Response.content is not an array");
  }

  for (const item of typedResponse.content) {
    if (!item || typeof item !== "object") {
      throw new Error("Content item is not an object");
    }

    const typedItem = item as Record<string, unknown>;

    if (typeof typedItem.type !== "string") {
      throw new Error("Content item.type is not a string");
    }

    if (typeof typedItem.text !== "string") {
      throw new Error("Content item.text is not a string");
    }
  }
}

/**
 * Extracts text from MCP tool response
 */
export function extractResponseText(response: {
  content: Array<{ type: string; text: string }>;
}): string {
  return response.content.map((c) => c.text).join("\n");
}

/**
 * Parses JSON from MCP tool response text
 */
export function parseResponseJson<T>(response: {
  content: Array<{ type: string; text: string }>;
}): T {
  const text = extractResponseText(response);

  // Try to find JSON in the response (may be wrapped in markdown)
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/({[\s\S]*})/);

  if (!jsonMatch || !jsonMatch[1]) {
    throw new Error("No JSON found in response");
  }

  return JSON.parse(jsonMatch[1]) as T;
}
