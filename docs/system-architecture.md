# System Architecture

**pro-ui-feedbacks-mcp v0.1.0**

---

## Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    External UI Layer                         │
│           (Browser, Mobile, Design Tool, etc.)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP REST API
                     │ (JSON over HTTP)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              pro-ui-feedbacks-mcp Server                     │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   HTTP Server (Express-like, Node.js http)           │  │
│  │   - POST /api/feedback                               │  │
│  │   - GET /api/sessions                                │  │
│  │   - GET /api/sessions/:id                            │  │
│  │   - GET /api/health                                  │  │
│  └─────────────────────┬─────────────────────────────────┘  │
│                        │                                     │
│                        │                                     │
│                        ▼                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   Shared In-Memory Store                             │  │
│  │   - Sessions Map<sessionId, Session>                │  │
│  │   - Feedbacks Map<feedbackId, Feedback>            │  │
│  └──────────────┬──────────────────────────────────────┘  │
│                 │                                           │
│                 │                                           │
│                 ▼                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   MCP Server (Model Context Protocol)                │  │
│  │   - list_sessions                                     │  │
│  │   - get_pending_feedback                              │  │
│  │   - acknowledge_feedback                              │  │
│  │   - resolve_feedback                                  │  │
│  │   - dismiss_feedback                                  │  │
│  └─────────────────────┬─────────────────────────────────┘  │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         │ MCP JSON-RPC
                         │ (stdio: stdin/stdout)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              AI Agents (MCP Clients)                         │
│   Claude Code | Cursor | Copilot | Windsurf | Codex        │
└─────────────────────────────────────────────────────────────┘
```

---

## Execution Flow

### Flow 1: Submit Feedback (HTTP API)

```
1. External App (Browser/Mobile)
   ↓ (HTTP POST /api/feedback)
2. HTTP Server receives request
   ↓ (parsing + validation)
3. Zod validates CreateFeedbackSchema
   ↓ (if valid)
4. Store.createFeedback() called
   ↓
5. Store auto-creates or reuses Session (by pageUrl)
   ↓
6. Store creates Feedback with:
   - Generated UUID id
   - ISO8601 createdAt timestamp
   - Status: 'pending'
7. Feedback persisted in-memory
   ↓
8. HTTP response 201 Created with full Feedback object
   ↓ (Agent polls or waits)
9. Agent sees feedback via MCP tool
```

### Flow 2: Get Pending Feedback (MCP)

```
1. AI Agent calls MCP tool: get_pending_feedback
   ↓ (optional input: sessionId)
2. MCP Server routes to tool handler
   ↓
3. Store.getPendingFeedback(sessionId) called
   ↓
4. Store queries all feedbacks, filters:
   - Status in ['pending', 'acknowledged']
   - If sessionId provided, also matches sessionId
   ↓
5. Returns array of Feedback objects (JSON stringified)
   ↓
6. Agent receives feedback list in tool output
   ↓
7. Agent displays feedback to developer
   ↓
8. Developer reads feedback, takes action
```

### Flow 3: Resolve Feedback (MCP)

```
1. AI Agent calls MCP tool: resolve_feedback
   Input: { feedbackId: '...', resolution: '...' }
   ↓
2. MCP Server routes to tool handler
   ↓
3. Store.resolveFeedback(feedbackId, resolution) called
   ↓
4. Store finds feedback by id, validates:
   - Status must be 'pending' or 'acknowledged'
   - Not already 'resolved' or 'dismissed'
   ↓
5. Store updates feedback:
   - status = 'resolved'
   - resolution = input.resolution
   - resolvedAt = now (ISO8601)
   ↓
6. Updated Feedback returned to tool
   ↓
7. Agent receives response
   ↓
8. Feedback marked as resolved in future queries
```

---

## Component Architecture

### 1. Type Layer (`src/types/index.ts`)

**Responsibility:** Define all data types via Zod schemas.

**Exports:**
- `FeedbackIntent` enum
- `FeedbackSeverity` enum
- `FeedbackStatus` enum
- `FeedbackSchema` + `Feedback` type
- `CreateFeedbackSchema` + `CreateFeedbackInput` type
- `SessionSchema` + `Session` type
- `SessionWithFeedbacks` interface

**Dependencies:** zod only

**Rationale:** Centralized, single source of truth for validation + types.

---

### 2. Store Layer (`src/store/`)

#### Interface (`src/store/store.ts`)

**Responsibility:** Define abstract interface for feedback storage.

**Methods:**
- `listSessions(): Session[]`
- `getSession(sessionId): SessionWithFeedbacks | null`
- `createFeedback(input): Feedback`
- `getPendingFeedback(sessionId?): Feedback[]`
- `acknowledgeFeedback(feedbackId): Feedback | null`
- `resolveFeedback(feedbackId, resolution): Feedback | null`
- `dismissFeedback(feedbackId, reason): Feedback | null`

**Why interface?** Future adapters (SQLite, Postgres) without changing servers.

#### Implementation (`src/store/memory-store.ts`)

**Responsibility:** In-memory data persistence.

**Data structures:**
```typescript
private sessions = new Map<string, Session>();
private feedbacks = new Map<string, Feedback>();
```

**Key methods:**
- `createFeedback()` — Generates UUID, auto-creates session by pageUrl
- `getPendingFeedback()` — Filters by status + optional sessionId
- `acknowledgeFeedback()` — Transitions pending → acknowledged
- `resolveFeedback()` — Transitions to resolved, sets timestamp
- `dismissFeedback()` — Transitions to dismissed, sets timestamp
- `findOrCreateSession()` — Internal helper for session lookup/creation

**Constraints:**
- No persistence (lost on restart) — acceptable for MVP
- Session lookup is O(n); future: index by pageUrl
- Returns shallow copies to prevent mutations

---

### 3. Server Layer (`src/server/`)

#### MCP Server (`src/server/mcp-server.ts`)

**Responsibility:** Create MCP server instance and register tools.

**Exports:**
- `createMcpServer(store: Store): McpServer`
- `startMcpServer(server: McpServer): void`

**Dependencies:**
- `@modelcontextprotocol/sdk/server/mcp.js` — MCP protocol
- `@modelcontextprotocol/sdk/server/stdio.js` — Stdio transport
- All tool files

**What it does:**
1. Creates new `McpServer` with name + version
2. Registers 5 tools (list_sessions, get_pending_feedback, etc.)
3. Connects to stdio transport (JSON-RPC)
4. All stdout reserved for protocol; logs go to stderr

**Key design:** Tools are independent modules. Server just wires them up.

#### HTTP Server (`src/server/http-server.ts`)

**Responsibility:** Create HTTP API server for feedback submission.

**Exports:**
- `createHttpServer(options): { start, close }`

**Options:**
- `port: number` — Default 4747
- `store: Store` — Shared store reference
- `allowedOrigins?: string[]` — CORS origins

**Endpoints:**

| Method | Path | Handler |
|--------|------|---------|
| POST | /api/feedback | parseBody() → validate → store.createFeedback() |
| GET | /api/sessions | store.listSessions() |
| GET | /api/sessions/:id | store.getSession(id) |
| GET | /api/health | { status: 'ok' } |
| OPTIONS | * | CORS preflight |

**Key features:**
- Manual body parsing (no Express)
- Zod validation on POST /api/feedback
- CORS restricted to localhost by default
- Binds to 127.0.0.1 only (secure by default)
- 1MB request body limit
- All errors return JSON

**Helper functions:**
- `json(res, status, data)` — Serialize response to JSON
- `parseBody(req)` — Buffer request body, parse JSON

---

### 4. Tools Layer (`src/tools/`)

**5 files, each following same pattern:**

```typescript
export function register{ToolName}(server: McpServer, store: Store): void {
  server.registerTool(
    'tool-name',
    {
      description: 'What this tool does',
      inputSchema: { /* Zod-like schema */ },
    },
    async (input) => {
      // Call store, return result
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
```

**Tools:**

1. **list_sessions.ts** — No input; returns all sessions
2. **get_pending_feedback.ts** — Optional { sessionId }; returns pending feedback
3. **acknowledge_feedback.ts** — Input { feedbackId }; marks as seen
4. **resolve_feedback.ts** — Input { feedbackId, resolution }; marks as fixed
5. **dismiss_feedback.ts** — Input { feedbackId, reason }; marks as rejected

**Design:** Each file ~20–30 lines. Simple, focused, easy to test.

---

### 5. Commands Layer (`src/commands/`)

#### init.ts

**Responsibility:** Auto-detect and configure AI agents.

**Flow:**
1. Enumerate known agents + their config paths
2. Check if each agent config dir exists
3. Read existing config or start fresh
4. Merge MCP entry `pro-ui-feedbacks` into `mcpServers` object
5. Write updated JSON to disk
6. Report results (which agents configured)

**Supported agents:**
- Claude Code: `~/.claude/mcp.json`
- Cursor: `.cursor/mcp.json`
- VS Code / Copilot: `.vscode/mcp.json`
- Windsurf: `.codeium/windsurf/mcp_config.json`

**Entry format:**
```json
{
  "pro-ui-feedbacks": {
    "command": "npx",
    "args": ["pro-ui-feedbacks-mcp"]
  }
}
```

#### doctor.ts

**Responsibility:** Verify setup (placeholder for v0.1).

**Future: Check**
- Agents are configured
- MCP server can start
- HTTP port is available

---

### 6. CLI Layer (`src/cli.ts`)

**Responsibility:** Route command-line arguments to handlers.

**Commands:**
- `server` (default) — Start both MCP + HTTP servers
- `init` — Auto-configure agents
- `doctor` — Verify setup

**Flags:**
- `--port PORT` — Override HTTP port (default 4747)
- `--mcp-only` — Skip HTTP server

**Flow:**
1. Parse `process.argv.slice(2)`
2. Extract command (args[0])
3. Validate flags (--port must be 1–65535)
4. Route to appropriate handler
5. Catch errors, exit with code 1 on failure

---

### 7. Public API (`src/index.ts`)

**Responsibility:** Export main entry point for library usage.

**Export:**
- `startServer(options): Promise<void>`

**Options:**
- `port?: number` — Default 4747
- `mcpOnly?: boolean` — Default false

**What it does:**
1. Create MemoryStore
2. Create MCP server, start it
3. If not mcpOnly, create HTTP server and start it
4. Both servers share same store
5. Process stays running (listen mode)

**Library example:**
```typescript
import { startServer } from 'pro-ui-feedbacks-mcp';

await startServer({ port: 8080, mcpOnly: false });
```

---

## Data Model

### Session

```typescript
interface Session {
  id: string                    // UUID v4
  pageUrl: string               // Unique, https://... format
  title: string                 // Derived from URL pathname
  createdAt: ISO8601 datetime   // When session created
}
```

**Invariants:**
- pageUrl must be valid URL
- One session per pageUrl
- createdAt never changes

### Feedback

```typescript
interface Feedback {
  id: string                    // UUID v4, immutable
  sessionId: string             // References Session.id
  comment: string               // User's feedback
  element?: string              // DOM element name/class
  elementPath?: string          // CSS selector
  screenshotUrl?: string        // Optional screenshot
  pageUrl: string               // Original submission URL
  intent: 'fix' | 'change' | 'question' | 'approve'
  severity: 'blocking' | 'important' | 'suggestion'
  status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed'
  createdAt: ISO8601 datetime   // Submission time
  resolvedAt?: ISO8601 datetime // When status terminal
  resolution?: string           // Summary (if resolved/dismissed)
}
```

**Invariants:**
- id, sessionId, comment, pageUrl are immutable
- status transitions: pending → (acknowledged) → (resolved | dismissed)
- Terminal statuses: resolved, dismissed (can't reopen)
- resolvedAt set when status becomes terminal
- resolution required for terminal states

**Status transitions:**

```
pending
  ↓ (acknowledge)
acknowledged
  ↓ (resolve or dismiss)
resolved       or       dismissed
    ↓                      ↓
  terminal              terminal
(immutable)           (immutable)
```

---

## Control Flow Patterns

### Request-Response (HTTP)

```
Client Request (HTTP)
    ↓
HTTP Server receives
    ↓
Parse body (JSON)
    ↓
Validate (Zod)
    ↓
Call store method
    ↓
Store updates in-memory
    ↓
Return response (JSON, HTTP status)
    ↓
Client receives
```

### Tool Call (MCP)

```
Agent calls tool (JSON-RPC)
    ↓
MCP Server deserializes
    ↓
Tool handler executes
    ↓
Call store method
    ↓
Format tool response (text/JSON)
    ↓
MCP Server serializes (JSON-RPC)
    ↓
Agent receives
```

---

## Concurrency & State

### Thread Safety (Single-Process Node)

**Node.js is single-threaded (event loop):**
- No locks needed for store operations
- In-memory updates are atomic (JavaScript execution model)
- Multiple concurrent HTTP requests handled sequentially or interleaved via event loop

**Potential issue:** Long-running store operations block event loop.
**Current:** All operations O(1) or O(n) with small n. No issue for MVP.

### State Consistency

**Invariants maintained:**
- Feedback status never reverts (pending → acknowledged only forward)
- Session ID assigned once, never changes
- Feedback feedback immutable after creation (only status/resolution mutable)

**Store ensures:**
- No orphaned feedbacks (session exists)
- Status transitions validated (can't skip states)
- Timestamps immutable after creation

---

## Error Scenarios & Handling

### Validation Errors

```typescript
// Input doesn't match schema
POST /api/feedback { pageUrl: 'invalid' }
→ Zod validation fails
→ HTTP 400 { error: 'Validation failed', details: [...] }
```

### Not Found

```typescript
GET /api/sessions/nonexistent-id
→ store.getSession() returns null
→ HTTP 404 { error: 'Session not found' }
```

### Server Errors

```typescript
Unexpected exception in handler
→ Caught by try/catch
→ HTTP 500 { error: 'Internal server error' }
→ Error logged to stderr
```

### MCP Tool Error

```typescript
Tool handler throws
→ MCP server catches
→ Returns error in tool response
→ Agent receives error message
```

---

## Extensibility Points

### Future: Store Adapter (SQLite)

**Current:** MemoryStore

**Future:** SQLiteStore

```typescript
export class SQLiteStore implements Store {
  private db: Database;

  async createFeedback(input): Promise<Feedback> {
    // SQL INSERT INTO feedbacks
  }

  // ... rest of interface
}
```

**Change:** `new MemoryStore()` → `new SQLiteStore('./data.db')`

### Future: API Authentication

**Current:** Localhost-only, no auth

**Future:** API key or JWT

```typescript
const isValid = validateApiKey(req.headers['x-api-key']);
if (!isValid) {
  json(res, 401, { error: 'Unauthorized' });
  return;
}
```

### Future: Webhooks

**Current:** Store-only, no events

**Future:** Emit events on feedback state change

```typescript
store.on('feedback:resolved', (feedback) => {
  webhook.post('/hooks/feedback', { feedback });
});
```

---

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| createFeedback | O(n) | Session lookup by pageUrl |
| listSessions | O(1) | Return Map keys |
| getSession | O(n) | Filter feedbacks by sessionId |
| getPendingFeedback | O(n) | Filter all feedbacks |
| acknowledgeFeedback | O(1) | Direct Map lookup |
| resolveFeedback | O(1) | Direct Map lookup |
| dismissFeedback | O(1) | Direct Map lookup |

**Optimization opportunity:** Index feedbacks by sessionId for O(1) getSession.

### Space Complexity

- **Sessions:** O(s) where s = unique pageUrls
- **Feedbacks:** O(f) where f = total feedback count
- **Typical:** < 1000 sessions, < 10,000 feedbacks = < 10MB

---

## Security Model

### Network

- **Localhost binding:** 127.0.0.1 only (not 0.0.0.0)
- **CORS:** Restricted to `http://localhost:*`, `http://127.0.0.1:*`
- **No TLS:** Feedback assumed trusted internal network

### Input

- **Validation:** Zod schema on all HTTP inputs
- **Length limits:** 1MB request body
- **No SQL injection:** In-memory store (future: parameterized queries)

### Output

- **No secrets:** Never log feedback content or user data
- **Errors are generic:** "Validation failed" not "Field X missing"
- **Logs to stderr:** Stdout reserved for MCP protocol

---

## Deployment Model

### Runtime

- **Node.js:** 18+ (LTS)
- **Process:** Single process, single thread
- **Termination:** SIGTERM gracefully closes servers

### Packaging

- **Format:** npm package (ESM)
- **Entry:** `npx pro-ui-feedbacks-mcp` (from bin field)
- **Library:** `import { startServer } from 'pro-ui-feedbacks-mcp'`

### Scalability

**Current:** Single server per feedback instance.

**Future:** Load balancer + multiple instances → shared database (SQLiteStore → PostgresStore).

---

## Monitoring & Observability

### Logging

**Current:** Minimal logging (errors to stderr)

**Future needs:**
- Request logging (method, path, status, duration)
- Tool call logging
- Store operation metrics

---

## Testing Strategy

### Unit Tests

- Store CRUD operations
- Status transitions
- Validation errors

### Integration Tests

- HTTP endpoint flows
- MCP tool calls end-to-end

### Manual Testing

- Real agent integration
- Init command with actual agents

---

Generated: 2026-02-08
Version: 0.1.0
