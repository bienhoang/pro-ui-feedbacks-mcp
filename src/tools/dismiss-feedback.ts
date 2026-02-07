import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../store/store.js';
import { toolSuccess, toolError } from './tool-helpers.js';

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
      if (!result) return toolError(`Feedback not found or already resolved/dismissed: ${feedbackId}`);
      return toolSuccess(result);
    }
  );
}
