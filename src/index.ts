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
import {
  getQuotaStatus,
  getSyncLogs,
  getCacheSummary,
  listResources,
} from "./mcp/resources/index.js";

async function main(): Promise<void> {
  // Load and validate configuration
  const config = loadConfig();

  // Ensure data directory exists
  await Bun.write(`${config.DATA_DIR}/.gitkeep`, "");

  // Initialize foundational services
  const db = new DatabaseClient(config);
  const rateLimitGuard = new RateLimitGuard(db, config);
  const apiClient = new MindbodyApiClient(config, rateLimitGuard);

  // Create MCP server
  const server = new Server(
    {
      name: config.MCP_SERVER_NAME,
      version: "2.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Register tool handlers
  // TODO: Implement metadata-driven tool registration (EP1-S01 through EP1-S12)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Tools will be dynamically registered from endpoint metadata
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      // TODO: Implement generic tool handler (EP1-S02)
      throw new Error(`Tool not yet implemented: ${request.params.name}`);
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
  console.error(`[${config.MCP_SERVER_NAME}] Version: 2.0.0 (Hybrid Architecture)`);
  console.error(`[${config.MCP_SERVER_NAME}] Data directory: ${config.DATA_DIR}`);
  console.error(`[${config.MCP_SERVER_NAME}] Log level: ${config.LOG_LEVEL}`);
  console.error(`[${config.MCP_SERVER_NAME}] Ready for metadata-driven tool registration`);
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
