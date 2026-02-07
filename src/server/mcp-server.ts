import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Store } from '../store/store.js';
import { registerListSessions } from '../tools/list-sessions.js';
import { registerGetPendingFeedback } from '../tools/get-pending-feedback.js';
import { registerAcknowledgeFeedback } from '../tools/acknowledge-feedback.js';
import { registerResolveFeedback } from '../tools/resolve-feedback.js';
import { registerDismissFeedback } from '../tools/dismiss-feedback.js';

/**
 * Create an MCP server instance with all tools registered.
 */
export function createMcpServer(store: Store): McpServer {
  const server = new McpServer({
    name: 'pro-ui-feedbacks-mcp',
    version: '0.1.0',
  });

  registerListSessions(server, store);
  registerGetPendingFeedback(server, store);
  registerAcknowledgeFeedback(server, store);
  registerResolveFeedback(server, store);
  registerDismissFeedback(server, store);

  return server;
}

/**
 * Connect MCP server to stdio transport.
 * stdout is reserved for JSON-RPC — all logs go to stderr.
 */
export async function startMcpServer(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Server connected via stdio');
}
