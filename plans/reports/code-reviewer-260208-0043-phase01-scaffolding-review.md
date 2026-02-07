# Code Review: pro-ui-feedbacks-mcp Phase 01

**Score: 8.5/10**

## Scope

- Files reviewed: 14 TypeScript source files, 2 test files, 3 config files
- Lines analyzed: ~750 LOC
- Review focus: Full codebase - Phase 01 scaffolding implementation
- Updated plans: phase-01-project-scaffolding.md

## Overall Assessment

Solid MVP implementation. Code is clean, well-structured, type-safe. Successfully implements MCP server with HTTP API. TypeScript strictness enabled, no compilation errors, all tests passing (27/27). Localhost-only binding correct. Minor npm metadata gaps, one security advisory (CORS wildcard), performance considerations for production scale.

## Critical Issues

None.

## High Priority Findings

### 1. CORS Wildcard in Production Context

**Location:** `src/server/http-server.ts:19`

```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
```

**Issue:** Wildcard CORS allows any origin to call API. While localhost-only binding (127.0.0.1) mitigates external access, browser-based tools on localhost can still access from any page.

**Impact:** Medium - potential for CSRF if malicious page runs on localhost

**Fix:** Add configurable CORS origins:

```typescript
export interface HttpServerOptions {
  port: number;
  store: Store;
  allowedOrigins?: string[]; // default: ['http://localhost', 'http://127.0.0.1']
}
```

### 2. npm Package Metadata Missing

**Location:** `package.json`

**Missing fields:**
- `author`
- `repository`
- `bugs`
- `homepage`

**Impact:** Medium - reduces discoverability, trust on npm registry

**Fix:** Add standard metadata before publishing.

### 3. URL Constructor Error Handling

**Location:** `src/store/memory-store.ts:104`

```typescript
title: new URL(pageUrl).pathname || pageUrl,
```

**Issue:** `new URL()` throws on invalid URLs. CreateFeedbackSchema validates URL format, but fallback risky if validation bypassed.

**Impact:** Low-Medium - crashes server if invalid URL reaches store

**Fix:** Wrap in try-catch or trust validation layer (current approach acceptable for MVP).

## Medium Priority Improvements

### 4. Memory Store Data Mutation

**Location:** `src/store/memory-store.ts:63-90`

```typescript
acknowledgeFeedback(feedbackId: string): Feedback | null {
  const feedback = this.feedbacks.get(feedbackId);
  if (!feedback || feedback.status !== 'pending') return null;
  feedback.status = 'acknowledged'; // Mutates internal state
  return { ...feedback }; // Returns copy
}
```

**Issue:** Methods mutate stored objects then return shallow copy. Pattern mixes mutation with immutability. Inconsistent with "return copy" approach.

**Concern:** If returned object has nested refs, mutations could leak. Current schema is flat, so safe for now.

**Recommendation:** Document mutation strategy or refactor to full immutability.

### 5. Session Auto-Creation Logic

**Location:** `src/store/memory-store.ts:96-109`

**Issue:** Sessions auto-created based on pageUrl matching. If multiple pages have same base URL but different query params/fragments, they'll create separate sessions. Intent unclear.

**Example:**
- `https://app.com/page?v=1` → session A
- `https://app.com/page?v=2` → session B

**Recommendation:** Document session grouping strategy. Consider normalizing URLs or using explicit session IDs.

### 6. HTTP Body Size Limit Constant

**Location:** `src/server/http-server.ts:5`

```typescript
const MAX_BODY_SIZE = 1024 * 1024; // 1MB
```

**Good:** DoS protection in place.

**Concern:** 1MB generous for feedback comments. Screenshots sent as URLs (external), so body should be small.

**Recommendation:** Consider 100KB limit (still generous for text + metadata).

### 7. No Input Sanitization for Resolution/Reason Strings

**Location:** `src/store/memory-store.ts:77, 88`

```typescript
feedback.resolution = resolution;
feedback.resolution = reason;
```

**Issue:** Strings stored as-is. No length limits enforced beyond Zod schema on feedback creation. MCP tool inputs (`resolution`, `reason`) not validated.

**Impact:** Low - internal data store, but agents could inject long strings causing memory issues.

**Recommendation:** Add max length validation in tool handlers (e.g., 5000 chars).

### 8. Error Handling in HTTP Server

**Location:** `src/server/http-server.ts:75-78`

```typescript
catch (err) {
  console.error('[HTTP] Error:', err);
  json(res, 500, { error: 'Internal server error' });
}
```

**Good:** Generic error message prevents info leakage.

**Concern:** All errors return 500. Client can't distinguish validation (400) from parse errors from unexpected crashes.

**Current:** `parseBody` rejects with specific errors, but they're caught and masked. Acceptable for MVP.

### 9. MCP Tool Input Schema Format

**Location:** `src/tools/get-pending-feedback.ts:11-16`

```typescript
inputSchema: {
  sessionId: z.string().optional().describe('...'),
}
```

**Issue:** Direct Zod schema passed to `registerTool`. SDK expects JSONSchema7, but accepts Zod directly via type coercion. Works but non-standard.

**Status:** Acceptable per SDK v1.x patterns. Zod-to-JSONSchema conversion happens internally.

### 10. CLI Port Parsing No Validation

**Location:** `src/cli.ts:9-15`

```typescript
function getPort(): number {
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    return parseInt(args[portIdx + 1], 10);
  }
  return 4747;
}
```

**Issue:** `parseInt` returns `NaN` for non-numeric input. No range check (1-65535).

**Impact:** Low - crashes later on server.listen with cryptic error.

**Fix:** Add validation:

```typescript
const parsed = parseInt(args[portIdx + 1], 10);
if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
  console.error('Error: --port must be 1-65535');
  process.exit(1);
}
return parsed;
```

### 11. tsup Shebang Banner Applied to All Entries

**Location:** `tsup.config.ts:9-12` (from plan, not implemented)

**Status:** Plan specified banner, but actual config omits it. Shebang still present in `dist/cli.js`.

**Finding:** tsup auto-adds shebang for bin entries. Config simpler without explicit banner. Current approach correct.

### 12. No Linter Config

**Finding:** No ESLint/Biome config. TypeScript strict mode provides type safety but no style enforcement.

**Impact:** Low - code is clean, consistent style observed.

**Recommendation:** Add ESLint with recommended rules before team expansion.

## Low Priority Suggestions

### 13. Test Coverage Gaps

**Coverage:** 27 tests, core functionality covered.

**Missing:**
- MCP tool registration (unit tests for each tool without full server)
- CLI command parsing edge cases (invalid commands, --help)
- `doctor` and `init` commands (file system operations)
- HTTP OPTIONS preflight tested, but no test for non-CORS requests
- Error path for MAX_BODY_SIZE exceeded

**Recommendation:** Add integration test for MCP stdio transport.

### 14. Console.error for Non-Errors

**Locations:** Throughout CLI and servers

```typescript
console.error('[MCP] Server connected via stdio');
console.error('[HTTP] Server listening on...');
```

**Issue:** Info logs sent to stderr. Convention: use stderr for errors, stdout for output (though stdout reserved for MCP JSON-RPC).

**Current:** Acceptable for MCP context (stdout must be clean). Consider structured logging library for production.

### 15. Hardcoded Agent Paths in init/doctor

**Location:** `src/commands/init.ts:17-30`, `doctor.ts:24-32`

**Issue:** Hardcoded paths for Claude/Cursor/VSCode/Windsurf. Brittle if agents change config locations.

**Recommendation:** Document supported agents, version this list.

### 16. Session Title Extraction

**Location:** `src/store/memory-store.ts:104`

```typescript
title: new URL(pageUrl).pathname || pageUrl,
```

**Issue:** Title is pathname (`/page` or `/`). Not user-friendly. Fallback to full URL if pathname empty.

**Better:** Extract hostname + pathname or allow custom title in CreateFeedbackInput.

### 17. No README.md

**Finding:** No README in project root.

**Impact:** Low - MVP/internal project. Critical before publishing.

**Recommendation:** Add before npm publish with usage, examples, API docs.

## Positive Observations

1. **TypeScript Strict Mode:** Enabled, no type errors. Good type coverage.
2. **Localhost Binding:** HTTP server correctly binds to 127.0.0.1 (security win).
3. **Input Validation:** Zod schemas validate all HTTP inputs, prevents injection.
4. **DoS Protection:** MAX_BODY_SIZE limit prevents large payloads.
5. **Immutable Returns:** Store methods return copies, not internal refs (mostly).
6. **MCP SDK Usage:** Correct for v1.x - stdio transport, tool registration, JSON-RPC compliance.
7. **ESM First:** Proper ESM setup, `.js` extensions in imports, `"type": "module"`.
8. **Build Pipeline:** tsup config correct, shebang added, `.d.ts` generated.
9. **Test Quality:** 27 tests cover core flows, edge cases (duplicate sessions, state transitions).
10. **YAGNI/KISS:** No over-engineering. MVP implements exactly what's needed.
11. **Error Handling:** Store methods return null on invalid ops (no throws in core logic).
12. **Status Machine:** Feedback status transitions enforced (pending → acknowledged → resolved/dismissed).

## Recommended Actions

### Immediate (Before Publishing)

1. Add package.json metadata (author, repository, homepage, bugs)
2. Create README.md with usage examples
3. Add LICENSE file (currently declared MIT in package.json)
4. Validate CLI --port input range
5. Document session grouping behavior

### Short Term

1. Configure CORS origins (replace wildcard)
2. Add ESLint config
3. Add max length validation for resolution/reason in MCP tools
4. Consider reducing MAX_BODY_SIZE to 100KB
5. Add integration test for MCP stdio transport
6. Test npm pack before first publish

### Long Term

1. Consider SQLite store for persistence
2. Add structured logging (pino/winston)
3. Add telemetry/metrics (optional)
4. Version agent config paths
5. Support custom session titles

## Metrics

- **Type Coverage:** 100% (strict mode, no `any` usage)
- **Test Coverage:** Core flows covered, ~70% estimated (no coverage report)
- **Linting Issues:** N/A (no linter configured)
- **Build:** ✅ Success
- **Tests:** ✅ 27/27 passed
- **TypeScript:** ✅ No errors
- **SLOC:** ~750 lines

## OWASP Security Checklist

| Concern | Status | Notes |
|---------|--------|-------|
| Injection | ✅ Good | Zod validation, no SQL/command injection vectors |
| Auth | N/A | No auth (localhost trust model) |
| Sensitive Data | ✅ Good | No secrets, localhost only |
| XSS | ✅ Good | JSON API, no HTML rendering |
| CSRF | ⚠️ Medium | CORS wildcard - see #1 |
| Security Misconfig | ✅ Good | Localhost binding correct |
| Vulnerable Deps | ✅ Good | No known CVEs in @modelcontextprotocol/sdk or zod |
| Logging | ✅ Good | No sensitive data logged |
| Input Validation | ✅ Good | Zod schemas comprehensive |
| DoS | ✅ Good | Body size limit enforced |

## Architecture Compliance

- **YAGNI:** ✅ No unused features, no premature abstractions
- **KISS:** ✅ Simple Store interface, clear separation of concerns
- **DRY:** ✅ Tool registration pattern repeated but simple, acceptable

## npm Package Correctness

- ✅ `"type": "module"` set
- ✅ `bin` field points to dist/cli.js (shebang present)
- ✅ `main` and `types` point to dist/index.js + .d.ts
- ✅ `exports` field correct for ESM
- ✅ `files: ["dist"]` ensures clean publish
- ✅ `engines.node: ">=18"` documented
- ✅ `prepublishOnly` runs build
- ⚠️ Missing: author, repository, bugs, homepage
- ⚠️ Missing: README.md, LICENSE file

## MCP SDK v1.x Compliance

- ✅ Correct imports from `@modelcontextprotocol/sdk`
- ✅ `.js` extensions in all imports
- ✅ `McpServer` + `StdioServerTransport` usage correct
- ✅ Tool registration via `registerTool` with Zod schemas
- ✅ Tool handlers return `{ content: [...], isError?: boolean }`
- ✅ stdio reserved for JSON-RPC (logs to stderr)

## Phase 01 Plan Compliance

Checked against `phase-01-project-scaffolding.md`:

- ✅ npm project initialized with ESM
- ✅ TypeScript configured for ESM + bundler resolution
- ✅ tsup dual entry points (cli.ts + index.ts)
- ✅ vitest setup
- ✅ Directory structure matches spec
- ✅ All placeholder files created and implemented
- ✅ Dependencies installed
- ✅ Build succeeds
- ✅ Success criteria met: dist/ generated, CLI runs, structure correct
- ⚠️ Plan TODO list not updated (still shows unchecked)

## Plan Update

Updated `phase-01-project-scaffolding.md` implementation status:
- Implementation: ✅ completed
- Review: ✅ completed

## Unresolved Questions

1. Intended session grouping strategy - should query params be normalized?
2. Target npm registry - public npmjs.org or private?
3. Will CORS origins be configurable via env vars or passed to startServer()?
4. Is mutation + copy return pattern in Store intentional architectural choice?

## Next Steps

1. Address package.json metadata + README before publish
2. Validate CLI port input (quick win)
3. Proceed to Phase 02 per plan (if phases defined)
4. Consider production-readiness checklist (CORS, logging, monitoring)
