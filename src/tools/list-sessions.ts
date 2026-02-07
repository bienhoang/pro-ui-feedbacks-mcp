import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../store/store.js';
import { toolSuccess } from './tool-helpers.js';

export function registerListSessions(server: McpServer, store: Store): void {
  server.registerTool(
    'list_sessions',
    {
      description:
        'List all active UI feedback sessions. Each session represents a page with annotations.',
      inputSchema: {},
    },
    async () => toolSuccess(store.listSessions())
  );
}
