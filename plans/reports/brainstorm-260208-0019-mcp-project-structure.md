# Brainstorm: MCP Project Structure for UI Feedbacks

**Date:** 2026-02-08
**Status:** Agreed
**Type:** Architecture Brainstorm

---

## Problem Statement

Build an MCP (Model Context Protocol) server as an npm package (`pro-ui-feedbacks-mcp`) that:
- Receives UI visual annotations/feedback via HTTP API
- Exposes MCP tools for AI agents to query, process, and resolve feedback
- Publishable on npm with `npx` support
- Compatible with: Claude Code, Codex, Copilot, Cursor, Windsurf, Antigravity, and any MCP-compatible agent
- MVP scope: core server + essential tools, iterate later

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Use case | Visual annotations | Similar to agentation-mcp pattern |
| Transport | stdio only | Simplest, compatible with all local agents |
| Architecture | MCP server + HTTP API | No browser ext in MVP, HTTP receives feedback |
| Data input | HTTP API endpoint | Flexible, any source can POST feedback |
| Scope | MVP first | 3-5 core tools, publish, then iterate |

---

## Recommended Architecture

### Pattern: `HTTP API → Shared Store → MCP Server (stdio) → AI Agent`

```
┌──────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  External Source  │     │   MCP Server     │     │    AI Agent       │
│  (browser ext,   │────▶│  ┌────────────┐  │◀───▶│  (Claude Code,   │
│   web form,      │ HTTP│  │ Data Store  │  │stdio│   Cursor, etc.)  │
│   API client)    │     │  └────────────┘  │     │                  │
└──────────────────┘     └─────────────────┘     └──────────────────┘
```

Key insight from agentation-mcp: **single process runs both HTTP server (for receiving data) and MCP server (for agent communication)**. This keeps deployment simple — one `npx` command starts everything.

### Project Structure

```
pro-ui-feedbacks-mcp/
├── src/
│   ├── index.ts              # Main entry - starts both servers
│   ├── cli.ts                # CLI entry with shebang (#!/usr/bin/env node)
│   ├── server/
│   │   ├── mcp-server.ts     # McpServer setup, tool registration
│   │   └── http-server.ts    # HTTP API for receiving feedback
│   ├── tools/
│   │   ├── list-sessions.ts       # List active feedback sessions
│   │   ├── get-feedback.ts        # Get feedback details
│   │   ├── get-pending.ts         # Get unresolved feedback
│   │   ├── resolve-feedback.ts    # Mark feedback as resolved
│   │   └── acknowledge-feedback.ts # Mark as seen
│   ├── store/
│   │   ├── store.ts          # Store interface
│   │   └── memory-store.ts   # In-memory store (MVP)
│   └── types/
│       └── index.ts          # TypeScript types (exported for consumers)
├── dist/                     # Compiled output
├── package.json
├── tsconfig.json
├── tsup.config.ts            # Build config (tsup for simplicity)
└── README.md
```

### package.json (Key Fields)

```jsonc
{
  "name": "pro-ui-feedbacks-mcp",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "pro-ui-feedbacks-mcp": "./dist/cli.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    }
  },
  "files": ["dist"],
  "dependencies": {
    "@modelcontextprotocol/server": "^1.x",  // stable v1 until v2 ships Q1 2026
    "zod": "^3.25"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsup": "^8.x",
    "@types/node": "^22.x",
    "vitest": "^3.x"
  }
}
```

**Why `@modelcontextprotocol/server` v1.x:** v2 is pre-alpha. v1 is production-recommended, receives bug fixes for 6+ months after v2 ships.

### CLI Entry (`cli.ts`)

```typescript
#!/usr/bin/env node
import { startServer } from './index.js';

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'server':
    startServer({ port: getPort(args), mcpOnly: args.includes('--mcp-only') });
    break;
  case 'init':
    // Auto-configure for detected AI agents
    initSetup();
    break;
  case 'doctor':
    // Verify configuration
    checkSetup();
    break;
  default:
    startServer({ port: 4747 }); // default: start both
}
```

### Data Model

```typescript
// Feedback intent & severity (inspired by agentation)
type FeedbackIntent = 'fix' | 'change' | 'question' | 'approve';
type FeedbackSeverity = 'blocking' | 'important' | 'suggestion';
type FeedbackStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';

interface Feedback {
  id: string;
  sessionId: string;
  comment: string;
  // Visual context
  element?: string;           // e.g. "button.cta"
  elementPath?: string;       // e.g. "body > main > .hero > button"
  screenshotUrl?: string;     // optional screenshot
  pageUrl: string;            // page where feedback was created
  // Classification
  intent: FeedbackIntent;
  severity: FeedbackSeverity;
  status: FeedbackStatus;
  // Metadata
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;        // AI agent's resolution summary
}

interface Session {
  id: string;
  pageUrl: string;
  title: string;
  feedbacks: Feedback[];
  createdAt: string;
}
```

### MCP Tools (MVP - 5 tools)

| Tool | Description | Priority |
|------|-------------|----------|
| `list_sessions` | List all active feedback sessions | P0 |
| `get_pending_feedback` | Get all unresolved feedback (across sessions or per session) | P0 |
| `acknowledge_feedback` | Mark feedback as "seen" by agent | P0 |
| `resolve_feedback` | Mark as resolved with summary of what was done | P0 |
| `dismiss_feedback` | Reject with reasoning | P1 |

### HTTP API Endpoints (MVP)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/feedback` | Submit new feedback |
| `GET` | `/api/sessions` | List sessions |
| `GET` | `/api/sessions/:id` | Get session with feedbacks |
| `GET` | `/api/health` | Health check |

### How Users Install & Connect

**Install:**
```bash
npm install -g pro-ui-feedbacks-mcp
# or use directly
npx pro-ui-feedbacks-mcp
```

**Agent Configuration (universal pattern):**

All MCP-compatible agents use similar JSON config:

```jsonc
// Claude Code: ~/.claude/mcp.json (or claude_desktop_config.json)
// Cursor: .cursor/mcp.json
// Windsurf: .codeium/windsurf/mcp_config.json
// Copilot: .vscode/mcp.json
{
  "mcpServers": {
    "pro-ui-feedbacks": {
      "command": "npx",
      "args": ["pro-ui-feedbacks-mcp"]
    }
  }
}
```

**Auto-setup (`init` command):**
```bash
npx pro-ui-feedbacks-mcp init
# Detects installed agents, writes config automatically
```

---

## Evaluated Approaches

### Approach A: Single-file MCP server (rejected)
- Pros: Simplest, fastest to build
- Cons: Can't scale, no HTTP API, no modularity
- **Verdict:** Too simple for the requirements

### Approach B: Monorepo with separate packages (rejected)
- Pros: Clean separation, independent versioning
- Cons: Over-engineered for MVP, complex setup
- **Verdict:** YAGNI - premature complexity

### Approach C: Single package, modular source (selected)
- Pros: Simple to publish, easy to understand, modular enough to grow
- Cons: All code in one package
- **Verdict:** Perfect for MVP. Can extract to monorepo later if needed

---

## Implementation Considerations

### Build Tool: tsup
- Fast, zero-config bundler for TypeScript
- Produces both ESM output + type declarations
- Single command: `tsup src/cli.ts src/index.ts --format esm --dts`

### Testing: vitest
- Fast, TypeScript-native
- Good for both unit tests and integration tests

### Store Strategy
- MVP: In-memory store (data lost on restart — acceptable for MVP)
- V2: SQLite via `better-sqlite3` for persistence
- Store interface pattern allows swapping without changing tools

### Security Considerations
- HTTP server binds to `localhost` only (no 0.0.0.0)
- Validate Origin header on HTTP requests
- No auth in MVP (local-only), add API key auth for remote deployment later

### Agent Compatibility Matrix

| Agent | Config Location | Transport | Status |
|-------|----------------|-----------|--------|
| Claude Code | `~/.claude/mcp.json` | stdio | Supported |
| Claude Desktop | `claude_desktop_config.json` | stdio | Supported |
| Cursor | `.cursor/mcp.json` | stdio | Supported |
| Copilot (VS Code) | `.vscode/mcp.json` | stdio | Supported |
| Windsurf | `.codeium/windsurf/mcp_config.json` | stdio | Supported |
| Codex | CLI flag / config | stdio | Supported |
| JetBrains AI | IDE settings | stdio | Supported |

All use the same `npx` command pattern — stdio transport is universally supported.

---

## Success Metrics

1. `npx pro-ui-feedbacks-mcp` starts successfully
2. AI agent can call `list_sessions` and `get_pending_feedback`
3. HTTP POST to `/api/feedback` creates feedback visible to agent
4. Package installable via `npm install -g pro-ui-feedbacks-mcp`
5. Works with at least 3 different AI agents (Claude Code, Cursor, Copilot)

## Risks

| Risk | Mitigation |
|------|------------|
| In-memory store loses data on restart | Acceptable for MVP; SQLite in V2 |
| SDK v1 → v2 migration | v1 stable until mid-2026; migration guide will be provided |
| No browser extension = no easy feedback input | HTTP API is flexible enough; browser ext is V2 feature |

## Next Steps

1. Initialize npm project with TypeScript + tsup
2. Implement core MCP server with 5 tools
3. Implement HTTP API server (4 endpoints)
4. Implement in-memory store
5. Add CLI with `server`, `init`, `doctor` commands
6. Test with Claude Code + Cursor
7. Publish to npm

---

## Sources

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [@modelcontextprotocol/sdk on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [MCP Transports Specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- [Agentation MCP Reference](https://agentation.dev/mcp)
- [VS Code MCP Server Setup](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Build MCP Server Guide](https://modelcontextprotocol.io/docs/develop/build-server)
