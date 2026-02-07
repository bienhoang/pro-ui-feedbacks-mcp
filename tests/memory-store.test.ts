import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from '../src/store/memory-store.js';

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  describe('createFeedback', () => {
    it('should create feedback and auto-create session', () => {
      const feedback = store.createFeedback({
        comment: 'Fix the button color',
        pageUrl: 'https://example.com/page',
        intent: 'fix',
        severity: 'suggestion',
      });

      expect(feedback.id).toBeDefined();
      expect(feedback.sessionId).toBeDefined();
      expect(feedback.comment).toBe('Fix the button color');
      expect(feedback.status).toBe('pending');
      expect(feedback.pageUrl).toBe('https://example.com/page');
    });

    it('should reuse session for same pageUrl', () => {
      const f1 = store.createFeedback({
        comment: 'First',
        pageUrl: 'https://example.com/page',
      });
      const f2 = store.createFeedback({
        comment: 'Second',
        pageUrl: 'https://example.com/page',
      });

      expect(f1.sessionId).toBe(f2.sessionId);
    });

    it('should create separate sessions for different pageUrls', () => {
      const f1 = store.createFeedback({
        comment: 'First',
        pageUrl: 'https://example.com/page1',
      });
      const f2 = store.createFeedback({
        comment: 'Second',
        pageUrl: 'https://example.com/page2',
      });

      expect(f1.sessionId).not.toBe(f2.sessionId);
    });

    it('should use provided sessionId', () => {
      // Create first feedback to auto-create session
      const f1 = store.createFeedback({
        comment: 'First',
        pageUrl: 'https://example.com/page',
      });

      const f2 = store.createFeedback({
        comment: 'Second',
        pageUrl: 'https://example.com/other',
        sessionId: f1.sessionId,
      });

      expect(f2.sessionId).toBe(f1.sessionId);
    });
  });

  describe('listSessions', () => {
    it('should return empty array initially', () => {
      expect(store.listSessions()).toEqual([]);
    });

    it('should return all sessions', () => {
      store.createFeedback({
        comment: 'a',
        pageUrl: 'https://example.com/p1',
      });
      store.createFeedback({
        comment: 'b',
        pageUrl: 'https://example.com/p2',
      });

      const sessions = store.listSessions();
      expect(sessions).toHaveLength(2);
    });
  });

  describe('getSession', () => {
    it('should return null for unknown sessionId', () => {
      expect(store.getSession('nonexistent')).toBeNull();
    });

    it('should return session with its feedbacks', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });

      const session = store.getSession(feedback.sessionId);
      expect(session).not.toBeNull();
      expect(session!.feedbacks).toHaveLength(1);
      expect(session!.feedbacks[0].comment).toBe('Test');
    });
  });

  describe('getPendingFeedback', () => {
    it('should return only pending/acknowledged feedbacks', () => {
      const f1 = store.createFeedback({
        comment: 'pending one',
        pageUrl: 'https://example.com/page',
      });
      store.createFeedback({
        comment: 'pending two',
        pageUrl: 'https://example.com/page',
      });

      // Resolve one
      store.resolveFeedback(f1.id, 'Fixed it');

      const pending = store.getPendingFeedback();
      expect(pending).toHaveLength(1);
      expect(pending[0].comment).toBe('pending two');
    });

    it('should filter by sessionId', () => {
      store.createFeedback({
        comment: 'a',
        pageUrl: 'https://example.com/p1',
      });
      const f2 = store.createFeedback({
        comment: 'b',
        pageUrl: 'https://example.com/p2',
      });

      const pending = store.getPendingFeedback(f2.sessionId);
      expect(pending).toHaveLength(1);
      expect(pending[0].comment).toBe('b');
    });
  });

  describe('acknowledgeFeedback', () => {
    it('should transition pending → acknowledged', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });

      const result = store.acknowledgeFeedback(feedback.id);
      expect(result).not.toBeNull();
      expect(result!.status).toBe('acknowledged');
    });

    it('should return null for non-pending feedback', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });
      store.acknowledgeFeedback(feedback.id); // pending → acknowledged

      // Try again — should fail (not pending)
      const result = store.acknowledgeFeedback(feedback.id);
      expect(result).toBeNull();
    });

    it('should return null for unknown id', () => {
      expect(store.acknowledgeFeedback('nonexistent')).toBeNull();
    });
  });

  describe('resolveFeedback', () => {
    it('should resolve pending feedback', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });

      const result = store.resolveFeedback(feedback.id, 'Fixed the issue');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('resolved');
      expect(result!.resolution).toBe('Fixed the issue');
      expect(result!.resolvedAt).toBeDefined();
    });

    it('should resolve acknowledged feedback', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });
      store.acknowledgeFeedback(feedback.id);

      const result = store.resolveFeedback(feedback.id, 'Done');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('resolved');
    });

    it('should return null for already resolved feedback', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });
      store.resolveFeedback(feedback.id, 'Fixed');

      const result = store.resolveFeedback(feedback.id, 'Again');
      expect(result).toBeNull();
    });
  });

  describe('dismissFeedback', () => {
    it('should dismiss pending feedback with reason', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });

      const result = store.dismissFeedback(feedback.id, 'Not applicable');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('dismissed');
      expect(result!.resolution).toBe('Not applicable');
    });

    it('should return null for already dismissed feedback', () => {
      const feedback = store.createFeedback({
        comment: 'Test',
        pageUrl: 'https://example.com/page',
      });
      store.dismissFeedback(feedback.id, 'No');

      const result = store.dismissFeedback(feedback.id, 'Again');
      expect(result).toBeNull();
    });
  });
});
