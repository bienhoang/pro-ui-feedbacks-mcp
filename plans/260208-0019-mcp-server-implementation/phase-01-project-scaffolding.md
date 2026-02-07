# Phase 01: Project Scaffolding

## Context

- **Parent plan:** [plan.md](./plan.md)
- **Dependencies:** None
- **Docs:** [SDK Research](../reports/researcher-260208-0032-mcp-typescript-sdk-v1x-api.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-02-08 |
| Description | Initialize npm project with TypeScript, tsup, vitest, and all config files |
| Priority | P0 |
| Implementation | ✅ completed |
| Review | ✅ completed (score: 8.5/10) |

## Key Insights

- SDK v1.x uses `@modelcontextprotocol/sdk` single package with subpath exports
- All imports require `.js` extension for ESM
- `zod` is a required peer dependency (v3.25+ or v4)
- `tsup` handles both ESM bundling and `.d.ts` generation

## Requirements

- Initialize npm project with ESM (`"type": "module"`)
- Configure TypeScript for ESM with bundler resolution
- Setup tsup for dual entry points (`cli.ts` + `index.ts`)
- Setup vitest for testing
- Create directory structure per brainstorm

## Architecture

```
pro-ui-feedbacks-mcp/
├── src/
│   ├── index.ts
│   ├── cli.ts
│   ├── server/
│   ├── tools/
│   ├── store/
│   └── types/
├── tests/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts (optional, vitest works from tsconfig)
```

## Related Code Files

All files are new — no existing code.

## Implementation Steps

### 1. Initialize npm project

```bash
npm init -y
```

### 2. Create `package.json`

```jsonc
{
  "name": "pro-ui-feedbacks-mcp",
  "version": "0.1.0",
  "description": "MCP server for UI feedback processing by AI agents",
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
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/cli.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["mcp", "model-context-protocol", "ai-agent", "ui-feedback", "annotations"],
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsup": "^8.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

### 3. Create `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023"],
    "types": ["node"],
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 4. Create `tsup.config.ts`

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

**Note:** Banner shebang only needed for `cli.ts`. tsup applies it to all entry points but only the bin entry uses it — harmless for `index.ts`.

### 5. Create directory structure

```bash
mkdir -p src/{server,tools,store,types} tests
```

### 6. Create placeholder files

- `src/index.ts` — exports `startServer()`
- `src/cli.ts` — CLI entry point
- `src/types/index.ts` — type definitions
- `src/store/store.ts` — store interface
- `src/store/memory-store.ts` — in-memory implementation
- `src/server/mcp-server.ts` — MCP server setup
- `src/server/http-server.ts` — HTTP API

### 7. Install dependencies

```bash
npm install
```

### 8. Verify build

```bash
npm run build
```

## Todo

- [x] Initialize npm project
- [x] Create package.json with all fields
- [x] Create tsconfig.json
- [x] Create tsup.config.ts
- [x] Create directory structure
- [x] Create placeholder files
- [x] Install dependencies
- [x] Verify build succeeds

## Success Criteria

- `npm run build` produces `dist/cli.js` and `dist/index.js` with type declarations
- `node dist/cli.js --help` runs without error
- Directory structure matches brainstorm spec

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| tsup shebang on all entries | Low | Harmless for library entry |
| SDK version mismatch | Medium | Pin to ^1.26.0, test before publish |

## Security Considerations

- No secrets or credentials in package
- `.npmignore` or `"files"` field ensures only `dist/` is published

## Next Steps

Proceed to Phase 02: Core Types & Store
