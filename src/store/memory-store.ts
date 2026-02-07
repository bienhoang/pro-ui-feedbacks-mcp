import { randomUUID } from 'node:crypto';
import type { Store } from './store.js';
import type {
  Feedback,
  Session,
  SessionWithFeedbacks,
  CreateFeedbackInput,
  UpdateFeedbackInput,
} from '../types/index.js';

/**
 * In-memory store implementation.
 * Data is lost on process restart — acceptable for MVP.
 */
export class MemoryStore implements Store {
  private sessions = new Map<string, Session>();
  private feedbacks = new Map<string, Feedback>();
  private externalIdMap = new Map<string, string>(); // externalId → feedbackId

  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  getSession(sessionId: string): SessionWithFeedbacks | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const feedbacks = Array.from(this.feedbacks.values()).filter(
      (f) => f.sessionId === sessionId
    );
    return { ...session, feedbacks };
  }

  createFeedback(input: CreateFeedbackInput): Feedback {
    // Auto-create or reuse session based on pageUrl
    const sessionId = input.sessionId ?? this.findOrCreateSession(input.pageUrl);

    const feedback: Feedback = {
      id: randomUUID(),
      sessionId,
      comment: input.comment,
      element: input.element,
      elementPath: input.elementPath,
      screenshotUrl: input.screenshotUrl,
      pageUrl: input.pageUrl,
      intent: input.intent ?? 'fix',
      severity: input.severity ?? 'suggestion',
      status: 'pending',
      externalId: input.externalId,
      createdAt: new Date().toISOString(),
    };

    this.feedbacks.set(feedback.id, feedback);
    if (input.externalId) {
      this.externalIdMap.set(input.externalId, feedback.id);
    }
    return feedback;
  }

  updateFeedback(feedbackId: string, fields: UpdateFeedbackInput): Feedback | null {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) return null;
    if (fields.comment !== undefined) feedback.comment = fields.comment;
    return { ...feedback };
  }

  deleteFeedback(feedbackId: string): Feedback | null {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) return null;
    if (feedback.status === 'resolved' || feedback.status === 'dismissed') return null;
    feedback.status = 'dismissed';
    feedback.resolution = 'Deleted via widget';
    feedback.resolvedAt = new Date().toISOString();
    return { ...feedback };
  }

  /** Find MCP feedback ID by widget's external ID (MemoryStore-only). */
  findByExternalId(externalId: string): string | undefined {
    return this.externalIdMap.get(externalId);
  }

  getPendingFeedback(sessionId?: string): Feedback[] {
    const all = Array.from(this.feedbacks.values());
    return all.filter((f) => {
      const isPending = f.status === 'pending' || f.status === 'acknowledged';
      if (sessionId) return isPending && f.sessionId === sessionId;
      return isPending;
    });
  }

  acknowledgeFeedback(feedbackId: string): Feedback | null {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback || feedback.status !== 'pending') return null;

    feedback.status = 'acknowledged';
    return { ...feedback };
  }

  resolveFeedback(feedbackId: string, resolution: string): Feedback | null {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) return null;
    if (feedback.status === 'resolved' || feedback.status === 'dismissed') return null;

    feedback.status = 'resolved';
    feedback.resolution = resolution;
    feedback.resolvedAt = new Date().toISOString();
    return { ...feedback };
  }

  dismissFeedback(feedbackId: string, reason: string): Feedback | null {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) return null;
    if (feedback.status === 'resolved' || feedback.status === 'dismissed') return null;

    feedback.status = 'dismissed';
    feedback.resolution = reason;
    feedback.resolvedAt = new Date().toISOString();
    return { ...feedback };
  }

  /**
   * Find existing session by pageUrl or create a new one.
   */
  private findOrCreateSession(pageUrl: string): string {
    const normalized = this.normalizeUrl(pageUrl);
    for (const session of this.sessions.values()) {
      if (this.normalizeUrl(session.pageUrl) === normalized) return session.id;
    }

    const session: Session = {
      id: randomUUID(),
      pageUrl: normalized,
      title: new URL(pageUrl).pathname || pageUrl,
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    return session.id;
  }

  /** Strip query params and hash for consistent session matching. */
  private normalizeUrl(url: string): string {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  }
}
