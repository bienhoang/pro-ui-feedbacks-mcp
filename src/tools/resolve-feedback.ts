import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../store/store.js';

export function registerResolveFeedback(server: McpServer, store: Store): void {
  server.registerTool(
    'resolve_feedback',
    {
      description:
        'Mark feedback as resolved with a summary of what was done to address it.',
      inputSchema: {
        feedbackId: z.string().describe('ID of feedback to resolve'),
        resolution: z
          .string()
          .describe('Summary of what was done to address the feedback'),
      },
    },
    async ({ feedbackId, resolution }) => {
      const result = store.resolveFeedback(feedbackId, resolution);
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
