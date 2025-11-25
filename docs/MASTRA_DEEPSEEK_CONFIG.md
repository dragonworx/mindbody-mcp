# Adding deepseek-r1 to MCP Server via Mastra

## Architecture

```
External Agent → MCP Server (with deepseek-r1 reasoning) → Mindbody API
                      ↓
                 deepseek-r1 via Ollama (internal decision making)
```

## Installation

```bash
# Install Mastra
bun add @mastra/core

# Install Ollama adapter
bun add @mastra/ollama

# Or create custom adapter
```

## Configuration

### 1. Add Environment Variables

Edit `.env`:
```bash
# Existing vars...

# AI/Agentic Configuration
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=4096
```

### 2. Update Config Schema

Edit `src/config.ts`:
```typescript
const envSchema = z.object({
  // ... existing fields ...

  // AI Configuration
  AI_PROVIDER: z.enum(["ollama", "openai", "anthropic", "none"]).default("none"),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("deepseek-r1"),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  AI_MAX_TOKENS: z.coerce.number().default(4096),
});
```

### 3. Create Mastra Service

Create `src/services/ai.ts`:
```typescript
import { Mastra } from '@mastra/core';
import type { Config } from '../config.js';

export class AIService {
  private mastra: Mastra | null = null;

  constructor(private config: Config) {
    if (this.config.AI_PROVIDER !== 'none') {
      this.initializeMastra();
    }
  }

  private initializeMastra() {
    // Custom Ollama provider
    const ollamaProvider = {
      name: 'ollama',
      async chat(messages: Array<{ role: string; content: string }>) {
        const response = await fetch(`${this.config.OLLAMA_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.config.OLLAMA_MODEL,
            messages,
            stream: false,
            options: {
              temperature: this.config.AI_TEMPERATURE,
              num_predict: this.config.AI_MAX_TOKENS,
            },
          }),
        });

        const data = await response.json();
        return data.message.content;
      },
    };

    this.mastra = new Mastra({
      providers: {
        ollama: ollamaProvider,
      },
    });
  }

  /**
   * Use AI to analyze client data and suggest actions
   */
  async analyzeClientData(clientData: Array<Record<string, unknown>>): Promise<string> {
    if (!this.mastra) {
      return "AI analysis disabled";
    }

    const prompt = `
You are analyzing Mindbody client data. Here are ${clientData.length} clients:

${JSON.stringify(clientData.slice(0, 5), null, 2)}

Provide insights:
1. Data quality issues
2. Patterns in client status/activity
3. Recommended actions for data cleanup
4. Suggestions for segmentation
`;

    const response = await this.mastra.chat({
      provider: 'ollama',
      messages: [
        { role: 'system', content: 'You are a data analyst specializing in wellness business data.' },
        { role: 'user', content: prompt },
      ],
    });

    return response;
  }

  /**
   * Intelligent appointment scheduling suggestions
   */
  async suggestAppointmentTimes(params: {
    clientId: string;
    serviceType: string;
    existingAppointments: Array<unknown>;
  }): Promise<Array<{ time: string; confidence: number; reason: string }>> {
    if (!this.mastra) {
      return [];
    }

    const prompt = `
Analyze this client's appointment history and suggest optimal booking times:

Client: ${params.clientId}
Service: ${params.serviceType}
Past appointments: ${JSON.stringify(params.existingAppointments)}

Provide 3 suggested time slots with reasoning.
`;

    const response = await this.mastra.chat({
      provider: 'ollama',
      messages: [{ role: 'user', content: prompt }],
    });

    // Parse response and structure it
    return this.parseAppointmentSuggestions(response);
  }

  private parseAppointmentSuggestions(aiResponse: string): Array<{ time: string; confidence: number; reason: string }> {
    // Parse AI response into structured suggestions
    // Implementation depends on deepseek-r1's output format
    return [];
  }

  /**
   * Autonomous workflow: Detect and fix data quality issues
   */
  async autoFixClientDataQuality(clientIds: string[]): Promise<{
    fixed: number;
    issues: Array<{ clientId: string; issue: string; action: string }>;
  }> {
    if (!this.mastra) {
      throw new Error("AI service not enabled");
    }

    // Use AI to analyze and suggest fixes
    // This would integrate with write_client_profile tool
    return {
      fixed: 0,
      issues: [],
    };
  }
}
```

### 4. Add AI-Enhanced Tools

Create `src/mcp/tools/ai-enhanced.ts`:
```typescript
import { z } from 'zod';
import type { AIService } from '../../services/ai.js';
import type { DatabaseClient } from '../../db/client.js';

export const analyzeClientsSchema = z.object({
  status: z.enum(['Active', 'Inactive', 'All']).default('Active'),
  limit: z.number().default(100),
});

export async function handleAnalyzeClients(
  args: z.infer<typeof analyzeClientsSchema>,
  db: DatabaseClient,
  aiService: AIService
) {
  // Fetch clients from cache
  const clients = db.getClients({ status: args.status, limit: args.limit });

  // Use AI to analyze
  const analysis = await aiService.analyzeClientData(clients);

  return {
    content: [
      {
        type: "text",
        text: `AI Analysis of ${clients.length} clients:\n\n${analysis}`,
      },
    ],
  };
}

export const smartScheduleSchema = z.object({
  client_id: z.string(),
  service_type: z.string(),
});

export async function handleSmartSchedule(
  args: z.infer<typeof smartScheduleSchema>,
  db: DatabaseClient,
  aiService: AIService
) {
  // Fetch client's appointment history
  const appointments = db.getAppointmentsByClient(args.client_id);

  // Use AI to suggest optimal times
  const suggestions = await aiService.suggestAppointmentTimes({
    clientId: args.client_id,
    serviceType: args.service_type,
    existingAppointments: appointments,
  });

  return {
    content: [
      {
        type: "text",
        text: `Smart scheduling suggestions:\n${JSON.stringify(suggestions, null, 2)}`,
      },
    ],
  };
}
```

### 5. Register AI Tools

Update `src/index.ts`:
```typescript
// Add imports
import { AIService } from './services/ai.js';
import {
  analyzeClientsSchema,
  handleAnalyzeClients,
  smartScheduleSchema,
  handleSmartSchedule,
} from './mcp/tools/ai-enhanced.js';

// In main() function:
const aiService = new AIService(config);

// Add to tool list:
{
  name: "analyze_clients_ai",
  description: "Use AI (deepseek-r1) to analyze client data and provide insights",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["Active", "Inactive", "All"] },
      limit: { type: "number", default: 100 },
    },
  },
},
{
  name: "smart_schedule",
  description: "AI-powered appointment time suggestions based on client history",
  inputSchema: {
    type: "object",
    properties: {
      client_id: { type: "string" },
      service_type: { type: "string" },
    },
    required: ["client_id", "service_type"],
  },
}

// Add to tool handler:
case "analyze_clients_ai":
  return handleAnalyzeClients(args, db, aiService);
case "smart_schedule":
  return handleSmartSchedule(args, db, aiService);
```

## Use Cases

### 1. AI-Powered Data Quality Analysis
```bash
# In MCP Inspector or via Claude Code:
analyze_clients_ai({ status: "Active", limit: 100 })

# Returns:
# "AI found 23 clients with missing email addresses,
#  15 clients with duplicate phone numbers,
#  Recommend running data cleanup workflow..."
```

### 2. Smart Appointment Scheduling
```bash
smart_schedule({
  client_id: "003641",
  service_type: "Massage - 60min"
})

# Returns:
# [
#   { time: "Tuesday 10:00 AM", confidence: 0.89, reason: "Client prefers mornings" },
#   { time: "Thursday 2:00 PM", confidence: 0.76, reason: "Historically books midweek" }
# ]
```

### 3. Autonomous Data Migration
```bash
# Future: AI can autonomously fix data issues
auto_migrate_clients({
  fix_duplicates: true,
  normalize_phone_numbers: true,
  dry_run: true  # Preview AI's decisions
})
```

## Performance Considerations

- **Ollama must be running**: `ollama serve`
- **Hardware**: deepseek-r1 requires ~16GB RAM, GPU recommended
- **Latency**: Local LLM calls take 2-10 seconds depending on hardware
- **Cost**: Free (runs locally) vs cloud APIs ($$$)

## Testing

```bash
# Start Ollama
ollama serve

# Pull model
ollama pull deepseek-r1

# Verify it works
curl http://localhost:11434/api/chat -d '{
  "model": "deepseek-r1",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": false
}'

# Run MCP server with AI enabled
AI_PROVIDER=ollama bun run src/index.ts
```
