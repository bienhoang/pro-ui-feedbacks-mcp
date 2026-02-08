# Code Standards & Structure Guide

**gosnap-mcp**

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [TypeScript Standards](#typescript-standards)
3. [Code Organization](#code-organization)
4. [Naming Conventions](#naming-conventions)
5. [Error Handling](#error-handling)
6. [Testing Standards](#testing-standards)
7. [Documentation Standards](#documentation-standards)
8. [Git & Commit Standards](#git--commit-standards)

---

## Project Structure

```
gosnap-mcp/
├── src/
│   ├── types/              # Zod schemas & type definitions
│   │   ├── index.ts        # Domain schemas (Feedback, Session, etc.)
│   │   ├── sync-payload.ts # Widget SyncPayload schemas
│   │   └── shared-schemas.ts # Shared shapes (BoundingBox, Accessibility, etc.)
│   ├── store/              # Store interface + implementations
│   │   ├── store.ts        # Abstract interface
│   │   └── memory-store.ts # In-memory implementation
│   ├── server/             # MCP + HTTP servers
│   │   ├── mcp-server.ts   # MCP setup & tool registration
│   │   ├── http-server.ts  # HTTP API (extracted route handlers)
│   │   └── webhook-handler.ts # Widget payload → store operations
│   ├── tools/              # MCP tool implementations
│   │   ├── list-sessions.ts
│   │   ├── get-pending-feedback.ts
│   │   ├── acknowledge-feedback.ts
│   │   ├── resolve-feedback.ts
│   │   ├── dismiss-feedback.ts
│   │   └── tool-helpers.ts # Shared formatting
│   ├── commands/           # CLI commands
│   │   ├── init.ts         # Auto-configure agents
│   │   ├── doctor.ts       # Health check
│   │   └── agent-configs.ts # Agent config paths
│   ├── constants.ts        # Shared constants
│   ├── cli.ts              # Command router
│   └── index.ts            # Public API exports
├── tests/
│   ├── fixtures/
│   │   └── sync-payloads.ts
│   ├── memory-store.test.ts
│   ├── webhook-handler.test.ts
│   ├── mcp-tools-integration.test.ts
│   ├── http-server.test.ts
│   └── tool-helpers.test.ts
├── dist/                   # Compiled output (generated)
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts (optional)
└── README.md
```

### Directory Purpose

| Directory | Purpose | Export Pattern |
|-----------|---------|-----------------|
| `src/types` | Zod schemas, TypeScript types | Named exports |
| `src/store` | Store interface + implementations | Named + default |
| `src/server` | Server factories, transport setup | Named exports |
| `src/tools` | MCP tool registration | Named exports (`register*`) |
| `src/commands` | CLI command handlers | Named exports (`run*`) |
| `tests/` | Test files (mirror src structure) | N/A |

---

## TypeScript Standards

### Compiler Config

**tsconfig.json settings (non-negotiable):**

```json
{
  "strict": true,           // Full type checking
  "noImplicitAny": true,    // Disallow implicit any
  "noUnusedLocals": true,   // Flag unused variables
  "noUnusedParameters": true,
  "resolveJsonModule": true,
  "isolatedModules": true,
  "moduleResolution": "bundler",
  "module": "ESNext",       // ESM
  "target": "ES2022"
}
```

### Type Safety

**Rules:**

1. **No `any`:** Use explicit types, generics, or unknown
   ```typescript
   // ❌ Bad
   function process(data: any): any { ... }

   // ✓ Good
   function process<T>(data: T): T { ... }
   function process(data: unknown): string { ... }
   ```

2. **Explicit return types:** Always annotate function returns
   ```typescript
   // ❌ Bad
   export function getData() {
     return store.listSessions();
   }

   // ✓ Good
   export function getData(): Session[] {
     return store.listSessions();
   }
   ```

3. **Const assertions for types:** Use `as const` for literal types
   ```typescript
   // ✓ Good
   const STATUS = ['pending', 'acknowledged'] as const;
   type Status = typeof STATUS[number];
   ```

4. **Discriminated unions over enums:**
   ```typescript
   // Prefer zod enums
   export const Status = z.enum(['pending', 'resolved', 'dismissed']);
   export type Status = z.infer<typeof Status>;
   ```

---

## Code Organization

### Module Layout Pattern

**Each module follows this structure:**

```typescript
// 1. Imports (grouped: Node → External → Internal)
import { promises as fs } from 'node:fs';
import { z } from 'zod';
import type { Store } from '../store/store.js';

// 2. Type definitions
export interface MyInterface {
  field: string;
}

// 3. Constants
const MAX_SIZE = 1024;

// 4. Main exports
export function myFunction(arg: string): void {
  // Implementation
}

// 5. Helper functions (private/internal)
function helper(): void {
  // Internal logic
}
```

### Import Organization

**Order:**
1. Node.js built-ins (`node:*`)
2. External packages (`zod`, `@modelcontextprotocol/sdk`)
3. Internal relative imports (`../types`, `./store`)

**Style:**
- Named imports: `import { z } from 'zod'`
- Default imports: `import express from 'express'` (only when needed)
- Type imports: `import type { Store } from '../store/store.js'`
- Always include `.js` extension (ESM requirement)

```typescript
// ✓ Good
import { createServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { z } from 'zod';
import type { Store } from '../store/store.js';
```

### File Length Guidelines

| Type | Max Lines | When to Split |
|------|-----------|---------------|
| Interface/type definition | 50 | → Separate file per domain |
| Simple store impl | 150 | → Consider refactoring |
| Server setup | 100 | → Extract helpers to separate file |
| Tool registration | 50 | → One tool per file |
| CLI command | 100 | → Extract handler logic |

---

## Naming Conventions

### Variables & Functions

**Style:** camelCase

```typescript
const feedbackCount = 10;
const sessionId = '...';

function getFeedback(id: string): Feedback | null { ... }
function updateStatus(feedbackId: string, newStatus: string): void { ... }
```

### Classes & Types

**Style:** PascalCase

```typescript
class MemoryStore implements Store { ... }
interface SessionWithFeedbacks { ... }
type FeedbackStatus = 'pending' | 'resolved';
```

### Constants

**Style:** UPPER_SNAKE_CASE for immutable, camelCase for mutable

```typescript
const MAX_BODY_SIZE = 1024 * 1024;
const DEFAULT_PORT = 4747;

let serverConfig = { port: 4747 }; // mutable, camelCase
```

### File Names

**Style:** kebab-case for files, matching main export

```
src/
├── types/index.ts
├── store/store.ts           # Interface
├── store/memory-store.ts    # Implementation
├── server/mcp-server.ts     # createMcpServer()
├── server/http-server.ts    # createHttpServer()
├── tools/list-sessions.ts   # registerListSessions()
├── commands/init.ts         # runInit()
```

### Zod Schemas

**Pattern:** `{EntityName}Schema` for Zod, infer type separately

```typescript
export const FeedbackSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'resolved']),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export const CreateFeedbackSchema = z.object({
  comment: z.string().min(1),
});
export type CreateFeedbackInput = z.infer<typeof CreateFeedbackSchema>;
```

---

## Error Handling

### Error Strategy

**Philosophy:** Fail fast, handle gracefully, log clearly.

### HTTP Errors

**Pattern:** Return JSON error responses

```typescript
function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Usage
if (!parsed.success) {
  json(res, 400, {
    error: 'Validation failed',
    details: parsed.error.issues,
  });
  return;
}
```

**Status codes:**
- 200: Success
- 201: Created
- 204: No content
- 400: Bad request (validation, missing fields)
- 404: Not found
- 500: Server error

### Validation Errors

**Always use Zod `safeParse`:**

```typescript
const parsed = CreateFeedbackSchema.safeParse(input);

if (!parsed.success) {
  // Handle errors
  console.error('Validation error:', parsed.error.issues);
  throw new Error('Invalid input');
}

const feedback = store.createFeedback(parsed.data);
```

### Logging

**Rules:**

1. **Error logs → stderr** (MCP protocol uses stdout)
   ```typescript
   console.error('[HTTP] Server listening on http://127.0.0.1:4747');
   console.error('[MCP] Connected via stdio');
   console.error('[ERROR] Failed to read config:', err);
   ```

2. **Info logs optional** (use when helpful, not verbose)
3. **Include context prefixes:** `[HTTP]`, `[MCP]`, `[ERROR]`
4. **Never log sensitive data:** No full request bodies, no personal info

---

## Testing Standards

### Test File Structure

**File naming:** `*.test.ts` (mirror src structure)

```
tests/
├── memory-store.test.ts      # Tests src/store/memory-store.ts
└── http-server.test.ts       # Tests src/server/http-server.ts
```

### Test Organization

**Pattern: Describe-test structure**

```typescript
import { describe, it, expect } from 'vitest';
import { MemoryStore } from '../src/store/memory-store.js';

describe('MemoryStore', () => {
  describe('createFeedback', () => {
    it('creates feedback with generated id', () => {
      const store = new MemoryStore();
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com',
      });

      expect(feedback.id).toBeDefined();
      expect(feedback.status).toBe('pending');
    });

    it('auto-creates session for new pageUrl', () => {
      const store = new MemoryStore();
      store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page1',
      });

      const sessions = store.listSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].pageUrl).toBe('https://example.com/page1');
    });
  });

  describe('getPendingFeedback', () => {
    it('returns pending + acknowledged, filters by sessionId', () => {
      // Test implementation
    });
  });
});
```

### Coverage Targets

| Module | Target |
|--------|--------|
| Store | 90%+ (critical business logic) |
| Server | 80%+ (integration tested) |
| Types | 100% (just validation) |
| CLI | 50%+ (integration tested separately) |

### Assertions

**Prefer specific assertions:**

```typescript
// ❌ Avoid
expect(feedback).toBeDefined();

// ✓ Better
expect(feedback.id).toMatch(/^[a-f0-9-]{36}$/);
expect(feedback.status).toBe('pending');
expect(feedback.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
```

---

## Documentation Standards

### Code Comments

**When to comment:**
- Complex logic or business rules
- Non-obvious algorithms
- Workarounds or hacks (explain why)
- Public API (JSDoc style)

**When NOT to comment:**
- Self-explanatory code
- Loop iterations
- Simple variable assignments

**Example:**

```typescript
/**
 * Find existing session by pageUrl or create a new one.
 * Auto-creates session if no match found by URL.
 */
function findOrCreateSession(pageUrl: string): string {
  // O(n) lookup; could optimize with Map<pageUrl, sessionId>
  for (const session of this.sessions.values()) {
    if (session.pageUrl === pageUrl) return session.id;
  }

  // Create new session
  const session: Session = {
    id: randomUUID(),
    pageUrl,
    title: new URL(pageUrl).pathname || pageUrl,
    createdAt: new Date().toISOString(),
  };
  this.sessions.set(session.id, session);
  return session.id;
}
```

### JSDoc Patterns

**For public exports:**

```typescript
/**
 * Start MCP server and optionally HTTP API server.
 * Both share the same in-memory store.
 *
 * @param options Server configuration
 * @param options.port HTTP server port (default: 4747)
 * @param options.mcpOnly Skip HTTP server if true (default: false)
 *
 * @example
 * await startServer({ port: 8080, mcpOnly: false });
 */
export async function startServer(options: ServerOptions = {}): Promise<void> {
  // ...
}
```

---

## Git & Commit Standards

### Commit Message Format

**Pattern:** `[scope] imperative subject`

```
[store] Add getSessions() method
[http] Fix CORS origin validation bug
[tools] Register acknowledge_feedback tool
[cli] Add --mcp-only flag to server command
[docs] Update API reference in README
```

### Commit Scope Reference

| Scope | Files |
|-------|-------|
| `store` | `src/store/` |
| `http` | `src/server/http-server.ts` |
| `mcp` | `src/server/mcp-server.ts` |
| `tools` | `src/tools/` |
| `types` | `src/types/` |
| `cli` | `src/cli.ts`, `src/commands/` |
| `docs` | `*.md`, `docs/` |
| `build` | `package.json`, `tsconfig.json`, `tsup.config.ts` |
| `test` | `tests/` |

### Commit Guidelines

**Do:**
- Small, focused commits (one feature/fix per commit)
- Write imperative subject ("Add feature" not "Added feature")
- Reference issue/PR if applicable
- Test before committing

**Don't:**
- Commit broken code
- Mix formatting and logic changes
- Commit debug logs or console.log statements
- Large monolithic commits

---

## Performance Guidelines

### Hot Paths

**Optimize these (most frequently called):**

1. **MCP tool calls:** Keep under 100ms
   - Avoid loops in feedback filtering
   - Use Map lookups (O(1) not O(n))

2. **HTTP request handlers:** Keep under 200ms
   - Minimal parsing, validation only
   - No file I/O in critical path

3. **Store operations:** Keep under 50ms
   - In-memory, no DB queries

### Memory Usage

**Constraints:**

- In-memory store: Acceptable < 100MB
- No memory leaks in event listeners
- Clean up resources on shutdown

**Monitor:**

```typescript
// Typical: 5-10MB with 1000 feedbacks
const size = process.memoryUsage();
console.error(`Memory: ${Math.round(size.heapUsed / 1024 / 1024)}MB`);
```

---

## Security Guidelines

### Input Validation

**Rule:** Always validate with Zod before processing

```typescript
// ❌ Unsafe
const feedback = store.createFeedback(req.body);

// ✓ Safe
const parsed = CreateFeedbackSchema.safeParse(req.body);
if (!parsed.success) {
  json(res, 400, { error: 'Validation failed' });
  return;
}
const feedback = store.createFeedback(parsed.data);
```

### No Secrets in Code

**Rules:**
- Never hardcode API keys, tokens, passwords
- Use environment variables for config
- Don't log request bodies (contain user data)
- Don't log feedback comments (PII)

### CORS & Network

**Localhost-only by default:**

```typescript
// Bind to 127.0.0.1 only (not 0.0.0.0)
server.listen(port, '127.0.0.1', () => { ... });

// Restrict CORS to localhost origins
const origins = allowedOrigins ?? [
  'http://localhost:*',
  'http://127.0.0.1:*'
];
```

---

## Before Submitting Code

### Checklist

- [ ] Code follows all conventions above
- [ ] No console.log (use console.error for logs)
- [ ] Zod validation on all inputs
- [ ] Explicit return types on functions
- [ ] No `any` types
- [ ] Tests pass: `npm test`
- [ ] Builds without error: `npm run build`
- [ ] No unused imports
- [ ] Comments explain "why", not "what"
- [ ] Commit message follows format

---

## Tooling

### Commands

```bash
npm run build      # TypeScript + bundle to dist/
npm run dev        # Run cli.ts with tsx
npm test           # Run vitest
npm test:watch     # Watch mode
```

### Type Checking

```bash
npx tsc --noEmit   # Type check without emitting
```

### Linting

**Currently:** Manual. Recommend:

```bash
npm install --save-dev eslint @typescript-eslint/parser
npx eslint src tests --fix
```

---

Generated: 2026-02-08
Status: v0.1.0 standards
