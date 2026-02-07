import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Store } from '../store/store.js';
import { CreateFeedbackSchema } from '../types/index.js';
import { SyncPayloadSchema } from '../types/sync-payload.js';
import { handleWebhook } from './webhook-handler.js';
import { MAX_BODY_SIZE, HTTP_HOST } from '../constants.js';

export interface HttpServerOptions {
  port: number;
  store: Store;
  allowedOrigins?: string[];
}

/**
 * Create HTTP API server for receiving feedback from external sources.
 * Binds to 127.0.0.1 only (no external access).
 */
export function createHttpServer({ port, store, allowedOrigins }: HttpServerOptions) {
  const origins = allowedOrigins ?? ['http://localhost:*', 'http://127.0.0.1:*'];

  const server = createServer(async (req, res) => {
    // CORS headers — restrict to localhost origins by default
    const requestOrigin = req.headers.origin ?? '';
    const isAllowed = origins.some((pattern) => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(requestOrigin);
      }
      return pattern === requestOrigin;
    });
    res.setHeader(
      'Access-Control-Allow-Origin',
      isAllowed ? requestOrigin : origins[0].replace('*', String(port))
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const pathname = url.pathname;

    try {
      // GET /api/health
      if (req.method === 'GET' && pathname === '/api/health') {
        json(res, 200, { status: 'ok' });
        return;
      }

      // GET /api/sessions
      if (req.method === 'GET' && pathname === '/api/sessions') {
        json(res, 200, store.listSessions());
        return;
      }

      // GET /api/sessions/:id
      const sessionMatch = pathname.match(/^\/api\/sessions\/(.+)$/);
      if (req.method === 'GET' && sessionMatch) {
        const session = store.getSession(sessionMatch[1]);
        if (!session) {
          json(res, 404, { error: 'Session not found' });
          return;
        }
        json(res, 200, session);
        return;
      }

      // POST /api/feedback
      if (req.method === 'POST' && pathname === '/api/feedback') {
        const body = await parseBody(req);
        const parsed = CreateFeedbackSchema.safeParse(body);
        if (!parsed.success) {
          json(res, 400, {
            error: 'Validation failed',
            details: parsed.error.issues,
          });
          return;
        }
        const feedback = store.createFeedback(parsed.data);
        json(res, 201, feedback);
        return;
      }

      // POST /api/webhook (widget sync)
      if (req.method === 'POST' && pathname === '/api/webhook') {
        const body = await parseBody(req);
        const parsed = SyncPayloadSchema.safeParse(body);
        if (!parsed.success) {
          json(res, 400, { error: 'Validation failed', details: parsed.error.issues });
          return;
        }
        const result = handleWebhook(store, parsed.data);
        json(res, result.ok ? 200 : 400, result);
        return;
      }

      // 404 fallback
      json(res, 404, { error: 'Not found' });
    } catch (err) {
      console.error('[HTTP] Error:', err);
      json(res, 500, { error: 'Internal server error' });
    }
  });

  return {
    start: () =>
      new Promise<void>((resolve) => {
        server.listen(port, HTTP_HOST, () => {
          console.error(`[HTTP] Server listening on http://${HTTP_HOST}:${port}`);
          resolve();
        });
      }),
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

// --- Helpers ---

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', reject);
  });
}
