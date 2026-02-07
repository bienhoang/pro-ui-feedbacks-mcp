import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHttpServer } from '../src/server/http-server.js';
import { MemoryStore } from '../src/store/memory-store.js';

describe('HTTP Server', () => {
  const store = new MemoryStore();
  const port = 14747; // Use non-standard port for tests
  const httpServer = createHttpServer({ port, store });
  const baseUrl = `http://127.0.0.1:${port}`;

  beforeAll(async () => {
    await httpServer.start();
  });

  afterAll(async () => {
    await httpServer.close();
  });

  describe('GET /api/health', () => {
    it('should return 200 with ok status', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/feedback', () => {
    it('should create feedback with valid body', async () => {
      const res = await fetch(`${baseUrl}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: 'Fix the button',
          pageUrl: 'https://example.com/page',
          intent: 'fix',
          severity: 'important',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.comment).toBe('Fix the button');
      expect(body.status).toBe('pending');
    });

    it('should return 400 for invalid body', async () => {
      const res = await fetch(`${baseUrl}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: '' }), // missing pageUrl, empty comment
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/sessions', () => {
    it('should return sessions array', async () => {
      const res = await fetch(`${baseUrl}/api/sessions`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      // Should have at least 1 session from feedback creation above
      expect(body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should return 404 for unknown session', async () => {
      const res = await fetch(`${baseUrl}/api/sessions/nonexistent`);
      expect(res.status).toBe(404);
    });

    it('should return session with feedbacks', async () => {
      const sessions = await (
        await fetch(`${baseUrl}/api/sessions`)
      ).json();
      const sessionId = sessions[0].id;

      const res = await fetch(`${baseUrl}/api/sessions/${sessionId}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(sessionId);
      expect(Array.isArray(body.feedbacks)).toBe(true);
    });
  });

  describe('Unknown routes', () => {
    it('should return 404', async () => {
      const res = await fetch(`${baseUrl}/api/unknown`);
      expect(res.status).toBe(404);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      const origin = res.headers.get('access-control-allow-origin');
      expect(origin).toBeDefined();
      // Default allows localhost origins
      expect(origin).toContain('localhost');
    });

    it('should handle OPTIONS preflight', async () => {
      const res = await fetch(`${baseUrl}/api/health`, { method: 'OPTIONS' });
      expect(res.status).toBe(204);
    });
  });

  describe('POST /api/webhook', () => {
    it('should accept valid created payload and return 200', async () => {
      const res = await fetch(`${baseUrl}/api/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'feedback.created',
          timestamp: Date.now(),
          page: { url: 'https://example.com/test', pathname: '/test', viewport: { width: 1440, height: 900 } },
          feedback: {
            id: 'http-fb-001',
            stepNumber: 1,
            content: 'Webhook test feedback',
            selector: '.test-btn',
            pageX: 100,
            pageY: 200,
            createdAt: Date.now(),
          },
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.created).toBe(1);
    });

    it('should reject invalid payload with 400', async () => {
      const res = await fetch(`${baseUrl}/api/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: true }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeDefined();
    });

    it('should handle batch payload', async () => {
      const res = await fetch(`${baseUrl}/api/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'feedback.batch',
          timestamp: Date.now(),
          page: { url: 'https://example.com/batch', pathname: '/batch', viewport: { width: 1440, height: 900 } },
          feedbacks: [
            { id: 'batch-1', stepNumber: 1, content: 'First', selector: '.a', pageX: 0, pageY: 0, createdAt: Date.now() },
            { id: 'batch-2', stepNumber: 2, content: 'Second', selector: '.b', pageX: 0, pageY: 0, createdAt: Date.now() },
          ],
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.created).toBe(2);
    });
  });

  describe('end-to-end: webhook → store → API query', () => {
    it('webhook-created feedback visible via sessions endpoint', async () => {
      // Create via webhook
      await fetch(`${baseUrl}/api/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'feedback.created',
          timestamp: Date.now(),
          page: { url: 'https://example.com/e2e-test', pathname: '/e2e-test', viewport: { width: 1440, height: 900 } },
          feedback: {
            id: 'e2e-fb-001',
            stepNumber: 1,
            content: 'E2E test feedback',
            selector: '.e2e',
            pageX: 50,
            pageY: 100,
            createdAt: Date.now(),
          },
        }),
      });

      // Query sessions to find the feedback
      const sessionsRes = await fetch(`${baseUrl}/api/sessions`);
      const sessions = await sessionsRes.json();
      const session = sessions.find((s: { pageUrl: string }) =>
        s.pageUrl.includes('e2e-test')
      );
      expect(session).toBeDefined();

      // Get session details with feedbacks
      const detailRes = await fetch(`${baseUrl}/api/sessions/${session.id}`);
      const detail = await detailRes.json();
      expect(detail.feedbacks.length).toBeGreaterThan(0);
      const fb = detail.feedbacks.find((f: { externalId: string }) => f.externalId === 'e2e-fb-001');
      expect(fb).toBeDefined();
      expect(fb.comment).toBe('E2E test feedback');
    });
  });
});
