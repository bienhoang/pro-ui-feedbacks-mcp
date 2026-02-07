# Phase 02: Core Types & Store

## Context

- **Parent plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 01 (project scaffolding)
- **Docs:** [Brainstorm](../reports/brainstorm-260208-0019-mcp-project-structure.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-02-08 |
| Description | Define TypeScript types, Zod schemas, store interface, and in-memory store |
| Priority | P0 |
| Implementation | pending |
| Review | pending |

## Key Insights

- Store interface pattern enables future swap (memory → SQLite) without changing tools
- Zod schemas serve dual purpose: HTTP validation + MCP tool input schemas
- Types should be exported for consumers who want custom integrations

## Requirements

- Define all domain types (Feedback, Session, enums)
- Create Zod schemas matching the types
- Define abstract Store interface
- Implement MemoryStore with full CRUD
- Export types from package

## Architecture

```
src/types/
└── index.ts          # All types + Zod schemas

src/store/
├── store.ts          # Store interface (abstract)
└── memory-store.ts   # In-memory implementation
```

## Related Code Files

- `src/types/index.ts` — new
- `src/store/store.ts` — new
- `src/store/memory-store.ts` — new

## Implementation Steps

### 1. `src/types/index.ts` — Types & Schemas

```typescript
import { z } from 'zod';

// Enums
export const FeedbackIntent = z.enum(['fix', 'change', 'question', 'approve']);
export type FeedbackIntent = z.infer<typeof FeedbackIntent>;

export const FeedbackSeverity = z.enum(['blocking', 'important', 'suggestion']);
export type FeedbackSeverity = z.infer<typeof FeedbackSeverity>;

export const FeedbackStatus = z.enum(['pending', 'acknowledged', 'resolved', 'dismissed']);
export type FeedbackStatus = z.infer<typeof FeedbackStatus>;

// Feedback schema
export const FeedbackSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  comment: z.string(),
  element: z.string().optional(),
  elementPath: z.string().optional(),
  screenshotUrl: z.string().url().optional(),
  pageUrl: z.string().url(),
  intent: FeedbackIntent,
  severity: FeedbackSeverity,
  status: FeedbackStatus,
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
  resolution: z.string().optional(),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

// Create feedback input (from HTTP API)
export const CreateFeedbackSchema = z.object({
  comment: z.string().min(1),
  pageUrl: z.string().url(),
  element: z.string().optional(),
  elementPath: z.string().optional(),
  screenshotUrl: z.string().url().optional(),
  intent: FeedbackIntent.default('fix'),
  severity: FeedbackSeverity.default('suggestion'),
  sessionId: z.string().optional(), // auto-create session if not provided
});
export type CreateFeedbackInput = z.infer<typeof CreateFeedbackSchema>;

// Session schema
export const SessionSchema = z.object({
  id: z.string(),
  pageUrl: z.string().url(),
  title: z.string(),
  createdAt: z.string().datetime(),
});
export type Session = z.infer<typeof SessionSchema>;

// Session with feedbacks (for queries)
export interface SessionWithFeedbacks extends Session {
  feedbacks: Feedback[];
}
```

### 2. `src/store/store.ts` — Store Interface

```typescript
import type { Feedback, Session, SessionWithFeedbacks, CreateFeedbackInput } from '../types/index.js';

export interface Store {
  // Sessions
  listSessions(): Session[];
  getSession(sessionId: string): SessionWithFeedbacks | null;

  // Feedback
  createFeedback(input: CreateFeedbackInput): Feedback;
  getPendingFeedback(sessionId?: string): Feedback[];
  acknowledgeFeedback(feedbackId: string): Feedback | null;
  resolveFeedback(feedbackId: string, resolution: string): Feedback | null;
  dismissFeedback(feedbackId: string, reason: string): Feedback | null;
}
```

### 3. `src/store/memory-store.ts` — In-Memory Implementation

Key behaviors:
- Auto-create session when feedback's `sessionId` is missing (group by `pageUrl`)
- Generate IDs with `crypto.randomUUID()`
- Feedback status transitions: `pending` → `acknowledged` → `resolved`/`dismissed`
- `getPendingFeedback()` returns feedbacks with status `pending` or `acknowledged`

Implementation:
- Use `Map<string, Session>` for sessions
- Use `Map<string, Feedback>` for feedbacks (flat, linked by `sessionId`)
- `getSession()` joins session + its feedbacks

### 4. Tests — `tests/memory-store.test.ts`

Test cases:
- Create feedback auto-creates session
- Create feedback with existing sessionId links to session
- List sessions returns all
- Get pending returns only pending/acknowledged
- Acknowledge transitions status
- Resolve transitions status + sets resolution
- Dismiss transitions status + sets resolution
- Get session includes feedbacks

## Todo

- [ ] Create types/index.ts with Zod schemas
- [ ] Create store/store.ts interface
- [ ] Create store/memory-store.ts implementation
- [ ] Write tests for MemoryStore
- [ ] Verify all tests pass

## Success Criteria

- All types exported and usable
- MemoryStore passes all CRUD tests
- Zod schemas validate correctly

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema too rigid for future features | Low | Zod schemas easy to extend |
| In-memory data loss | Accepted | MVP tradeoff, SQLite in V2 |

## Security Considerations

- Validate all input through Zod schemas before storing
- No direct user input reaches store without validation

## Next Steps

Proceed to Phase 03: MCP Server & Tools
