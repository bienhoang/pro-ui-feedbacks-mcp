# Contributing to gosnap-mcp

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
git clone https://github.com/bienhoang/gosnap-mcp.git
cd gosnap-mcp
npm install
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build with tsup |
| `npm run dev` | Run in development mode |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## How to Contribute

### Reporting Bugs

Open an issue with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS

### Suggesting Features

Open an issue tagged `enhancement` with:
- Use case description
- Proposed API/behavior
- Alternatives considered

### Pull Requests

1. Fork the repo and create your branch from `main`
2. Write or update tests for your changes
3. Ensure `npm test` passes
4. Ensure `npm run build` succeeds
5. Submit a pull request

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new MCP tool
fix: resolve session cleanup issue
docs: update API examples
test: add webhook edge cases
```

## Code Style

- TypeScript strict mode
- ES modules (`import`/`export`)
- Use Zod for runtime validation

## Project Structure

```
src/
├── cli.ts          # CLI entry point
├── index.ts        # Public API
├── mcp-server.ts   # MCP server setup
├── http-server.ts  # HTTP API
├── store.ts        # In-memory data store
├── schemas.ts      # Zod schemas
├── types.ts        # TypeScript types
└── tools/          # MCP tool handlers
tests/
└── *.test.ts       # Test files
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
