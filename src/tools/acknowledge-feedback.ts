import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../store/store.js';

export function registerAcknowledgeFeedback(server: McpServer, store: Store): void {
  server.registerTool(
    'acknowledge_feedback',
    {
      description: 'Mark a feedback item as seen/acknowledged by the agent.',
      inputSchema: {
        feedbackId: z.string().describe('ID of feedback to acknowledge'),
      },
    },
    async ({ feedbackId }) => {
      const result = store.acknowledgeFeedback(feedbackId);
      if (!result) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Feedback not found or not in pending state: ${feedbackId}`,
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
