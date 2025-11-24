

# **Technical Specification: Mindbody Data Migration & Management MCP Server**

Version: 1.0.0  
Target Runtime: Bun.js v1.1+  
Protocol: Model Context Protocol (MCP) v2024-11-05  
Infrastructure: Dockerized (Dev/Prod)

## **1\. Executive Summary**

This document outlines the architecture for a high-performance **Mindbody MCP Server** designed to act as an intelligent middleman between AI Agents (e.g., Claude, OpenAI) and the Mindbody Public API (v6).

Unlike simple API wrappers, this server implements **Agentic Architecture**. It handles complex state management, rate limiting, authentication rotation, and bulk data synchronization internally, exposing high-level "Goals" as tools to the AI model. This ensures the AI can migrate or manage data without triggering Mindbody's aggressive rate limits (1,000 calls/day) or timing out on large datasets.

---

## **2\. System Architecture**

### **2.1 High-Level Diagrammermaid**

graph TD  
A\[AI Agent / Host\] \<--\>|Stdio / SSE| B(MCP Server \- Bun.js)  
B \<--\>|Read/Write| C{Local Cache (SQLite)}  
B \<--\>|HTTPS| D\[Mindbody Public API v6\]

subgraph "MCP Server Boundaries"  
B \--\> E  
B \--\> F\[Auth Manager\]  
B \--\> G\[Pagination Orchestrator\]  
end

\#\#\# 2.2 Core Responsibilities

1\.  \*\*The Host (AI):\*\* Reasons about \*what\* to extract/update (e.g., "Find all clients inactive since 2023 and export their notes").  
2\.  \*\*The Server (MCP):\*\* Executes the \*how\*. It calculates pagination offsets, rotates User Tokens, chunks date ranges to avoid timeouts, and standardizes the messy XML/JSON responses from Mindbody.

\---

\#\# 3\. Technical Stack & Requirements

\*   \*\*Language:\*\* TypeScript (Native execution via Bun)  
\*   \*\*Runtime:\*\* Bun.js (Chosen for sub-millisecond startup time and built-in SQLite)  
\*   \*\*SDK:\*\* \`@modelcontextprotocol/sdk\`  
\*   \*\*Validation:\*\* \`zod\` (Schema definition)  
\*   \*\*Containerization:\*\* Docker & Docker Compose  
\*   \*\*Data Persistence:\*\* \`bun:sqlite\` (Local caching for incremental migration)

\---

\#\# 4\. Project Configuration & Environment

\#\#\# 4.1 Directory Structure

mindbody-mcp/  
├── src/  
│   ├── index.ts            \# Entry point & Server initialization  
│   ├── config.ts           \# Env var validation  
│   ├── mcp/  
│   │   ├── tools/          \# Tool definitions (Action logic)  
│   │   ├── resources/      \# Resource definitions (Read-only data)  
│   │   └── prompts/        \# Standardized migration prompts  
│   ├── services/  
│   │   ├── mindbody.ts     \# Raw API wrapper (Axios/Fetch)  
│   │   ├── auth.ts         \# Staff Token rotation logic  
│   │   └── sync.ts         \# Pagination & Batching logic  
│   └── db/  
│       ├── schema.ts       \# SQLite schema  
│       └── client.ts       \# DB Access Layer  
├── data/                   \# Mounted volume for SQLite/Exports  
├── Dockerfile.dev          \# Hot-reloading dev container  
├── Dockerfile              \# Production container  
├── compose.yaml            \# Orchestration  
├── package.json  
└── tsconfig.json

\#\#\# 4.2 Environment Variables (\`.env\`)

The server requires strict configuration to function. Validation is performed on startup using \`zod\`.

\`\`\`env  
\# Mindbody Developer Credentials  
MBO\_API\_KEY=your\_api\_key\_here  
MBO\_SITE\_ID=123456  
MBO\_STAFF\_USERNAME=staff\_admin  
MBO\_STAFF\_PASSWORD=staff\_password

\# Server Config  
MCP\_SERVER\_NAME=mindbody-migrator  
LOG\_LEVEL=debug  
DATA\_DIR=./data

\# Safety Limits  
DAILY\_API\_LIMIT\_OVERRIDE=950  \# Stop before hitting the hard 1000 limit

---

## **5\. MCP Interface Specification**

### **5.1 Tools (Agent Capabilities)**

The server exposes "Smart Tools" that handle logic internally.

#### **sync\_clients**

* **Description:** "Downloads and caches client profiles from Mindbody. Handles pagination automatically. Use this before querying clients."  
* **Inputs:**  
  * status: "Active" | "Inactive" | "All" (default: Active)  
  * since\_date: ISO Date string (for delta syncs)  
* **Internal Logic:** Loops GET /client/clients with Limit=100 and Offset=N until exhaustion or rate limit warning. Saves to SQLite.

#### **export\_sales\_history**

* **Description:** "Extracts sales data for a date range. Automatically chunks large ranges into weekly requests to prevent timeouts."  
* **Inputs:**  
  * start\_date: YYYY-MM-DD  
  * end\_date: YYYY-MM-DD  
  * format: "json" | "csv"  
* **Internal Logic:** Mindbody GET /sale/sales times out on large ranges. This tool breaks a 1-year request into 52 1-week requests, aggregates results, and writes a file to the ./data volume.

#### **analyze\_formula\_notes**

* **Description:** "Retrieves and structures unstructured SOAP/Formula notes for specific clients."  
* **Inputs:**  
  * client\_id\_list: Array of strings  
* **Internal Logic:** Calls GET /client/clientformulanotes. Returns the raw text *plus* a structured suggestion if regex patterns (like hair color formulas) are detected.

#### **write\_client\_profile**

* **Description:** "Updates a client's profile. **Requires confirmation**."  
* **Inputs:**  
  * client\_id: String  
  * data: JSON Object (Validated against Mindbody UpdateClient schema)  
  * dry\_run: Boolean (default: true)

### **5.2 Resources (Passive Context)**

Data the Agent can read to understand the state of the world.

* mindbody://quota/status: Returns JSON showing calls\_made, calls\_remaining, and reset\_time.  
* mindbody://sync/logs: Reads the last 50 lines of the migration log.  
* mindbody://cache/summary: JSON summary of locally cached records (e.g., { "clients": 4502, "sales": 12000 }).

---

## **6\. Detailed Implementation Specs**

### **6.1 Authentication Service (src/services/auth.ts)**

Mindbody's UserToken expires frequently. The MindbodyClient class must intercept 401/403 errors.

1. Check if UserToken exists in memory.  
2. If missing or request fails, call POST /usertoken/issue with MBO\_STAFF\_USERNAME.  
3. Store new token.  
4. Retry original request.

### **6.2 Rate Limiting Strategy**

Mindbody enforces **1,000 calls per day**. The server must be defensive.

* **Middleware:** Every outgoing HTTP request passes through a RateLimitGuard.  
* **Persisted Counter:** Usage count is stored in SQLite (table: api\_usage), not memory, so it survives container restarts.  
* **Circuit Breaker:** If usage \> 950, the server rejects all Tool calls with a "Quota Exceeded" error unless the force flag is used.

### **6.3 Database Schema (src/db/schema.ts)**

Using bun:sqlite for simplicity and speed.

SQL

CREATE TABLE IF NOT EXISTS clients (  
    id TEXT PRIMARY KEY,  
    first\_name TEXT,  
    last\_name TEXT,  
    email TEXT,  
    raw\_data JSON, \-- Full API response  
    last\_synced\_at DATETIME  
);

CREATE TABLE IF NOT EXISTS api\_usage (  
    date DATE PRIMARY KEY,  
    count INTEGER  
);

---

## **7\. Docker Development Setup**

### **7.1 Dockerfile.dev**

Optimized for Bun hot-reloading.

Dockerfile

FROM oven/bun:1\-alpine

WORKDIR /app

\# Install dependencies  
COPY package.json bun.lockb./  
RUN bun install

\# Copy source  
COPY..

\# Expose port if using SSE (Optional)  
EXPOSE 3000

\# Run in watch mode  
CMD \["bun", "run", "--watch", "src/index.ts"\]

### **7.2 compose.yaml**

This allows the user to stand up the server and a persistent data volume with one command.

YAML

services:  
  mcp-server:  
    build:  
      context:.  
      dockerfile: Dockerfile.dev  
    volumes:  
      \-./src:/app/src       \# Hot reloading  
      \-./data:/app/data     \# Persist SQLite & Exports  
      \-./.env:/app/.env     \# Environment config  
    environment:  
      \- FORCE\_COLOR=1  
    stdin\_open: true         \# Critical for Stdio transport  
    tty: true

---

## **8\. Usage Guide for the Agent**

The user will provide this "System Prompt" context to their Agent (Claude/OpenAI) to instruct it on how to use the server effectively.

System Instruction:  
You are connected to the Mindbody Migration MCP.

1. **Always check quota first:** Read mindbody://quota/status before starting bulk operations.  
2. **Prefer Sync over Fetch:** Do not loop through 5,000 clients individually. Call sync\_clients to download them to the local cache, then ask the user to query the local database if complex filtering is needed.  
3. **Handle PII:** When extracting clientformulanotes, ensure you flag any medical or sensitive data.  
4. **Migration Mode:** When write\_client\_profile is requested, always set dry\_run: true first to show the user the diff.

---

## **9\. Development Workflow**

1. **Setup:**  
   Bash  
   git clone \<repo\>  
   cp.env.example.env  
   \# Fill in Mindbody API credentials

2. **Start Server (Docker):**  
   Bash  
   docker compose up

3. Connect Agent (Claude Desktop):  
   Edit your claude\_desktop\_config.json:  
   JSON  
   {  
     "mcpServers": {  
       "mindbody": {  
         "command": "docker",  
         "args":  
       }  
     }  
   }

   *(Note: \-T disables pseudo-tty allocation, ensuring clean Stdio piping).*  
4. Debug:  
   Use the MCP Inspector for testing tools without an LLM:  
   Bash  
   npx @modelcontextprotocol/inspector docker compose exec \-T mcp-server bun run src/index.ts  
