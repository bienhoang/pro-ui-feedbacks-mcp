# Project Overview & Product Development Requirements (PDR)

**gosnap-mcp v0.1.0**

---

## Executive Summary

**gosnap-mcp** is an npm package that bridges UI feedback collection with AI agent capabilities. It provides:

1. **HTTP API server** for external apps to submit UI feedback annotations
2. **MCP server** exposing feedback as tools accessible to Claude Code, Cursor, Copilot, Windsurf, and other MCP-compatible agents
3. **Auto-configuration** to register with multiple AI agents

**Goal:** Enable AI agents to understand UI issues from real feedback and make informed code changes without manual context-switching.

---

## Problem Statement

### Current State

- UI feedback (design issues, typos, UX problems) is scattered across Slack, Figma, Jira, email
- Developers must manually copy/paste feedback into their agent (Claude Code, Cursor) to get context
- Agents lack visibility into real user/QA feedback during code generation
- Feedback tracking is fragmented — no single source of truth

### Desired State

- Feedback flows seamlessly from UI to AI agents via MCP protocol
- Agents see pending feedback in their tool interface, alongside code
- Agents can acknowledge, resolve, or dismiss feedback as they implement fixes
- Feedback lifecycle is tracked and visible to all stakeholders

### Impact

- **Developer velocity:** Less context-switching; agents make better decisions with real feedback
- **Quality:** Code changes directly address known UI issues
- **Feedback loop:** Issues tracked from submission → resolution
- **Integration:** Works with agents developers already use (no new tools to learn)

---

## Functional Requirements

### FR-1: Feedback Collection (HTTP API)

**Requirement:** External apps must submit UI feedback via REST API.

**Acceptance Criteria:**
- `POST /api/feedback` accepts JSON with comment, pageUrl, intent, severity
- Validation enforces required fields (comment, pageUrl)
- Optional fields: element, elementPath, screenshotUrl, sessionId, intent, severity
- Response includes full Feedback object with generated id, createdAt, status
- Feedback auto-grouped by pageUrl (auto-create/reuse session)
- HTTP status codes: 201 (created), 400 (validation), 500 (error)

**Scope:** HTTP API only, not WebSocket or polling.

---

### FR-2: Feedback Retrieval (HTTP API)

**Requirement:** External apps must query feedback and sessions via REST API.

**Acceptance Criteria:**
- `GET /api/sessions` returns array of all sessions
- `GET /api/sessions/:id` returns session with embedded feedbacks
- `GET /api/health` returns { status: "ok" }
- CORS headers restrict to localhost origins by default
- All responses are JSON

**Scope:** Read-only queries; status updates via MCP tools.

---

### FR-1.5: Widget Webhook Sync (HTTP API) [Phase 1]

**Requirement:** Widget must sync feedback changes to MCP via webhook.

**Acceptance Criteria:**
- `POST /api/webhook` accepts SyncPayload from widget
- Supports events: feedback.created, feedback.updated, feedback.deleted, feedback.batch
- SyncPayload includes: event, timestamp, page (url, pathname, viewport), feedback/feedbacks
- Feedback data includes: id, content, selector, pageX, pageY, createdAt, element, areaData
- Widget ID stored as externalId for correlation
- Updates via externalId lookup (no direct MCP ID needed from widget)
- Deletions mark feedback as dismissed with "Deleted via widget" note
- Comment max 10000 characters enforced
- URL normalization: strips query/hash for session matching
- Response: { ok: true, created/updated/deleted: ... }
- HTTP 200 (success), 400 (validation), 500 (error)

---

### FR-2.5: Store CRUD & Widget Correlation [Phase 1]

**Requirement:** Store must support feedback updates and widget ID correlation.

**Acceptance Criteria:**
- `updateFeedback(feedbackId, fields)` updates comment (only mutable field via API)
- `deleteFeedback(feedbackId)` marks as dismissed (soft delete)
- `findByExternalId(externalId)` returns MCP feedbackId for widget sync
- externalIdMap maintains widget ID → MCP ID mapping
- Store enforces comment max length (10000 chars)
- URL normalization enabled for session matching

---

### FR-3: MCP Tool: List Sessions

**Requirement:** Agents must list active feedback sessions.

**Acceptance Criteria:**
- Tool name: `list_sessions`
- No input parameters
- Returns array of sessions (id, pageUrl, title, createdAt)
- Works with MCP-compatible agents (Claude Code, Cursor, Copilot, Windsurf)

---

### FR-4: MCP Tool: Get Pending Feedback

**Requirement:** Agents must retrieve unresolved feedback.

**Acceptance Criteria:**
- Tool name: `get_pending_feedback`
- Optional input: `{ sessionId?: string }`
- Returns feedback with status "pending" or "acknowledged"
- If sessionId provided, filter by that session
- If no sessionId, return all pending feedback across sessions

---

### FR-5: MCP Tool: Acknowledge Feedback

**Requirement:** Agents must mark feedback as seen.

**Acceptance Criteria:**
- Tool name: `acknowledge_feedback`
- Input: `{ feedbackId: string }`
- Transition: pending → acknowledged
- Returns updated feedback object
- Idempotent: already acknowledged feedback returns unchanged

---

### FR-6: MCP Tool: Resolve Feedback

**Requirement:** Agents must mark feedback as fixed.

**Acceptance Criteria:**
- Tool name: `resolve_feedback`
- Input: `{ feedbackId: string, resolution: string }`
- Transition: pending/acknowledged → resolved
- Sets resolution summary (e.g., "Fixed button color in commit abc123")
- Returns updated feedback with resolvedAt timestamp
- Idempotent: already resolved stays resolved

---

### FR-7: MCP Tool: Dismiss Feedback

**Requirement:** Agents must reject feedback.

**Acceptance Criteria:**
- Tool name: `dismiss_feedback`
- Input: `{ feedbackId: string, reason: string }`
- Transition: pending/acknowledged → dismissed
- Sets reason (e.g., "As designed, per spec")
- Returns updated feedback with resolvedAt timestamp
- Idempotent: already dismissed stays dismissed

---

### FR-8: CLI: Start Servers

**Requirement:** Users must easily start MCP + HTTP servers.

**Acceptance Criteria:**
- `npx gosnap-mcp` (or `server` explicit) starts both
- `--port PORT` overrides default 4747
- `--mcp-only` starts MCP only, skips HTTP
- Logs to stderr (stdout reserved for MCP JSON-RPC)
- Process stays running (listen mode)

---

### FR-9: CLI: Auto-Configure Agents

**Requirement:** Setup must be easy for end users.

**Acceptance Criteria:**
- `npx gosnap-mcp init` auto-detects agents and configures
- Detects: Claude Code, Cursor, VS Code/Copilot, Windsurf
- Writes/merges MCP entry into each agent's config file
- Idempotent: running init twice doesn't duplicate entries
- Reports which agents were configured

---

### FR-10: CLI: Health Check

**Requirement:** Users must verify setup.

**Acceptance Criteria:**
- `npx gosnap-mcp doctor` checks configuration
- Verifies agents are configured (future: check connection)
- Reports errors or success
- Non-blocking; exit 0 on success

---

## Non-Functional Requirements

### NFR-1: Performance

- **Feedback submission:** < 100ms response (HTTP)
- **MCP tool calls:** < 500ms response (typical agent timeout)
- **Memory:** In-memory store acceptable for MVP (no persistence)
- **Concurrency:** Handle 10+ concurrent requests without degradation

**Rationale:** Feedback processing is non-critical path; agent responsiveness is more important.

---

### NFR-2: Security

**Requirements:**

1. **Network isolation:** HTTP server binds to 127.0.0.1 only (no external access)
2. **CORS:** Restrict to localhost origins by default (`http://localhost:*`, `http://127.0.0.1:*`)
3. **Validation:** Zod schema validation on all inputs
4. **Body limit:** 1MB request body limit
5. **No secrets:** Never log feedback content, only metadata
6. **MCP transport:** stdio only (no network exposure)

**Out of scope:** Authentication, encryption (assumed trusted internal network).

---

### NFR-3: Reliability

- **No data loss during operation:** Store in-memory, acceptable for MVP
- **Graceful shutdown:** Servers close on SIGTERM
- **Error handling:** All errors return JSON with descriptive message
- **Logging:** All errors logged to stderr

---

### NFR-4: Compatibility

- **Node.js:** 18+ (LTS)
- **TypeScript:** 5.7+ (strict mode)
- **MCP agents:** Claude Code, Cursor, Copilot (VS Code), Windsurf
- **Package format:** ESM only (no CJS)
- **Type definitions:** Included in dist

---

### NFR-5: Maintainability

- **Modular code:** Clear separation of concerns (types, store, server, tools, commands)
- **Extensibility:** Abstract Store interface for future database adapters
- **Testing:** Unit tests for store, HTTP, tools
- **Documentation:** Code comments, README, API docs
- **Code style:** TypeScript strict, no any types

---

### NFR-6: Deployability

- **Npm package:** Published to npm registry, installable globally or per-project
- **Bin entry:** `npx gosnap-mcp` without installation
- **Size:** Minimal dependencies (SDK + zod only)
- **Build:** Single `npm run build` command
- **Prepublish:** Auto-build before publish

---

## Technical Constraints

| Constraint | Rationale |
|-----------|-----------|
| **In-memory storage only** | MVP acceptable; prevents DB setup complexity |
| **No Express/Fastify** | Minimal footprint; pure Node.js http module |
| **ESM only** | Aligns with MCP SDK design; modern standard |
| **Zod for validation** | Type-safe runtime validation; no separate schema |
| **localhost-only HTTP** | Feedback is internal tool; external access not needed |
| **stdio MCP transport** | Standard for agent integration; no additional networking |
| **Node 18+** | LTS baseline; async/await stable; good TypeScript support |

---

## Architecture Decisions

### Decision 1: Dual Server Architecture (MCP + HTTP)

**Option A:** MCP only (agents submit feedback directly)
- Pros: Simpler, single protocol
- Cons: Requires agent to be running; external apps can't submit feedback

**Option B:** HTTP only (agents poll HTTP API)
- Pros: No new protocol
- Cons: Agents don't have MCP tools; polling inefficient

**Decision C (chosen):** Both MCP + HTTP, shared store
- Pros: Flexible; supports external apps (HTTP) and agents (MCP); real-time
- Cons: Slightly more complex

**Rationale:** Supports both scenarios — UI tools submit via HTTP, agents consume via MCP.

---

### Decision 2: Abstract Store Interface

**Option A:** Hard-code MemoryStore into servers
- Pros: Simpler, fewer abstractions
- Cons: Can't swap storage layer later

**Decision B (chosen):** Define Store interface, implement MemoryStore
- Pros: Future SQLite/Postgres adapter without changing server code
- Cons: Minimal overhead

**Rationale:** Enables persistence in future without rearchitecting.

---

### Decision 3: Session Auto-Creation

**Option A:** Require session ID in feedback submission
- Pros: Explicit, no magic
- Cons: Friction; users must create session first

**Decision B (chosen):** Auto-group by pageUrl
- Pros: Seamless UX; feedback auto-grouped by context
- Cons: Hidden dependency on pageUrl uniqueness

**Rationale:** Reduces friction; pageUrl is reliable grouping key.

---

### Decision 4: Localhost-Only HTTP

**Option A:** Bind to 0.0.0.0 (external access)
- Pros: Remote feedback submission possible
- Cons: Security risk; no authentication

**Decision B (chosen):** Bind to 127.0.0.1 only
- Pros: Secure by default; safe for developer machines
- Cons: Can't submit from remote apps (planned: API key auth in v2)

**Rationale:** Feedback is internal tool; developers control who has access.

---

## Success Metrics

| Metric | Target | Definition |
|--------|--------|-----------|
| **npm installs** | 100+ in 6mo | Package adoption |
| **Agent config** | 50% of users run init | Easy setup |
| **Feedback submission** | 10+ per session | Real-world usage |
| **Agent tool calls** | Feedback accessed by agents | Tool adoption |
| **Build time** | < 5s | Developer experience |
| **Test coverage** | 80%+ | Code quality |
| **Zero breaking changes** | Until v1.0 | Stability |

---

## Roadmap

### v0.1.0 (Phase 0 — Core)

- [x] HTTP API for feedback submission
- [x] MCP tools for agents
- [x] Auto-configure agents (init)
- [x] In-memory store
- [x] Basic CLI

### v0.1.1 (Phase 1 — Widget Integration) [Current]

- [x] POST /api/webhook for widget sync
- [x] SyncPayload schemas (Zod validation)
- [x] Webhook handler (event dispatch)
- [x] Store CRUD: updateFeedback, deleteFeedback, findByExternalId
- [x] Widget ID correlation via externalId & externalIdMap
- [x] Comment max 10000 chars validation
- [x] URL normalization for session matching
- [x] Feedback.updated and feedback.deleted events
- [x] Batch feedback creation (feedback.batch event)

### v0.2.0 (Planned — Persistence)

- [ ] SQLite persistence
- [ ] Search/filter feedback
- [ ] Bulk operations (resolve multiple feedbacks)
- [ ] Feedback export (JSON/CSV)
- [ ] Doctor command improvements

### v0.3.0 (Future)

- [ ] API key authentication
- [ ] Remote feedback submission
- [ ] Webhook callbacks (on resolve/dismiss)
- [ ] Feedback analytics dashboard
- [ ] Rate limiting

### v1.0.0 (Release)

- Stable API
- Full test coverage
- Comprehensive docs
- Breaking changes locked

---

## Testing Strategy

### Unit Tests

**Memory Store** (`tests/memory-store.test.ts`)
- Create feedback
- List sessions
- Get pending feedback
- Acknowledge, resolve, dismiss
- Session auto-creation
- Status transition validation

**HTTP Server** (`tests/http-server.test.ts`)
- POST /api/feedback validation
- GET /api/sessions
- GET /api/sessions/:id
- CORS headers
- Error handling
- 1MB body limit

### Integration Tests

- MCP tool calls end-to-end
- Feedback submission → store → MCP tool retrieval
- Multiple sessions and feedbacks

### Manual Testing

- `npx gosnap-mcp init` with real agents
- `npx gosnap-mcp doctor`
- `curl` feedback submission
- Agent integration with Claude Code

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Data loss on restart** | High | Medium | Acceptable for MVP; SQLite in v0.2 |
| **SDK breaking change** | Low | High | Pin SDK version; test before publish |
| **Agent config conflict** | Low | Low | Init checks for existing entries |
| **Port already in use** | Medium | Low | User specifies --port; clear error message |
| **CORS issues** | Low | Medium | Configurable origins; docs provided |

---

## Success Criteria

### Phase 0 (v0.1.0) — Core

- [x] HTTP API receives feedback
- [x] MCP tools expose feedback to agents
- [x] Init command configures agents
- [x] In-memory store works
- [x] Tests pass (80%+ coverage)
- [x] Zero external access (localhost only)
- [x] npm package published

### Phase 1 (v0.1.1) — Widget Integration [Current]

- [x] Webhook endpoint receives SyncPayload
- [x] Widget feedback events processed (create, update, delete, batch)
- [x] externalId correlation working
- [x] Comment validation (max 10000 chars)
- [x] URL normalization enables reliable session grouping
- [x] Store CRUD ops implemented & tested
- [x] Webhook tests passing
- [x] Integration tests: widget → webhook → store → MCP tool

### Next Phase (v0.2.0) — Persistence

- [ ] Persistence (SQLite)
- [ ] Advanced queries
- [ ] Analytics
- [ ] Dashboard

---

## Team & Ownership

**Owner:** Developer productivity & MCP integration
**Target Users:** Developers, designers, QA engineers using MCP agents
**Stakeholders:** Tool authors (Claude Code, Cursor, etc.), enterprises

---

## Appendix: Feedback Schema Example

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sessionId": "xyz789-session-id",
  "comment": "Button color should be blue, not red",
  "element": "button.cta",
  "elementPath": "body > div.container > button.cta",
  "pageUrl": "https://example.com/checkout",
  "screenshotUrl": "https://cdn.example.com/screenshot.png",
  "intent": "fix",
  "severity": "important",
  "status": "pending",
  "createdAt": "2026-02-08T10:30:00.000Z",
  "resolvedAt": null,
  "resolution": null
}
```

---

## Appendix: MCP Agent Configuration

```json
{
  "mcpServers": {
    "gosnap": {
      "command": "npx",
      "args": ["gosnap-mcp"]
    }
  }
}
```

File locations:
- Claude Code: `~/.claude/mcp.json`
- Cursor: `.cursor/mcp.json`
- VS Code: `.vscode/mcp.json`
- Windsurf: `.codeium/windsurf/mcp_config.json`

---

## Phase 1 Summary (Widget-to-MCP Integration)

**Phase 1 enables real-time widget-to-MCP feedback synchronization.**

### What's New
- **Webhook endpoint** (`POST /api/webhook`) accepts widget SyncPayload
- **Event-driven dispatch**: feedback.created, feedback.updated, feedback.deleted, feedback.batch
- **Widget correlation**: externalId maps widget feedback to MCP feedback
- **CRUD expansion**: updateFeedback, deleteFeedback, findByExternalId
- **Data validation**: SyncPayload schemas + comment max 10000 chars
- **Session grouping**: URL normalization (strips query/hash)

### Developer Impact
- Widget developers can integrate via single endpoint
- Zero knowledge of MCP IDs needed (externalId handles lookup)
- Soft deletes preserve feedback history (dismissed state)
- Real-time MCP visibility into widget feedback

### Next Priorities
1. **v0.2.0**: SQLite persistence for production readiness
2. **Batch optimizations**: Leverage feedback.batch event for high-throughput scenarios
3. **Advanced queries**: Search/filter by timestamp, intent, severity

---

Generated: 2026-02-08
Version: 0.1.1
Status: Phase 1 Complete (Widget Integration)
