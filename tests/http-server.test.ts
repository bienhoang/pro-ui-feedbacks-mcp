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
});
