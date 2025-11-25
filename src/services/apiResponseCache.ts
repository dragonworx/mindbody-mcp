import type { DatabaseClient } from "../db/client.js";
import { createHash } from "crypto";

/**
 * API Response Cache Service
 *
 * Provides persistent caching for Mindbody API responses in integration tests.
 * Reduces API load and speeds up test execution by caching responses by endpoint + params.
 */
export class ApiResponseCache {
  constructor(private db: DatabaseClient) {}

  /**
   * Generate cache key from endpoint and parameters
   */
  private generateCacheKey(endpoint: string, params: Record<string, unknown>): string {
    const sortedParams = JSON.stringify(params, Object.keys(params).sort());
    const hash = createHash("sha256").update(`${endpoint}:${sortedParams}`).digest("hex");
    return hash;
  }

  /**
   * Get cached response if available
   */
  get<T>(endpoint: string, params: Record<string, unknown>): T | null {
    const cacheKey = this.generateCacheKey(endpoint, params);

    const cached = this.db["db"].query(`
      SELECT response, hit_count FROM api_response_cache WHERE cache_key = ?
    `).get(cacheKey) as { response: string; hit_count: number } | null;

    if (cached) {
      // Increment hit count
      this.db["db"].prepare(`
        UPDATE api_response_cache SET hit_count = hit_count + 1 WHERE cache_key = ?
      `).run(cacheKey);

      return JSON.parse(cached.response) as T;
    }

    return null;
  }

  /**
   * Store response in cache
   */
  set<T>(endpoint: string, params: Record<string, unknown>, response: T): void {
    const cacheKey = this.generateCacheKey(endpoint, params);
    const paramsJson = JSON.stringify(params);
    const responseJson = JSON.stringify(response);

    this.db["db"].prepare(`
      INSERT INTO api_response_cache (cache_key, endpoint, params, response)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        response = excluded.response,
        created_at = CURRENT_TIMESTAMP,
        hit_count = 0
    `).run(cacheKey, endpoint, paramsJson, responseJson);
  }

  /**
   * Clear all cached responses
   */
  clear(): void {
    this.db["db"].exec("DELETE FROM api_response_cache");
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    totalHits: number;
    cacheSize: number;
  } {
    const stats = this.db["db"].query(`
      SELECT
        COUNT(*) as entries,
        SUM(hit_count) as hits,
        SUM(LENGTH(response)) as size
      FROM api_response_cache
    `).get() as { entries: number; hits: number; size: number };

    return {
      totalEntries: stats.entries,
      totalHits: stats.hits,
      cacheSize: stats.size,
    };
  }
}
