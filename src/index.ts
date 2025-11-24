#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadConfig } from "./config.js";
import { DatabaseClient } from "./db/client.js";
import { MindbodyApiClient } from "./services/mindbody.js";
import { RateLimitGuard } from "./services/rateLimit.js";
import { SyncService } from "./services/sync.js";
import {
  syncClientsSchema,
  exportSalesHistorySchema,
  analyzeFormulaNotesSchema,
  writeClientProfileSchema,
  handleSyncClients,
  handleExportSalesHistory,
  handleAnalyzeFormulaNotes,
  handleWriteClientProfile,
} from "./mcp/tools/index.js";
import {
  getQuotaStatus,
  getSyncLogs,
  getCacheSummary,
  listResources,
} from "./mcp/resources/index.js";

/**
 * Main entry point for the Mindbody MCP Server
 */
async function main(): Promise<void> {
  // Load and validate configuration
  const config = loadConfig();

  // Ensure data directory exists
  await Bun.write(`${config.DATA_DIR}/.gitkeep`, "");

  // Initialize services
  const db = new DatabaseClient(config);
  const rateLimitGuard = new RateLimitGuard(db, config);
  const apiClient = new MindbodyApiClient(config, rateLimitGuard);
  const syncService = new SyncService(apiClient, db);

  // Create MCP server
  const server = new Server(
    {
      name: config.MCP_SERVER_NAME,
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "sync_clients",
          description:
            "Downloads and caches client profiles from Mindbody. Handles pagination automatically. Use this before querying clients.",
          inputSchema: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["Active", "Inactive", "All"],
                default: "Active",
                description: "Client status filter",
              },
              since_date: {
                type: "string",
                description: "ISO date string for delta syncs (optional)",
              },
              force: {
                type: "boolean",
                default: false,
                description: "Override rate limit checks",
              },
            },
          },
        },
        {
          name: "export_sales_history",
          description:
            "Extracts sales data for a date range. Automatically chunks large ranges into weekly requests to prevent timeouts.",
          inputSchema: {
            type: "object",
            properties: {
              start_date: {
                type: "string",
                pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                description: "Start date in YYYY-MM-DD format",
              },
              end_date: {
                type: "string",
                pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                description: "End date in YYYY-MM-DD format",
              },
              format: {
                type: "string",
                enum: ["json", "csv"],
                default: "json",
                description: "Export format",
              },
              force: {
                type: "boolean",
                default: false,
                description: "Override rate limit checks",
              },
            },
            required: ["start_date", "end_date"],
          },
        },
        {
          name: "analyze_formula_notes",
          description:
            "Retrieves and structures unstructured SOAP/Formula notes for specific clients.",
          inputSchema: {
            type: "object",
            properties: {
              client_id_list: {
                type: "array",
                items: { type: "string" },
                description: "Array of client IDs to fetch notes for",
              },
              force: {
                type: "boolean",
                default: false,
                description: "Override rate limit checks",
              },
            },
            required: ["client_id_list"],
          },
        },
        {
          name: "write_client_profile",
          description:
            "Updates a client's profile. **Requires confirmation**. Use dry_run: true to preview changes first.",
          inputSchema: {
            type: "object",
            properties: {
              client_id: {
                type: "string",
                description: "Client ID to update",
              },
              data: {
                type: "object",
                description: "JSON object with client data to update",
              },
              dry_run: {
                type: "boolean",
                default: true,
                description: "If true, only show what would be updated without making changes",
              },
              force: {
                type: "boolean",
                default: false,
                description: "Override rate limit checks",
              },
            },
            required: ["client_id", "data"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      switch (request.params.name) {
        case "sync_clients": {
          const args = syncClientsSchema.parse(request.params.arguments);
          return await handleSyncClients(args, syncService);
        }
        case "export_sales_history": {
          const args = exportSalesHistorySchema.parse(request.params.arguments);
          return await handleExportSalesHistory(args, syncService, db, config);
        }
        case "analyze_formula_notes": {
          const args = analyzeFormulaNotesSchema.parse(request.params.arguments);
          return await handleAnalyzeFormulaNotes(args, apiClient);
        }
        case "write_client_profile": {
          const args = writeClientProfileSchema.parse(request.params.arguments);
          return await handleWriteClientProfile(args, apiClient);
        }
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  // Register resource handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: listResources(),
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    try {
      if (uri === "mindbody://quota/status") {
        const content = getQuotaStatus(apiClient);
        return {
          contents: [
            {
              uri: content.uri,
              mimeType: content.mimeType,
              text: content.text,
            },
          ],
        };
      }

      if (uri === "mindbody://sync/logs") {
        const content = getSyncLogs(db);
        return {
          contents: [
            {
              uri: content.uri,
              mimeType: content.mimeType,
              text: content.text,
            },
          ],
        };
      }

      if (uri === "mindbody://cache/summary") {
        const content = getCacheSummary(db);
        return {
          contents: [
            {
              uri: content.uri,
              mimeType: content.mimeType,
              text: content.text,
            },
          ],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read resource ${uri}: ${errorMessage}`);
    }
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log startup (to stderr so it doesn't interfere with stdio)
  console.error(`[${config.MCP_SERVER_NAME}] Server started successfully`);
  console.error(`[${config.MCP_SERVER_NAME}] Data directory: ${config.DATA_DIR}`);
  console.error(`[${config.MCP_SERVER_NAME}] Log level: ${config.LOG_LEVEL}`);
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.error("\n[Server] Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("\n[Server] Shutting down gracefully...");
  process.exit(0);
});

// Run the server
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
