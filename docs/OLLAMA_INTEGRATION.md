# Using deepseek-r1 with Mindbody MCP Server

## Architecture

```
deepseek-r1 (Ollama) → MCP Client → Mindbody MCP Server → Mindbody API
```

## Setup Instructions

### 1. Install Ollama & deepseek-r1

```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.com/install.sh | sh

# Pull deepseek-r1 model
ollama pull deepseek-r1
```

### 2. Install MCP Client for Ollama

Since Ollama doesn't natively support MCP, you need a bridge. Options:

**Option A: Use LangChain with MCP Tools**

```bash
# Create a new integration project
mkdir deepseek-mindbody && cd deepseek-mindbody
bun init -y
bun add langchain @langchain/community @modelcontextprotocol/sdk
```

Create `bridge.ts`:
```typescript
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Connect to your Mindbody MCP Server
const transport = new StdioClientTransport({
  command: "bun",
  args: ["run", "/Users/alichamas/dev/mindobody-mcp/src/index.ts"],
});

const mcpClient = new Client({
  name: "deepseek-bridge",
  version: "1.0.0",
}, {
  capabilities: {},
});

await mcpClient.connect(transport);

// Get available tools from MCP server
const toolsList = await mcpClient.listTools();
console.log("Available Mindbody tools:", toolsList.tools.map(t => t.name));

// Initialize deepseek-r1 via Ollama
const model = new ChatOllama({
  model: "deepseek-r1",
  temperature: 0.7,
  baseUrl: "http://localhost:11434", // Default Ollama URL
});

// Convert MCP tools to LangChain tools format
const tools = toolsList.tools.map(tool => ({
  name: tool.name,
  description: tool.description,
  schema: tool.inputSchema,
  func: async (input: unknown) => {
    const result = await mcpClient.callTool({
      name: tool.name,
      arguments: input,
    });
    return JSON.stringify(result);
  },
}));

// Create agent with tools
const modelWithTools = model.bind({ tools });

// Example usage
const response = await modelWithTools.invoke([
  { role: "user", content: "Check the Mindbody API quota status" },
]);

console.log(response);
```

**Option B: Use OpenAI-Compatible API with Continue.dev**

```bash
# Install Continue.dev VSCode extension
# Configure it to use Ollama + MCP

# In Continue config (~/.continue/config.json):
{
  "models": [
    {
      "title": "deepseek-r1",
      "provider": "ollama",
      "model": "deepseek-r1",
      "apiBase": "http://localhost:11434"
    }
  ],
  "mcpServers": {
    "mindbody": {
      "command": "bun",
      "args": ["run", "/Users/alichamas/dev/mindobody-mcp/src/index.ts"]
    }
  }
}
```

**Option C: Custom Python Bridge**

```python
# bridge.py
import ollama
import json
import subprocess

# Start MCP server as subprocess
mcp_process = subprocess.Popen(
    ["bun", "run", "/Users/alichamas/dev/mindobody-mcp/src/index.ts"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

# Function to call MCP tools
def call_mcp_tool(tool_name, arguments):
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }
    mcp_process.stdin.write(json.dumps(request) + "\n")
    mcp_process.stdin.flush()
    response = mcp_process.stdout.readline()
    return json.loads(response)

# Use deepseek-r1 with tool calling
tools = [
    {
        "type": "function",
        "function": {
            "name": "sync_clients",
            "description": "Sync clients from Mindbody",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["Active", "Inactive", "All"]}
                }
            }
        }
    }
]

response = ollama.chat(
    model="deepseek-r1",
    messages=[
        {"role": "user", "content": "Sync all active clients from Mindbody"}
    ],
    tools=tools
)

# If model wants to call tool
if response.message.tool_calls:
    for tool_call in response.message.tool_calls:
        result = call_mcp_tool(
            tool_call.function.name,
            json.loads(tool_call.function.arguments)
        )
        print(result)
```

### 3. Test the Integration

```bash
# Start Ollama (if not running)
ollama serve

# In another terminal, run your bridge
bun run bridge.ts  # or python bridge.py
```

## Limitations

- Ollama doesn't natively support MCP protocol (requires bridge)
- deepseek-r1 may not support function calling as well as GPT-4/Claude
- Performance depends on your hardware (LLM runs locally)

## Alternative: Use OpenAI-Compatible Proxy

```bash
# Use LiteLLM as a proxy
pip install litellm
litellm --model ollama/deepseek-r1 --port 8000

# Then configure any OpenAI-compatible MCP client to use http://localhost:8000
```
