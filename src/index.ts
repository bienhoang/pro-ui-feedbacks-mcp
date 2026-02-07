import { createMcpServer, startMcpServer } from './server/mcp-server.js';
import { createHttpServer } from './server/http-server.js';
import { MemoryStore } from './store/memory-store.js';

export interface ServerOptions {
  port?: number;
  mcpOnly?: boolean;
}

/**
 * Start MCP server and optionally HTTP API server.
 * Both share the same in-memory store.
 */
export async function startServer(options: ServerOptions = {}): Promise<void> {
  const { port = 4747, mcpOnly = false } = options;
  const store = new MemoryStore();

  // MCP server always starts (stdio transport)
  const mcpServer = createMcpServer(store);
  await startMcpServer(mcpServer);

  // HTTP server for receiving feedback (unless --mcp-only)
  if (!mcpOnly) {
    const httpServer = createHttpServer({ port, store });
    await httpServer.start();
  }
}

// Re-export types for package consumers
export type {
  Feedback,
  FeedbackIntent,
  FeedbackSeverity,
  FeedbackStatus,
  CreateFeedbackInput,
  Session,
  SessionWithFeedbacks,
} from './types/index.js';
