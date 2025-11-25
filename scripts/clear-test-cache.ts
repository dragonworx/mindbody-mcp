#!/usr/bin/env bun

/**
 * Clear Integration Test API Response Cache
 *
 * This script clears the persistent API response cache used by integration tests.
 * Run this when you want fresh API data or after API changes.
 */

import { Database } from "bun:sqlite";
import { join } from "path";
import { existsSync } from "fs";

const DATA_DIR = "./test-data";
const DB_PATH = join(DATA_DIR, "mindbody.db");

if (!existsSync(DB_PATH)) {
  console.log("✅ No test cache found (database doesn't exist)");
  process.exit(0);
}

const db = new Database(DB_PATH);

try {
  // Check if table exists
  const tableExists = db.query(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='api_response_cache'
  `).get();

  if (!tableExists) {
    console.log("✅ No API response cache table found (will be created on next test run)");
    db.close();
    process.exit(0);
  }

  const result = db.prepare("DELETE FROM api_response_cache").run();
  console.log(`✅ Cleared ${result.changes} cached API responses`);

  const stats = db.query(`
    SELECT COUNT(*) as remaining FROM api_response_cache
  `).get() as { remaining: number };

  if (stats.remaining === 0) {
    console.log("✅ Test cache is now empty");
  } else {
    console.warn(`⚠️  Warning: ${stats.remaining} entries remain`);
  }
} catch (error) {
  console.error("❌ Error clearing cache:", error);
  process.exit(1);
} finally {
  db.close();
}
