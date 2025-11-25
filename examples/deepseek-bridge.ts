#!/usr/bin/env bun
/**
 * Simple bridge to use deepseek-r1 (via Ollama) with Mindbody MCP Server
 *
 * Prerequisites:
 * 1. Install Ollama: brew install ollama
 * 2. Start Ollama: ollama serve
 * 3. Pull model: ollama pull deepseek-r1
 * 4. Install deps: bun add @modelcontextprotocol/sdk
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

// Connect to local Mindbody MCP Server
async function connectToMCPServer() {
  const transport = new StdioClientTransport({
    command: "bun",
    args: ["run", "../src/index.ts"],
  });

  const client = new Client(
    {
      name: "deepseek-bridge",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  console.log("✅ Connected to Mindbody MCP Server");

  return client;
}

// Call Ollama API
async function callDeepseek(messages: OllamaMessage[]): Promise<string> {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-r1",
      messages,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2000,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = (await response.json()) as OllamaResponse;
  return data.message.content;
}

// Main demo
async function main() {
  console.log("🚀 Starting deepseek-r1 <-> Mindbody MCP Bridge\n");

  // Connect to MCP server
  const mcpClient = await connectToMCPServer();

  // Get available tools
  const toolsList = await mcpClient.listTools();
  console.log(
    `📋 Available tools: ${toolsList.tools.map((t) => t.name).join(", ")}\n`
  );

  // Get available resources
  const resourcesList = await mcpClient.listResources();
  console.log(
    `📚 Available resources: ${resourcesList.resources.map((r) => r.name).join(", ")}\n`
  );

  // Example 1: Check quota using resource
  console.log("Example 1: Reading quota status resource...");
  const quotaResource = await mcpClient.readResource({
    uri: "mindbody://quota/status",
  });
  const quotaData = JSON.parse(quotaResource.contents[0]?.text ?? "{}");
  console.log(`  Quota: ${quotaData.calls_made}/${quotaData.limit} calls used\n`);

  // Example 2: Use AI to analyze the quota
  console.log("Example 2: Asking deepseek-r1 to analyze quota...");
  const aiAnalysis = await callDeepseek([
    {
      role: "system",
      content:
        "You are a helpful assistant analyzing Mindbody API usage data.",
    },
    {
      role: "user",
      content: `Analyze this API quota data and provide recommendations: ${JSON.stringify(quotaData)}`,
    },
  ]);
  console.log(`  AI Analysis: ${aiAnalysis}\n`);

  // Example 3: Use AI to decide which tool to call
  console.log("Example 3: Asking deepseek-r1 to plan data sync...");
  const toolsDescription = toolsList.tools
    .map((t) => `- ${t.name}: ${t.description}`)
    .join("\n");

  const planResponse = await callDeepseek([
    {
      role: "system",
      content: `You are an AI agent with access to these Mindbody tools:\n${toolsDescription}\n\nRespond with ONLY the tool name you would call, nothing else.`,
    },
    {
      role: "user",
      content:
        "I want to get a summary of cached data. Which tool should I use?",
    },
  ]);

  console.log(`  AI suggests calling: ${planResponse.trim()}\n`);

  // Example 4: Read cache summary resource
  console.log("Example 4: Reading cache summary...");
  const cacheResource = await mcpClient.readResource({
    uri: "mindbody://cache/summary",
  });
  const cacheData = JSON.parse(cacheResource.contents[0]?.text ?? "{}");
  console.log(`  Cache summary: ${JSON.stringify(cacheData, null, 2)}\n`);

  // Example 5: Ask AI to interpret the cache data
  console.log("Example 5: AI interpretation of cache data...");
  const interpretation = await callDeepseek([
    {
      role: "system",
      content: "You are analyzing cached Mindbody business data.",
    },
    {
      role: "user",
      content: `Summarize this cache data in 2 sentences: ${JSON.stringify(cacheData)}`,
    },
  ]);
  console.log(`  AI Summary: ${interpretation}\n`);

  console.log("✅ Demo complete! deepseek-r1 can now use your MCP server.");

  // Cleanup
  await mcpClient.close();
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
