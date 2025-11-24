import type { MindbodyApiClient } from "../../services/mindbody.js";
import type { DatabaseClient } from "../../db/client.js";

/**
 * Resource handlers for the MCP server
 * Resources provide read-only context to the AI
 */

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

/**
 * Get API quota status
 */
export function getQuotaStatus(apiClient: MindbodyApiClient): ResourceContent {
  const stats = apiClient.getRateLimitGuard().getUsageStats();

  const data = {
    callsMade: stats.callsMade,
    limit: stats.limit,
    callsRemaining: stats.callsRemaining,
    resetTime: stats.resetTime,
    status: stats.callsRemaining > 0 ? "available" : "exhausted",
    warningThreshold: stats.limit * 0.8,
    isApproachingLimit: stats.callsMade >= stats.limit * 0.8,
  };

  return {
    uri: "mindbody://quota/status",
    mimeType: "application/json",
    text: JSON.stringify(data, null, 2),
  };
}

/**
 * Get sync logs
 */
export function getSyncLogs(db: DatabaseClient, limit = 50): ResourceContent {
  const logs = db.getSyncLogs(limit);

  const formatted = logs.map((log) => {
    const details = log.details ? JSON.parse(log.details) : null;
    return {
      timestamp: log.timestamp,
      operation: log.operation,
      status: log.status,
      message: log.message,
      ...(details && { details }),
    };
  });

  return {
    uri: "mindbody://sync/logs",
    mimeType: "application/json",
    text: JSON.stringify(formatted, null, 2),
  };
}

/**
 * Get cache summary
 */
export function getCacheSummary(db: DatabaseClient): ResourceContent {
  const summary = db.getCacheSummary();

  const data = {
    clients: {
      total: summary.clients,
      lastSync: summary.lastSync,
    },
    sales: {
      total: summary.sales,
    },
    status: summary.clients > 0 || summary.sales > 0 ? "populated" : "empty",
  };

  return {
    uri: "mindbody://cache/summary",
    mimeType: "application/json",
    text: JSON.stringify(data, null, 2),
  };
}

/**
 * List all available resources
 */
export function listResources(): Array<{
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}> {
  return [
    {
      uri: "mindbody://quota/status",
      name: "API Quota Status",
      description: "Current API usage and remaining calls for today",
      mimeType: "application/json",
    },
    {
      uri: "mindbody://sync/logs",
      name: "Sync Logs",
      description: "Recent synchronization operation logs",
      mimeType: "application/json",
    },
    {
      uri: "mindbody://cache/summary",
      name: "Cache Summary",
      description: "Summary of locally cached data",
      mimeType: "application/json",
    },
  ];
}
