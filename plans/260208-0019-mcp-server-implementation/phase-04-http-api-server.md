# Phase 04: HTTP API Server

## Context

- **Parent plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 02 (types & store)
- **Docs:** [Brainstorm](../reports/brainstorm-260208-0019-mcp-project-structure.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-02-08 |
| Description | Implement HTTP API using Node.js native http module for receiving feedback |
| Priority | P0 |
| Implementation | pending |
| Review | pending |

## Key Insights

- Use native `node:http` — no Express dependency needed for 4 simple endpoints
- Keeps package lightweight (zero extra HTTP deps)
- HTTP server binds to `127.0.0.1` only (security: no external access)
- JSON body parsing is trivial with `node:http`
- Zod validates request body before store write

## Requirements

- 4 endpoints: POST /api/feedback, GET /api/sessions, GET /api/sessions/:id, GET /api/health
- Bind to localhost:4747 (configurable via --port)
- Validate request body with Zod schemas
- Share same Store instance with MCP server
- CORS headers for browser-based clients (future browser ext)

## Architecture

```
src/server/
└── http-server.ts    # HTTP API using node:http
```

Single file — 4 routes don't warrant a router framework.

## Related Code Files

- `src/server/http-server.ts` — new

## Implementation Steps

### 1. `src/server/http-server.ts`

```typescript
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Store } from '../store/store.js';
import { CreateFeedbackSchema } from '../types/index.js';

export interface HttpServerOptions {
  port: number;
  store: Store;
}

export function createHttpServer({ port, store }: HttpServerOptions) {
  const server = createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const pathname = url.pathname;

    try {
      // Route: GET /api/health
      if (req.method === 'GET' && pathname === '/api/health') {
        json(res, 200, { status: 'ok' });
        return;
      }

      // Route: GET /api/sessions
      if (req.method === 'GET' && pathname === '/api/sessions') {
        json(res, 200, store.listSessions());
        return;
      }

      // Route: GET /api/sessions/:id
      const sessionMatch = pathname.match(/^\/api\/sessions\/(.+)$/);
      if (req.method === 'GET' && sessionMatch) {
        const session = store.getSession(sessionMatch[1]);
        if (!session) {
          json(res, 404, { error: 'Session not found' });
          return;
        }
        json(res, 200, session);
        return;
      }

      // Route: POST /api/feedback
      if (req.method === 'POST' && pathname === '/api/feedback') {
        const body = await parseBody(req);
        const parsed = CreateFeedbackSchema.safeParse(body);
        if (!parsed.success) {
          json(res, 400, { error: 'Validation failed', details: parsed.error.issues });
          return;
        }
        const feedback = store.createFeedback(parsed.data);
        json(res, 201, feedback);
        return;
      }

      // 404
      json(res, 404, { error: 'Not found' });
    } catch (err) {
      console.error('[HTTP] Error:', err);
      json(res, 500, { error: 'Internal server error' });
    }
  });

  return {
    start: () => new Promise<void>((resolve) => {
      server.listen(port, '127.0.0.1', () => {
        console.error(`[HTTP] Server listening on http://127.0.0.1:${port}`);
        resolve();
      });
    }),
    close: () => new Promise<void>((resolve) => {
      server.close(() => resolve());
    }),
  };
}

// Helpers
function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}
```

### 2. Tests — `tests/http-server.test.ts`

Test cases using `fetch()` (Node 18+ built-in):
- GET /api/health returns 200 `{ status: 'ok' }`
- POST /api/feedback with valid body → 201
- POST /api/feedback with invalid body → 400 with Zod errors
- GET /api/sessions returns array
- GET /api/sessions/:id returns session or 404
- Unknown route → 404
- CORS headers present

## Todo

- [ ] Create http-server.ts
- [ ] Implement all 4 routes
- [ ] Add CORS support
- [ ] Add body parsing + Zod validation
- [ ] Write tests
- [ ] Verify tests pass

## Success Criteria

- All endpoints respond correctly
- Zod validation rejects bad input with clear errors
- Server binds to 127.0.0.1 only
- Tests pass

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| No request size limit | Low | Add max body size check (1MB) in parseBody |
| Raw `node:http` is verbose | Low | Only 4 routes, manageable |

## Security Considerations

- **Bind localhost only** (`127.0.0.1`) — prevents external access
- Validate all POST bodies via Zod
- Set max body size to prevent abuse
- CORS `*` is acceptable for MVP local-only usage

## Next Steps

Proceed to Phase 05: CLI & npm Publishing
