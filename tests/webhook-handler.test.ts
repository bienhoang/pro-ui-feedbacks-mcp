import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from '../src/store/memory-store.js';
import { handleWebhook } from '../src/server/webhook-handler.js';
import { MAX_BATCH_SIZE } from '../src/constants.js';
import {
  createdPayload,
  updatedPayload,
  deletedPayload,
  batchPayload,
  areaPayload,
  VALID_PAGE,
  VALID_FEEDBACK,
} from './fixtures/sync-payloads.js';

describe('handleWebhook', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  describe('feedback.created', () => {
    it('should create feedback from widget payload', () => {
      const result = handleWebhook(store, createdPayload);
      expect(result.ok).toBe(true);
      expect(result.created).toBe(1);

      const pending = store.getPendingFeedback();
      expect(pending).toHaveLength(1);
    });

    it('should map content to comment', () => {
      handleWebhook(store, createdPayload);
      const pending = store.getPendingFeedback();
      expect(pending[0].comment).toBe('Change button color to green');
    });

    it('should map selector to element', () => {
      handleWebhook(store, createdPayload);
      const pending = store.getPendingFeedback();
      expect(pending[0].element).toBe('.checkout-form > button.btn-primary');
    });

    it('should store externalId for correlation', () => {
      handleWebhook(store, createdPayload);
      const pending = store.getPendingFeedback();
      expect(pending[0].externalId).toBe('fb-001');
      expect(store.findByExternalId('fb-001')).toBe(pending[0].id);
    });

    it('should preserve metadata from widget', () => {
      handleWebhook(store, createdPayload);
      const pending = store.getPendingFeedback();
      expect(pending[0].metadata).toBeDefined();
      expect(pending[0].metadata?.boundingBox).toEqual({ x: 892, y: 1247, width: 120, height: 40 });
      expect(pending[0].metadata?.accessibility).toEqual({ role: 'button', label: 'Submit Order' });
      expect(pending[0].metadata?.stepNumber).toBe(1);
      expect(pending[0].metadata?.pageCoords).toEqual({ x: 952, y: 1267 });
      expect(pending[0].metadata?.viewport).toEqual({ width: 1440, height: 900 });
    });

    it('should handle missing feedback gracefully', () => {
      const result = handleWebhook(store, {
        event: 'feedback.created',
        timestamp: Date.now(),
        page: VALID_PAGE,
      });
      expect(result).toEqual({ ok: true, created: 0 });
    });
  });

  describe('feedback.updated', () => {
    it('should update comment via externalId lookup', () => {
      handleWebhook(store, createdPayload);
      const result = handleWebhook(store, updatedPayload);
      expect(result).toEqual({ ok: true, updated: true });

      const pending = store.getPendingFeedback();
      expect(pending[0].comment).toBe('Change to green for better UX');
    });

    it('should return updated: false if externalId not found', () => {
      const result = handleWebhook(store, {
        ...updatedPayload,
        feedbackId: 'nonexistent',
      });
      expect(result).toEqual({ ok: true, updated: false });
    });

    it('should return updated: false if feedbackId missing', () => {
      const result = handleWebhook(store, {
        event: 'feedback.updated',
        timestamp: Date.now(),
        page: VALID_PAGE,
      });
      expect(result).toEqual({ ok: true, updated: false });
    });
  });

  describe('feedback.deleted', () => {
    it('should soft-delete (dismiss) feedback via externalId', () => {
      handleWebhook(store, createdPayload);
      const result = handleWebhook(store, deletedPayload);
      expect(result).toEqual({ ok: true, deleted: true });
    });

    it('should return deleted: false if externalId not found', () => {
      const result = handleWebhook(store, {
        ...deletedPayload,
        feedbackId: 'nonexistent',
      });
      expect(result).toEqual({ ok: true, deleted: false });
    });

    it('dismissed feedback should not appear in getPendingFeedback', () => {
      handleWebhook(store, createdPayload);
      handleWebhook(store, deletedPayload);
      expect(store.getPendingFeedback()).toHaveLength(0);
    });
  });

  describe('feedback.batch', () => {
    it('should create multiple feedbacks', () => {
      const result = handleWebhook(store, batchPayload);
      expect(result).toEqual({ ok: true, created: 3 });
      expect(store.getPendingFeedback()).toHaveLength(3);
    });

    it('should handle empty feedbacks array', () => {
      const result = handleWebhook(store, {
        event: 'feedback.batch',
        timestamp: Date.now(),
        page: VALID_PAGE,
      });
      expect(result).toEqual({ ok: true, created: 0 });
    });

    it('should reject batch exceeding MAX_BATCH_SIZE', () => {
      const oversized = Array.from({ length: MAX_BATCH_SIZE + 1 }, (_, i) => ({
        ...VALID_FEEDBACK,
        id: `fb-${i}`,
        content: `Feedback ${i}`,
      }));
      const result = handleWebhook(store, {
        event: 'feedback.batch',
        timestamp: Date.now(),
        page: VALID_PAGE,
        feedbacks: oversized,
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('exceeds limit');
      expect(store.getPendingFeedback()).toHaveLength(0);
    });
  });

  describe('area selection', () => {
    it('should preserve areaData in metadata', () => {
      handleWebhook(store, areaPayload);
      const pending = store.getPendingFeedback();
      expect(pending[0].metadata?.areaData).toEqual({
        centerX: 500, centerY: 300, width: 200, height: 100, elementCount: 3,
      });
    });

    it('should preserve elements array in metadata', () => {
      handleWebhook(store, areaPayload);
      const pending = store.getPendingFeedback();
      expect(pending[0].metadata?.elements).toHaveLength(3);
      expect(pending[0].metadata?.elements?.[0].selector).toBe('.btn-1');
    });
  });
});
