import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from '../src/store/memory-store.js';
import { toolSuccess, toolError } from '../src/tools/tool-helpers.js';

/**
 * Integration tests for MCP tool logic.
 * Tests the store operations + response formatting that each tool performs.
 * Tools are thin wrappers: store.method() → toolSuccess/toolError response.
 */
describe('MCP Tool Integration', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  describe('list_sessions tool logic', () => {
    it('should return empty array when no sessions', () => {
      const result = toolSuccess(store.listSessions());
      expect(result.content[0].text).toBe('[]');
    });

    it('should return sessions after feedback created', () => {
      store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });
      const result = toolSuccess(store.listSessions());
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].pageUrl).toBe('https://example.com/page');
    });
  });

  describe('get_pending_feedback tool logic', () => {
    it('should return empty when no feedback', () => {
      const result = toolSuccess(store.getPendingFeedback());
      expect(result.content[0].text).toBe('[]');
    });

    it('should return pending feedbacks', () => {
      store.createFeedback({
        comment: 'Fix button',
        pageUrl: 'https://example.com/page',
      });
      const result = toolSuccess(store.getPendingFeedback());
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].comment).toBe('Fix button');
      expect(parsed[0].status).toBe('pending');
    });

    it('should filter by sessionId', () => {
      const f1 = store.createFeedback({
        comment: 'a',
        pageUrl: 'https://example.com/p1',
      });
      store.createFeedback({
        comment: 'b',
        pageUrl: 'https://example.com/p2',
      });

      const result = toolSuccess(store.getPendingFeedback(f1.sessionId));
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].comment).toBe('a');
    });
  });

  describe('acknowledge_feedback tool logic', () => {
    it('should acknowledge pending feedback', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });
      const acked = store.acknowledgeFeedback(feedback.id);
      const result = toolSuccess(acked);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('acknowledged');
    });

    it('should return error for invalid id', () => {
      const acked = store.acknowledgeFeedback('nonexistent');
      expect(acked).toBeNull();
      const result = toolError('Feedback not found or not in pending state: nonexistent');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('nonexistent');
    });

    it('should return null for non-pending feedback', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });
      store.acknowledgeFeedback(feedback.id);
      // Try again — no longer pending
      const result = store.acknowledgeFeedback(feedback.id);
      expect(result).toBeNull();
    });
  });

  describe('resolve_feedback tool logic', () => {
    it('should resolve feedback with summary', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });
      const resolved = store.resolveFeedback(feedback.id, 'Fixed the issue');
      const result = toolSuccess(resolved);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('resolved');
      expect(parsed.resolution).toBe('Fixed the issue');
      expect(parsed.resolvedAt).toBeDefined();
    });

    it('should return null for nonexistent feedback', () => {
      const result = store.resolveFeedback('nonexistent', 'done');
      expect(result).toBeNull();
    });

    it('should return null for already resolved feedback', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });
      store.resolveFeedback(feedback.id, 'First');
      const result = store.resolveFeedback(feedback.id, 'Second');
      expect(result).toBeNull();
    });
  });

  describe('dismiss_feedback tool logic', () => {
    it('should dismiss feedback with reason', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });
      const dismissed = store.dismissFeedback(feedback.id, 'Not applicable');
      const result = toolSuccess(dismissed);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('dismissed');
      expect(parsed.resolution).toBe('Not applicable');
    });

    it('should return null for nonexistent feedback', () => {
      const result = store.dismissFeedback('nonexistent', 'no');
      expect(result).toBeNull();
    });

    it('should return null for already dismissed feedback', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });
      store.dismissFeedback(feedback.id, 'First');
      const result = store.dismissFeedback(feedback.id, 'Second');
      expect(result).toBeNull();
    });
  });
});
