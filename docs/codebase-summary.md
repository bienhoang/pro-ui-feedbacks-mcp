# Codebase Summary: pro-ui-feedbacks-mcp

**MCP server package for UI feedback collection & AI agent integration.**

## Project Overview

**pro-ui-feedbacks-mcp** enables UI designers, QA teams, and product managers to submit feedback annotations via HTTP API. AI agents (Claude Code, Cursor, Copilot, Windsurf) consume feedback through MCP tools, allowing them to understand UI issues and make informed code changes.

**Key Flow:** UI Feedback → HTTP API → Shared Store → MCP Tools → AI Agent

### Problem Solved

- UI feedback scattered across Slack/Figma/Jira becomes actionable context for AI agents
- Agents see unresolved feedback directly in their tool interface
- No manual copying/pasting of feedback — seamless integration

### Primary Use Case

1. Developer reviews UI in staging app
2. Annotates button color, copy, or flow issue via UI feedback widget
3. AI agent (via MCP) immediately sees pending feedback
4. Agent acknowledges, resolves, or dismisses feedback as it implements fixes

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node 18+ |
| Language | TypeScript 5.7+ |
| MCP SDK | @modelcontextprotocol/sdk v1.26+ |
| Validation | zod v3.25+ |
| Build | tsup v8+ (ESM bundler) |
| Testing | vitest v3+ |
| CLI | commander-style arg parsing |

### Design Patterns

- **Modular:** Clean separation of types, store, server, and tools
- **Abstract Store:** Interface-based design; MemoryStore now, SQLite later
- **Dual Transport:** MCP (stdio) + HTTP simultaneously
- **ESM-First:** No CJS fallback (cleaner, modern approach)

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────┐
│  Client App (Browser/Mobile)                │
│  - UI Feedback Widget                       │
└──────────────┬──────────────────────────────┘
               │ HTTP POST /api/feedback
               ▼
┌──────────────────────────────────────────────┐
│  HTTP Server (port 4747 by default)          │
│  - /api/feedback (POST)                      │
│  - /api/sessions (GET)                       │
│  - /api/sessions/:id (GET)                   │
│  - /api/health (GET)                         │
└──────────────┬───────────────────────────────┘
               │
               │ shared
               ▼
┌──────────────────────────────────────────────┐
│  Feedback Store (in-memory)                  │
│  - Sessions (Map<sessionId, Session>)        │
│  - Feedbacks (Map<feedbackId, Feedback>)    │
└──────────────┬───────────────────────────────┘
               │
               │ reads from
               ▼
┌──────────────────────────────────────────────┐
│  MCP Server (stdio transport)                │
│  - list_sessions()                           │
│  - get_pending_feedback()                    │
│  - acknowledge_feedback()                    │
│  - resolve_feedback()                        │
│  - dismiss_feedback()                        │
└──────────────┬───────────────────────────────┘
               │ JSON-RPC over stdin/stdout
               ▼
┌──────────────────────────────────────────────┐
│  AI Agent (Claude Code, Cursor, etc.)        │
│  - Reads pending feedback                    │
│  - Updates feedback status                   │
│  - Makes informed code changes               │
└──────────────────────────────────────────────┘
```

### High-Level Modules

```
src/
├── types/index.ts          # Zod schemas (Feedback, Session, CreateFeedback)
├── store/
│   ├── store.ts            # Interface definition
│   └── memory-store.ts     # In-memory implementation
├── server/
│   ├── mcp-server.ts       # MCP setup + tool registration
│   └── http-server.ts      # HTTP API endpoints
├── tools/                  # MCP tool implementations (5 files)
│   ├── list-sessions.ts
│   ├── get-pending-feedback.ts
│   ├── acknowledge-feedback.ts
│   ├── resolve-feedback.ts
│   └── dismiss-feedback.ts
├── commands/
│   ├── init.ts             # Auto-configure agents
│   └── doctor.ts           # Verify setup
├── cli.ts                  # Command routing
└── index.ts                # Public API (startServer)
```

---

## Core Modules

### 1. Types & Validation (`src/types/index.ts`)

**Zod schemas define all domain types:**

| Schema | Purpose |
|--------|---------|
| `FeedbackIntent` | enum: fix \| change \| question \| approve |
| `FeedbackSeverity` | enum: blocking \| important \| suggestion |
| `FeedbackStatus` | enum: pending \| acknowledged \| resolved \| dismissed |
| `Feedback` | Full feedback object with metadata |
| `CreateFeedbackSchema` | Input validation for HTTP POST |
| `Session` | Feedback collection for a page/URL |
| `SessionWithFeedbacks` | Session + array of related feedbacks |

**Key fields:**

```typescript
interface Feedback {
  id: string                    // UUID
  sessionId: string             // Groups by pageUrl
  comment: string               // User's feedback text
  pageUrl: string               // Required, URL validated
  element?: string              // DOM element description
  elementPath?: string          // Selector path (e.g., ".btn-primary")
  screenshotUrl?: string        // Optional screenshot
  intent: FeedbackIntent        // What to do: fix/change/question/approve
  severity: FeedbackSeverity    // Priority: blocking/important/suggestion
  status: FeedbackStatus        // Lifecycle: pending→acknowledged→resolved/dismissed
  createdAt: ISO8601 datetime
  resolvedAt?: ISO8601 datetime
  resolution?: string           // Summary if resolved/dismissed
}

interface Session {
  id: string                    // UUID
  pageUrl: string               // Unique per URL
  title: string                 // Derived from URL pathname
  createdAt: ISO8601 datetime
}
```

---

### 2. Store Interface & Memory Implementation

#### `src/store/store.ts`

Defines abstract interface. Implementations:

```typescript
interface Store {
  // Session queries
  listSessions(): Session[]
  getSession(sessionId: string): SessionWithFeedbacks | null

  // Feedback CRUD + transitions
  createFeedback(input: CreateFeedbackInput): Feedback
  getPendingFeedback(sessionId?: string): Feedback[]
  acknowledgeFeedback(feedbackId: string): Feedback | null
  resolveFeedback(feedbackId: string, resolution: string): Feedback | null
  dismissFeedback(feedbackId: string, reason: string): Feedback | null
}
```

#### `src/store/memory-store.ts`

In-memory implementation:

- **Data structures:** Two Maps (sessions, feedbacks)
- **Session auto-creation:** POST /api/feedback with new pageUrl auto-creates session
- **Session lookup:** Matches by pageUrl, reuses if exists
- **Status transitions:** Enforces pending→ (acknowledged, resolved, dismissed)
- **Read-only returns:** Methods return shallow copies to prevent mutations

**Example flow:**
```
POST /api/feedback { pageUrl: "https://example.com/page" }
→ findOrCreateSession() checks Map for matching pageUrl
→ If found, reuses sessionId
→ If not found, generates UUID, stores Session, returns sessionId
→ Creates Feedback with that sessionId
```

---

### 3. MCP Server (`src/server/mcp-server.ts`)

Registers 5 tools with the MCP protocol:

```typescript
createMcpServer(store: Store): McpServer
startMcpServer(server: McpServer): void
```

**Tool Registration:**

Each tool file exports a `register{ToolName}()` function:

```typescript
registerListSessions(server, store)
registerGetPendingFeedback(server, store)
registerAcknowledgeFeedback(server, store)
registerResolveFeedback(server, store)
registerDismissFeedback(server, store)
```

**MCP Transport:** stdio (JSON-RPC over stdin/stdout). All logs to stderr to preserve stdout for protocol.

---

### 4. HTTP Server (`src/server/http-server.ts`)

Node.js `http.Server` (no Express — minimal footprint):

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/feedback | Submit new feedback |
| GET | /api/sessions | List all sessions |
| GET | /api/sessions/:id | Get session + its feedbacks |
| GET | /api/health | Health check |
| OPTIONS | * | CORS preflight |

**Features:**

- **CORS:** Restricted to localhost origins by default (`http://localhost:*`, `http://127.0.0.1:*`)
- **Body parsing:** Manual (no body-parser), limited to 1MB
- **Validation:** Zod schema validation on POST /api/feedback
- **Binding:** Localhost only (127.0.0.1, no external access)
- **Port:** Configurable, default 4747

**Example request:**

```bash
curl -X POST http://127.0.0.1:4747/api/feedback \
  -H 'Content-Type: application/json' \
  -d '{
    "comment": "Button color should be blue",
    "pageUrl": "https://example.com/checkout",
    "element": "button.submit",
    "intent": "fix",
    "severity": "important"
  }'
```

---

### 5. MCP Tools (5 files)

Each tool in `src/tools/` follows the same pattern:

```typescript
export function register{ToolName}(server: McpServer, store: Store): void
```

**Tool Definitions:**

1. **list_sessions** — No input. Returns all sessions as JSON array.
2. **get_pending_feedback** — Optional input: `{ sessionId?: string }`. Returns pending + acknowledged feedbacks.
3. **acknowledge_feedback** — Input: `{ feedbackId: string }`. Marks as "acknowledged". Returns updated feedback.
4. **resolve_feedback** — Input: `{ feedbackId: string, resolution: string }`. Sets status to "resolved". Returns updated feedback.
5. **dismiss_feedback** — Input: `{ feedbackId: string, reason: string }`. Sets status to "dismissed". Returns updated feedback.

**Tool Response Format (MCP standard):**

```typescript
{
  content: [
    {
      type: "text",
      text: JSON.stringify(result, null, 2)
    }
  ]
}
```

---

### 6. CLI & Commands

#### `src/cli.ts`

Router for commands:

```bash
npx pro-ui-feedbacks-mcp                    # Start servers (default)
npx pro-ui-feedbacks-mcp server             # Explicit server start
npx pro-ui-feedbacks-mcp server --port 8080 # Custom HTTP port
npx pro-ui-feedbacks-mcp server --mcp-only  # MCP only, no HTTP
npx pro-ui-feedbacks-mcp init               # Auto-configure agents
npx pro-ui-feedbacks-mcp doctor             # Health check
```

**Port parsing:** Validates 1–65535 range. Default: 4747.

#### `src/commands/init.ts`

Auto-detects AI agents and writes MCP config:

| Agent | Config Location |
|-------|-----------------|
| Claude Code | `~/.claude/mcp.json` |
| Cursor | `.cursor/mcp.json` (project root) |
| VS Code / Copilot | `.vscode/mcp.json` |
| Windsurf | `.codeium/windsurf/mcp_config.json` |

**Flow:**
1. Check if agent config directory exists
2. Read existing config or start fresh
3. Merge `pro-ui-feedbacks` entry into `mcpServers` object
4. Write updated config with proper JSON formatting

#### `src/commands/doctor.ts`

Placeholder for setup verification.

---

### 7. Public API (`src/index.ts`)

Single export: `startServer()`

```typescript
export interface ServerOptions {
  port?: number      // Default: 4747
  mcpOnly?: boolean  // If true, skip HTTP server
}

export async function startServer(options: ServerOptions = {}): Promise<void>
```

**What it does:**

1. Creates MemoryStore instance
2. Starts MCP server (always)
3. Starts HTTP server (unless mcpOnly=true)
4. Both share same store instance

**Library usage:**

```typescript
import { startServer } from 'pro-ui-feedbacks-mcp';

await startServer({ port: 8080, mcpOnly: false });
```

---

## npm Package Structure

### `package.json` Fields

```json
{
  "name": "pro-ui-feedbacks-mcp",
  "version": "0.1.0",
  "type": "module",                    // ESM only
  "bin": {
    "pro-ui-feedbacks-mcp": "./dist/cli.js"  // CLI entry
  },
  "main": "./dist/index.js",           // Library entry
  "types": "./dist/index.d.ts",        // TypeScript types
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "engines": { "node": ">=18" },
  "files": ["dist"]                     // Published files
}
```

### Build & Distribution

- **Builder:** tsup (ESM bundles + type declarations)
- **Entry points:** `src/cli.ts` → `dist/cli.js`, `src/index.ts` → `dist/index.js`
- **Shebang:** Auto-added to `cli.js` via tsup config
- **Lifecycle:** `prepublishOnly` hook runs `npm run build` before publish

### Published Artifact

```
dist/
├── cli.js + cli.d.ts      # CLI binary
├── index.js + index.d.ts  # Library export
├── types/
│   ├── index.js + index.d.ts
│   └── store.js + store.d.ts
└── ... (other compiled modules)
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Abstract Store** | Easy to swap MemoryStore for SQLite/Postgres later |
| **Dual servers (MCP + HTTP)** | Agents talk MCP; external apps send feedback via HTTP |
| **Localhost-only HTTP** | Security: feedback assumed trusted internal tool |
| **Zod validation** | Type safety + runtime validation in one |
| **No Express** | Minimal deps, pure Node.js http module |
| **In-memory first** | MVP acceptable; restart loses data but simple |
| **Session auto-creation** | Reduces friction — feedback auto-grouped by URL |
| **ESM-only** | Modern, cleaner, aligns with MCP SDK design |

---

## Testing Strategy

**Test files:** `tests/memory-store.test.ts`, `tests/http-server.test.ts`

**Tools:** vitest

**Coverage areas:**

- Store: CRUD operations, status transitions, session lookups
- HTTP: Endpoint routing, validation, CORS, error handling
- Integration: Full request/response flows

---

## Dependencies

### Runtime

- `@modelcontextprotocol/sdk` v1.26+ — MCP protocol + server/transport
- `zod` v3.25+ — Schema validation

### Dev Only

- `typescript` — Language
- `tsup` — Build tool
- `tsx` — Run TypeScript directly (dev)
- `vitest` — Test runner
- `@types/node` — Node.js types

**No heavy deps:** ~5MB total (with transitive).

---

## File Reference

```
src/
├── types/index.ts              # 59 lines — Zod schemas
├── store/store.ts              # 23 lines — Interface
├── store/memory-store.ts       # 110 lines — Implementation
├── server/mcp-server.ts        # 36 lines — Setup + tool registration
├── server/http-server.ts       # 143 lines — HTTP API
├── tools/list-sessions.ts      # 24 lines — Tool
├── tools/get-pending-feedback.ts  # ~20 lines — Tool
├── tools/acknowledge-feedback.ts  # ~20 lines — Tool
├── tools/resolve-feedback.ts      # ~20 lines — Tool
├── tools/dismiss-feedback.ts      # ~20 lines — Tool
├── commands/init.ts            # 85 lines — Auto-config
├── commands/doctor.ts          # ? lines — TBD
├── cli.ts                       # 44 lines — Router
└── index.ts                     # 38 lines — Public API

tests/
├── memory-store.test.ts
└── http-server.test.ts
```

---

## Quick Reference

### Starting the server

```bash
# Both MCP + HTTP
npm run dev

# HTTP on custom port
npm run dev -- server --port 8080

# MCP only (stdio)
npm run dev -- server --mcp-only
```

### Submitting feedback

```bash
curl -X POST http://127.0.0.1:4747/api/feedback \
  -H 'Content-Type: application/json' \
  -d '{
    "comment": "Typo in header",
    "pageUrl": "https://app.example.com/dashboard",
    "intent": "fix",
    "severity": "suggestion"
  }'
```

### Using as library

```typescript
import { startServer } from 'pro-ui-feedbacks-mcp';

await startServer({ port: 4747, mcpOnly: false });
```

### Environment

- **Node:** 18+
- **Type mode:** ESM only
- **Logs:** stderr (stdout reserved for MCP JSON-RPC)
- **Network:** Localhost only by default (CORS: localhost:*)

---

## Future Enhancements

- SQLite/Postgres store adapter
- Persistence across restarts
- Feedback search/filtering
- Webhook callbacks
- Rate limiting
- Auth/API keys
- Dashboard UI for feedback review
- Export to JSON/CSV

---

Generated: 2026-02-08
