# Examples: deepseek-r1 Integration

This directory contains examples showing how to use **deepseek-r1** (via Ollama) with the Mindbody MCP Server.

## Quick Start

### 1. Prerequisites

```bash
# Install Ollama (macOS)
brew install ollama

# Or download from https://ollama.com/download
```

### 2. Start Ollama & Pull Model

```bash
# Start Ollama server
ollama serve

# In another terminal, pull deepseek-r1
ollama pull deepseek-r1

# Verify it works
ollama run deepseek-r1 "Hello, can you help me analyze data?"
```

### 3. Run the Bridge Example

```bash
# From the project root
cd examples
bun run deepseek-bridge.ts
```

## What It Does

The `deepseek-bridge.ts` script demonstrates:

1. ✅ **Connecting** deepseek-r1 to your MCP server
2. ✅ **Reading resources** (quota status, cache summary)
3. ✅ **Using AI** to analyze MCP data
4. ✅ **AI decision-making** (choosing which tool to call)
5. ✅ **Full integration** of local LLM with Mindbody API

## Expected Output

```
🚀 Starting deepseek-r1 <-> Mindbody MCP Bridge

✅ Connected to Mindbody MCP Server
📋 Available tools: sync_clients, export_sales_history, ...
📚 Available resources: quota/status, cache/summary, sync/logs

Example 1: Reading quota status resource...
  Quota: 57/950 calls used

Example 2: Asking deepseek-r1 to analyze quota...
  AI Analysis: The API usage is healthy with only 6% of daily quota consumed...

Example 3: Asking deepseek-r1 to plan data sync...
  AI suggests calling: sync_clients

Example 4: Reading cache summary...
  Cache summary: {
    "clients": {
      "total": 4473,
      "active": 1131
    }
  }

Example 5: AI interpretation of cache data...
  AI Summary: Your database contains 4,473 client records with 1,131 active clients...

✅ Demo complete! deepseek-r1 can now use your MCP server.
```

## Architecture

```
┌─────────────────────┐
│   deepseek-r1       │  ← Local LLM (via Ollama)
│   (AI Reasoning)    │
└──────────┬──────────┘
           │
           │ HTTP API
           │
┌──────────▼──────────┐
│  Bridge Script      │  ← This example
│  (deepseek-bridge)  │
└──────────┬──────────┘
           │
           │ MCP Protocol (stdio)
           │
┌──────────▼──────────┐
│  Mindbody MCP       │  ← Your MCP Server
│  Server             │
└──────────┬──────────┘
           │
           │ HTTPS
           │
┌──────────▼──────────┐
│  Mindbody API       │
└─────────────────────┘
```

## Customization

### Change the LLM Model

Edit `deepseek-bridge.ts`:
```typescript
// Use a different Ollama model
body: JSON.stringify({
  model: "llama3.1",  // or "mistral", "codellama", etc.
  // ...
})
```

### Add Tool Calling

Extend the bridge to actually call MCP tools based on AI decisions:

```typescript
// After AI suggests a tool
if (planResponse.includes("sync_clients")) {
  console.log("Calling sync_clients tool...");
  const result = await mcpClient.callTool({
    name: "sync_clients",
    arguments: { status: "Active" },
  });
  console.log(result);
}
```

### Use Streaming Responses

For real-time AI output:
```typescript
const response = await fetch("http://localhost:11434/api/chat", {
  // ...
  body: JSON.stringify({
    model: "deepseek-r1",
    messages,
    stream: true,  // Enable streaming
  }),
});

for await (const chunk of response.body) {
  const data = JSON.parse(chunk);
  process.stdout.write(data.message.content);
}
```

## Troubleshooting

### "Connection refused" to Ollama

```bash
# Make sure Ollama is running
ollama serve

# Check status
curl http://localhost:11434/api/tags
```

### "Model not found"

```bash
# Pull the model first
ollama pull deepseek-r1

# List installed models
ollama list
```

### MCP Server not starting

```bash
# Test MCP server independently
cd ..
bun run src/index.ts

# Check for errors in output
```

### Out of memory

deepseek-r1 requires ~16GB RAM. Try a smaller model:
```bash
# Use llama3.2 (lighter weight)
ollama pull llama3.2
```

## Next Steps

- **Add function calling**: Let AI autonomously call MCP tools
- **Build workflows**: Chain multiple tool calls together
- **Create agents**: Give AI specific goals (e.g., "sync and analyze all clients")
- **Integrate with Mastra**: Add the full Mastra framework for production-grade agents

See:
- `/docs/OLLAMA_INTEGRATION.md` - Full integration guide
- `/docs/MASTRA_DEEPSEEK_CONFIG.md` - Adding AI directly to MCP server
