import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../store/store.js';

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
    async ({ sessionId }) => {
      const feedbacks = store.getPendingFeedback(sessionId);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(feedbacks, null, 2),
          },
        ],
      };
    }
  );
}
