# Phase 03: MCP Server & Tools

## Context

- **Parent plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 02 (types & store)
- **Docs:** [SDK API Research](../reports/researcher-260208-0032-mcp-typescript-sdk-v1x-api.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-02-08 |
| Description | Implement MCP server with 5 tools using @modelcontextprotocol/sdk v1.x |
| Priority | P0 |
| Implementation | pending |
| Review | pending |

## Key Insights

- SDK v1.x API: `server.registerTool(name, config, handler)`
- Import from `@modelcontextprotocol/sdk/server/mcp.js` (with `.js` extension)
- Input schema is a plain object of Zod types (not z.object wrapper)
- Tool handlers return `{ content: [{ type: 'text', text: string }] }`
- `console.error()` for logging (stdout reserved for JSON-RPC in stdio)

## Requirements

- Create MCP server instance with metadata
- Register 5 tools: list_sessions, get_pending_feedback, acknowledge_feedback, resolve_feedback, dismiss_feedback
- Each tool uses Zod schemas for input validation
- Tools interact with Store interface (dependency injection)
- Connect to StdioServerTransport

## Architecture

```
src/server/
└── mcp-server.ts      # McpServer setup + tool registration

src/tools/
├── list-sessions.ts
├── get-pending-feedback.ts
├── acknowledge-feedback.ts
├── resolve-feedback.ts
└── dismiss-feedback.ts
```

**Design:** Each tool file exports a `register` function that takes `(server, store)`. The `mcp-server.ts` orchestrates registration.

## Related Code Files

- `src/server/mcp-server.ts` — new
- `src/tools/*.ts` — new (5 files)

## Implementation Steps

### 1. `src/server/mcp-server.ts` — Server Setup

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Store } from '../store/store.js';
import { registerListSessions } from '../tools/list-sessions.js';
import { registerGetPendingFeedback } from '../tools/get-pending-feedback.js';
import { registerAcknowledgeFeedback } from '../tools/acknowledge-feedback.js';
import { registerResolveFeedback } from '../tools/resolve-feedback.js';
import { registerDismissFeedback } from '../tools/dismiss-feedback.js';

export function createMcpServer(store: Store): McpServer {
  const server = new McpServer({
    name: 'pro-ui-feedbacks-mcp',
    version: '0.1.0',
  });

  // Register all tools
  registerListSessions(server, store);
  registerGetPendingFeedback(server, store);
  registerAcknowledgeFeedback(server, store);
  registerResolveFeedback(server, store);
  registerDismissFeedback(server, store);

  return server;
}

export async function startMcpServer(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Server connected via stdio');
}
```

### 2. Tool: `list_sessions`

```typescript
// src/tools/list-sessions.ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../store/store.js';

export function registerListSessions(server: McpServer, store: Store): void {
  server.registerTool(
    'list_sessions',
    {
      description: 'List all active UI feedback sessions. Each session represents a page with annotations.',
      inputSchema: {},  // no input needed
    },
    async () => {
      const sessions = store.listSessions();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(sessions, null, 2),
        }],
      };
    }
  );
}
```

### 3. Tool: `get_pending_feedback`

```typescript
// src/tools/get-pending-feedback.ts
import { z } from 'zod';
// inputSchema:
//   sessionId: z.string().optional().describe('Filter by session ID. Omit for all pending.')
// Returns: pending + acknowledged feedbacks
```

### 4. Tool: `acknowledge_feedback`

```typescript
// src/tools/acknowledge-feedback.ts
import { z } from 'zod';
// inputSchema:
//   feedbackId: z.string().describe('ID of feedback to acknowledge')
// Calls store.acknowledgeFeedback(), returns updated feedback or error
```

### 5. Tool: `resolve_feedback`

```typescript
// src/tools/resolve-feedback.ts
import { z } from 'zod';
// inputSchema:
//   feedbackId: z.string().describe('ID of feedback to resolve')
//   resolution: z.string().describe('Summary of what was done to address the feedback')
// Calls store.resolveFeedback(), returns updated feedback or error
```

### 6. Tool: `dismiss_feedback`

```typescript
// src/tools/dismiss-feedback.ts
import { z } from 'zod';
// inputSchema:
//   feedbackId: z.string().describe('ID of feedback to dismiss')
//   reason: z.string().describe('Reason for dismissing the feedback')
// Calls store.dismissFeedback(), returns updated feedback or error
```

### 7. Error Handling Pattern

All tools follow consistent error pattern:

```typescript
async ({ feedbackId }) => {
  const result = store.acknowledgeFeedback(feedbackId);
  if (!result) {
    return {
      content: [{ type: 'text', text: `Feedback not found: ${feedbackId}` }],
      isError: true,
    };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
```

### 8. Tests — `tests/mcp-tools.test.ts`

Test each tool via store mock:
- list_sessions returns formatted sessions
- get_pending_feedback filters by sessionId
- acknowledge_feedback transitions status
- resolve_feedback sets resolution
- dismiss_feedback sets reason
- Error cases for non-existent IDs

## Todo

- [ ] Create mcp-server.ts with createMcpServer()
- [ ] Implement list_sessions tool
- [ ] Implement get_pending_feedback tool
- [ ] Implement acknowledge_feedback tool
- [ ] Implement resolve_feedback tool
- [ ] Implement dismiss_feedback tool
- [ ] Write tests for all tools
- [ ] Verify MCP server connects via stdio

## Success Criteria

- All 5 tools registered and callable
- Tools return properly formatted MCP responses
- Error cases handled gracefully
- Tests pass

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| SDK API changes in minor versions | Low | Pin ^1.26.0 |
| Tool naming conflicts with other MCP servers | Low | Use descriptive names |

## Security Considerations

- Validate all tool inputs via Zod schemas
- Tools only read/write to shared store, no filesystem or network access
- `isError: true` flag for error responses (MCP convention)

## Next Steps

Proceed to Phase 04: HTTP API Server
