import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../store/store.js';

export function registerDismissFeedback(server: McpServer, store: Store): void {
  server.registerTool(
    'dismiss_feedback',
    {
      description: 'Dismiss/reject feedback with a reason.',
      inputSchema: {
        feedbackId: z.string().describe('ID of feedback to dismiss'),
        reason: z.string().describe('Reason for dismissing the feedback'),
      },
    },
    async ({ feedbackId, reason }) => {
      const result = store.dismissFeedback(feedbackId, reason);
      if (!result) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Feedback not found or already resolved/dismissed: ${feedbackId}`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
