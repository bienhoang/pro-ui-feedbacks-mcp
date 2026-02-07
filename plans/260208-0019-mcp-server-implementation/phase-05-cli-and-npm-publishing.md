# Phase 05: CLI & npm Publishing

## Context

- **Parent plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 01-04 (all prior phases)
- **Docs:** [Brainstorm](../reports/brainstorm-260208-0019-mcp-project-structure.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-02-08 |
| Description | Wire CLI entry, implement init/doctor commands, prepare for npm publish |
| Priority | P0 |
| Implementation | pending |
| Review | pending |

## Key Insights

- CLI is the main entry point — `npx pro-ui-feedbacks-mcp` must "just work"
- Default behavior (no args) should start both MCP + HTTP servers
- `init` command auto-detects AI agents and writes MCP config
- `doctor` command verifies setup is correct
- `--mcp-only` flag for agents that don't need HTTP server

## Requirements

- `src/cli.ts` — CLI entry with shebang
- `src/index.ts` — exports `startServer()` for programmatic use
- `init` command detects Claude Code, Cursor, Copilot, Windsurf configs
- `doctor` command checks config exists and server can start
- README.md with installation + usage docs

## Architecture

```
src/
├── cli.ts            # CLI entry (#!/usr/bin/env node)
├── index.ts          # startServer() + type re-exports
└── commands/
    ├── init.ts       # Agent auto-configuration
    └── doctor.ts     # Setup verification
```

## Related Code Files

- `src/cli.ts` — new
- `src/index.ts` — new
- `src/commands/init.ts` — new
- `src/commands/doctor.ts` — new
- `README.md` — new

## Implementation Steps

### 1. `src/index.ts` — Main Entry

```typescript
import { createMcpServer, startMcpServer } from './server/mcp-server.js';
import { createHttpServer } from './server/http-server.js';
import { MemoryStore } from './store/memory-store.js';

export interface ServerOptions {
  port?: number;
  mcpOnly?: boolean;
}

export async function startServer(options: ServerOptions = {}): Promise<void> {
  const { port = 4747, mcpOnly = false } = options;
  const store = new MemoryStore();

  // Start MCP server (always)
  const mcpServer = createMcpServer(store);
  await startMcpServer(mcpServer);

  // Start HTTP server (unless --mcp-only)
  if (!mcpOnly) {
    const httpServer = createHttpServer({ port, store });
    await httpServer.start();
  }
}

// Re-export types for consumers
export * from './types/index.js';
```

### 2. `src/cli.ts` — CLI Entry

```typescript
#!/usr/bin/env node
import { startServer } from './index.js';
import { runInit } from './commands/init.js';
import { runDoctor } from './commands/doctor.js';

const args = process.argv.slice(2);
const command = args[0];

function getPort(): number {
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    return parseInt(args[portIdx + 1], 10);
  }
  return 4747;
}

async function main() {
  switch (command) {
    case 'init':
      await runInit();
      break;
    case 'doctor':
      await runDoctor();
      break;
    case 'server':
    default:
      await startServer({
        port: getPort(),
        mcpOnly: args.includes('--mcp-only'),
      });
      break;
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

### 3. `src/commands/init.ts` — Auto-Configure Agents

Detects and writes MCP config for known agents:

```typescript
// Agent config locations:
const AGENT_CONFIGS = [
  {
    name: 'Claude Code',
    configPath: '~/.claude/mcp.json',
    format: 'json',
  },
  {
    name: 'Cursor',
    configPath: '.cursor/mcp.json',
    format: 'json',
  },
  {
    name: 'VS Code / Copilot',
    configPath: '.vscode/mcp.json',
    format: 'json',
  },
  {
    name: 'Windsurf',
    configPath: '.codeium/windsurf/mcp_config.json',
    format: 'json',
  },
];

// MCP server entry to inject:
const MCP_ENTRY = {
  "pro-ui-feedbacks": {
    command: "npx",
    args: ["pro-ui-feedbacks-mcp"]
  }
};
```

Logic:
1. Check which config files exist
2. Prompt user which agents to configure (or auto-detect)
3. Read existing config, merge MCP entry, write back
4. Print summary

### 4. `src/commands/doctor.ts` — Verify Setup

Checks:
1. Node.js version >= 18
2. At least one agent config file has `pro-ui-feedbacks` entry
3. `npx pro-ui-feedbacks-mcp --version` works
4. Port 4747 is available

Output: Green checkmarks or red X with fix suggestions.

### 5. `tsup.config.ts` Update

Update entry points to include commands:

```typescript
export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
});
```

**Note:** Shebang should only be on cli.ts. Use tsup `onSuccess` or manually add shebang in build script if tsup doesn't support per-entry banners. Alternative: add shebang directly in `src/cli.ts` source — tsup preserves it.

### 6. `README.md`

Sections:
- What is this?
- Quick Start (npx)
- Installation (npm install -g)
- Agent Configuration (Claude Code, Cursor, Copilot, Windsurf)
- Available MCP Tools
- HTTP API Reference
- CLI Commands
- Programmatic Usage
- License

### 7. Pre-publish Checklist

```bash
npm run build          # Verify build
npm pack --dry-run     # Check what's included
node dist/cli.js       # Test CLI
npm publish            # Publish (when ready)
```

## Todo

- [ ] Create src/index.ts with startServer()
- [ ] Create src/cli.ts with command routing
- [ ] Create src/commands/init.ts
- [ ] Create src/commands/doctor.ts
- [ ] Update tsup.config.ts for shebang handling
- [ ] Write README.md
- [ ] Test `npm run build && node dist/cli.js`
- [ ] Test `npx` flow locally with `npm link`
- [ ] Verify package contents with `npm pack --dry-run`

## Success Criteria

- `npx pro-ui-feedbacks-mcp` starts MCP + HTTP servers
- `npx pro-ui-feedbacks-mcp init` detects and configures at least 1 agent
- `npx pro-ui-feedbacks-mcp doctor` reports setup status
- `npm pack --dry-run` shows only dist/ files
- README covers all usage scenarios

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Agent config format changes | Medium | Document manual config as fallback |
| init overwrites user's existing MCP config | High | Read → merge → write, never overwrite |
| shebang not preserved by tsup | Low | Add shebang in source file directly |

## Security Considerations

- `init` reads/writes user config files — must merge, never overwrite
- `init` should confirm before writing
- No secrets or tokens involved
- `npm pack` must only include `dist/` (enforced by `"files"` field)

## Next Steps

After all phases complete:
1. End-to-end test with Claude Code
2. Test with Cursor
3. Publish to npm
4. Create GitHub repo with CI
