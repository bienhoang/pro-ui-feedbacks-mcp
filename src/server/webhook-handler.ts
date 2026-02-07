import type { Store } from '../store/store.js';
import type { SyncPayload, SyncFeedbackData } from '../types/sync-payload.js';
import type { CreateFeedbackInput } from '../types/index.js';

export interface WebhookResult {
  ok: true;
  created?: number;
  updated?: boolean;
  deleted?: boolean;
}

/** Transform widget feedback data into MCP CreateFeedbackInput with rich metadata. */
function transformFeedback(
  fb: SyncFeedbackData,
  pageUrl: string,
  viewport?: { width: number; height: number },
): CreateFeedbackInput {
  return {
    comment: fb.content,
    pageUrl,
    element: fb.selector,
    elementPath: fb.element?.elementPath,
    externalId: fb.id,
    intent: 'fix',
    severity: 'suggestion',
    metadata: {
      boundingBox: fb.element?.boundingBox,
      accessibility: fb.element?.accessibility,
      elementDescription: fb.element?.elementDescription,
      fullPath: fb.element?.fullPath,
      stepNumber: fb.stepNumber,
      pageCoords: { x: fb.pageX, y: fb.pageY },
      areaData: fb.areaData,
      isAreaOnly: fb.isAreaOnly,
      elements: fb.elements?.map((el) => ({
        selector: el.selector,
        tagName: el.tagName,
        elementPath: el.elementPath,
        elementDescription: el.elementDescription,
        boundingBox: el.boundingBox,
      })),
      viewport,
    },
  };
}

/** Dispatch SyncPayload to store operations based on event type. */
export function handleWebhook(store: Store, payload: SyncPayload): WebhookResult {
  switch (payload.event) {
    case 'feedback.created': {
      if (!payload.feedback) return { ok: true, created: 0 };
      store.createFeedback(transformFeedback(payload.feedback, payload.page.url, payload.page.viewport));
      return { ok: true, created: 1 };
    }
    case 'feedback.updated': {
      if (!payload.feedbackId || !payload.updatedContent) return { ok: true, updated: false };
      const mcpId = store.findByExternalId(payload.feedbackId);
      if (!mcpId) return { ok: true, updated: false };
      store.updateFeedback(mcpId, { comment: payload.updatedContent });
      return { ok: true, updated: true };
    }
    case 'feedback.deleted': {
      if (!payload.feedbackId) return { ok: true, deleted: false };
      const mcpId = store.findByExternalId(payload.feedbackId);
      if (!mcpId) return { ok: true, deleted: false };
      store.deleteFeedback(mcpId);
      return { ok: true, deleted: true };
    }
    case 'feedback.batch': {
      const items = payload.feedbacks ?? [];
      for (const fb of items) {
        store.createFeedback(transformFeedback(fb, payload.page.url, payload.page.viewport));
      }
      return { ok: true, created: items.length };
    }
  }
}
