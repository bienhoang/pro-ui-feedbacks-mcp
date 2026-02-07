import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../store/store.js';
import { toolSuccess, toolError } from './tool-helpers.js';

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
      if (!result) return toolError(`Feedback not found or not in pending state: ${feedbackId}`);
      return toolSuccess(result);
    }
  );
}
