import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../store/store.js';
import { toolSuccess } from './tool-helpers.js';

export function registerGetPendingFeedback(server: McpServer, store: Store): void {
  server.registerTool(
    'get_pending_feedback',
    {
      description:
        'Get all unresolved feedback. Optionally filter by session ID.',
      inputSchema: {
        sessionId: z
          .string()
          .optional()
          .describe('Filter by session ID. Omit for all pending feedback.'),
      },
    },
    async ({ sessionId }) => toolSuccess(store.getPendingFeedback(sessionId))
  );
}
