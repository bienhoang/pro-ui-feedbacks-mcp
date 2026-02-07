# MCP TypeScript SDK v1.x API Research Report

**Generated:** 2026-02-08
**SDK Version:** v1.26.0 (latest v1.x)
**Branch:** https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x

## Executive Summary

MCP TypeScript SDK v1.x uses **single package** `@modelcontextprotocol/sdk` with subpath exports. All imports use `.js` extension for ESM compatibility. Zod v3.25+ or v4.0 required as peer dependency.

---

## 1. Package & Installation

```bash
npm install @modelcontextprotocol/sdk zod
```

**Package name:** `@modelcontextprotocol/sdk` (single package, not separate `@modelcontextprotocol/server`)
**Version:** 1.26.0
**Peer deps:** `zod` ^3.25 || ^4.0 (required)
**Type:** ESM (`"type": "module"`)
**Node:** >=18

---

## 2. Import Paths (Exact)

### Server Components

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
```

### Types

```typescript
import {
  CallToolResult,
  ReadResourceResult,
  GetPromptResult,
  ResourceLink,
  PrimitiveSchemaDefinition
} from "@modelcontextprotocol/sdk/types.js";
```

### Zod Import

```typescript
import * as z from "zod/v4";  // Recommended (SDK uses v4 internally)
// OR
import { z } from "zod";      // Also works with v3.25+
```

**Critical:** All imports **MUST** include `.js` extension for ESM compatibility.

---

## 3. McpServer Instantiation

### Minimal

```typescript
const server = new McpServer({
  name: "my-server",
  version: "1.0.0"
});
```

### With Capabilities

```typescript
const server = new McpServer(
  {
    name: "my-server",
    version: "1.0.0",
    icons: [{ src: "./icon.svg", sizes: ["512x512"], mimeType: "image/svg+xml" }],
    websiteUrl: "https://example.com"
  },
  {
    capabilities: {
      logging: {},
      tasks: { requests: { tools: { call: {} } } }
    }
  }
);
```

---

## 4. Tool Definition API

### Method Signature

```typescript
server.registerTool(
  name: string,
  config: {
    title?: string;              // Display name (optional)
    description: string;          // Required
    inputSchema: ZodObjectShape;  // Zod schema object
    outputSchema?: ZodObjectShape; // Optional
    annotations?: {
      title?: string;
      readOnlyHint?: boolean;
      openWorldHint?: boolean;
    };
  },
  handler: (params: InferredFromZod, extra?: ExtraContext) => Promise<CallToolResult>
)
```

### Examples

#### Basic Tool

```typescript
server.registerTool(
  'greet',
  {
    title: 'Greeting Tool',
    description: 'A simple greeting tool',
    inputSchema: {
      name: z.string().describe('Name to greet')
    }
  },
  async ({ name }) => {
    return {
      content: [{ type: 'text', text: `Hello, ${name}!` }]
    };
  }
);
```

#### Tool with Output Schema

```typescript
server.registerTool(
  'get_weather',
  {
    description: 'Get weather information for a city',
    inputSchema: {
      city: z.string().describe('City name'),
      country: z.string().describe('Country code')
    },
    outputSchema: {
      temperature: z.object({
        celsius: z.number(),
        fahrenheit: z.number()
      }),
      conditions: z.enum(['sunny', 'cloudy', 'rainy', 'stormy', 'snowy']),
      humidity: z.number().min(0).max(100)
    }
  },
  async ({ city, country }) => {
    const structuredContent = {
      temperature: { celsius: 22, fahrenheit: 72 },
      conditions: 'sunny',
      humidity: 65
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
      structuredContent  // Optional: for structured output
    };
  }
);
```

#### Complex Schema Example

```typescript
server.registerTool(
  'collect-user-info',
  {
    description: 'Collect user information through form elicitation',
    inputSchema: {
      infoType: z.enum(['contact', 'preferences', 'feedback'])
        .describe('Type of information to collect')
    }
  },
  async ({ infoType }, extra) => {
    // Handler implementation
    return {
      content: [{ type: 'text', text: 'Success' }]
    };
  }
);
```

---

## 5. Transport Connection

### Stdio (Local/Process-spawned)

```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Streamable HTTP (Remote/Recommended)

```typescript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const transport = new StreamableHTTPServerTransport({
  // Configuration options
});
await server.connect(transport);
```

### Express Integration

```typescript
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";

const app = createMcpExpressApp(); // Auto DNS rebinding protection for localhost
app.listen(3000);
```

---

## 6. Minimal Working Example (Complete)

**File:** `server.ts`

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

// Create server
const server = new McpServer({
  name: "minimal-server",
  version: "1.0.0"
});

// Register tool
server.registerTool(
  'echo',
  {
    description: 'Echo back the input message',
    inputSchema: {
      message: z.string().describe('Message to echo')
    }
  },
  async ({ message }) => {
    return {
      content: [{ type: 'text', text: message }]
    };
  }
);

// Connect transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Server running on stdio');
}

main().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
```

**Run:**
```bash
npx tsx server.ts
```

---

## 7. Key Differences from Community Examples

| Aspect | v1.x Official | Community Examples Found |
|--------|--------------|--------------------------|
| Package | `@modelcontextprotocol/sdk` | Sometimes shown as `@modelcontextprotocol/server` (incorrect) |
| Server class | `McpServer` | Sometimes `Server` (older API) |
| Method | `server.registerTool()` | Sometimes `server.tool()` or `server.setRequestHandler()` |
| Imports | Subpath exports (`.../mcp.js`) | Sometimes root imports |
| Zod import | `zod/v4` recommended | Often `zod` |

**Important:** Community tutorials may show v2 pre-alpha or old patterns. Always use v1.x branch docs.

---

## 8. Additional Features

### Resources

```typescript
server.registerResource(
  'config',
  'config://app',
  {
    title: 'Application Config',
    description: 'Application configuration data',
    mimeType: 'text/plain'
  },
  async () => {
    return {
      contents: [{
        uri: 'config://app',
        mimeType: 'text/plain',
        text: 'config data'
      }]
    };
  }
);
```

### Prompts

```typescript
server.registerPrompt(
  'prompt-name',
  {
    title: 'Prompt Title',
    description: 'Prompt description'
  },
  async () => {
    return {
      messages: [
        { role: 'user', content: { type: 'text', text: 'Prompt content' } }
      ]
    };
  }
);
```

### Logging

```typescript
await server.sendLoggingMessage(
  {
    level: 'info',
    data: 'Log message'
  },
  sessionId  // Optional
);
```

---

## 9. TypeScript Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2023"],
    "types": ["node"]
  }
}
```

**package.json:**
```json
{
  "type": "module",
  "engines": {
    "node": ">=18"
  }
}
```

---

## 10. Official Examples Location

All examples in SDK repo: `src/examples/`

**Key files:**
- `src/__fixtures__/testServer.ts` - Minimal stdio example
- `src/examples/server/mcpServerOutputSchema.ts` - Output schema example
- `src/examples/server/toolWithSampleServer.ts` - Tool with sampling
- `src/examples/server/simpleStreamableHttp.ts` - Full-featured HTTP server

---

## Sources

- [MCP TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [v1.x Branch Documentation](https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x)
- [MCP SDK npm Package](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [MCP Documentation](https://modelcontextprotocol.io/docs/develop/build-server)
- [DEV Community: Building MCP Servers](https://dev.to/shadid12/how-to-build-mcp-servers-with-typescript-sdk-1c28)
- [DEV Community: Star Wars API Example](https://dev.to/glaucia86/from-zero-to-mcp-building-a-model-context-protocol-server-with-typescript-and-the-star-wars-api-1kdi)

---

## Unresolved Questions

None - all requirements answered with verified code from official v1.x branch.
