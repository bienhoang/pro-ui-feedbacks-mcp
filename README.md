# pro-ui-feedbacks-mcp

MCP (Model Context Protocol) server for UI feedback processing by AI agents.

Receives UI annotations/feedback via HTTP API and exposes them to AI agents (Claude Code, Cursor, Copilot, Windsurf, Codex, etc.) through MCP tools.

## Quick Start

```bash
npx pro-ui-feedbacks-mcp
```

This starts both:
- **MCP server** on stdio (for AI agent communication)
- **HTTP API** on `http://127.0.0.1:4747` (for receiving feedback)

## Installation

```bash
npm install -g pro-ui-feedbacks-mcp
```

## Agent Configuration

All MCP-compatible agents use a similar JSON config:

```json
{
  "mcpServers": {
    "pro-ui-feedbacks": {
      "command": "npx",
      "args": ["pro-ui-feedbacks-mcp"]
    }
  }
}
```

### Auto-setup

```bash
npx pro-ui-feedbacks-mcp init
```

Detects installed agents and writes config automatically.

### Config locations

| Agent | Config File |
|-------|------------|
| Claude Code | `~/.claude/mcp.json` |
| Cursor | `.cursor/mcp.json` |
| VS Code / Copilot | `.vscode/mcp.json` |
| Windsurf | `.codeium/windsurf/mcp_config.json` |

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_sessions` | List all active feedback sessions |
| `get_pending_feedback` | Get unresolved feedback (optionally by session) |
| `acknowledge_feedback` | Mark feedback as seen |
| `resolve_feedback` | Mark as resolved with summary |
| `dismiss_feedback` | Reject with reasoning |

## HTTP API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/feedback` | Submit new feedback |
| `GET` | `/api/sessions` | List all sessions |
| `GET` | `/api/sessions/:id` | Get session with feedbacks |
| `GET` | `/api/health` | Health check |

### Submit feedback

```bash
curl -X POST http://127.0.0.1:4747/api/feedback \
  -H 'Content-Type: application/json' \
  -d '{
    "comment": "Fix the button color",
    "pageUrl": "https://example.com/page",
    "intent": "fix",
    "severity": "important"
  }'
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx pro-ui-feedbacks-mcp` | Start servers (default) |
| `npx pro-ui-feedbacks-mcp server` | Start servers |
| `npx pro-ui-feedbacks-mcp server --port 8080` | Custom HTTP port |
| `npx pro-ui-feedbacks-mcp server --mcp-only` | MCP only, no HTTP |
| `npx pro-ui-feedbacks-mcp init` | Auto-configure agents |
| `npx pro-ui-feedbacks-mcp doctor` | Verify setup |

## Programmatic Usage

```typescript
import { startServer } from 'pro-ui-feedbacks-mcp';

await startServer({ port: 4747, mcpOnly: false });
```

## License

MIT
