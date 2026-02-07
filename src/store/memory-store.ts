import { randomUUID } from 'node:crypto';
import type { Store } from './store.js';
import type {
  Feedback,
  Session,
  SessionWithFeedbacks,
  CreateFeedbackInput,
} from '../types/index.js';

/**
 * In-memory store implementation.
 * Data is lost on process restart — acceptable for MVP.
 */
export class MemoryStore implements Store {
  private sessions = new Map<string, Session>();
  private feedbacks = new Map<string, Feedback>();

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
      createdAt: new Date().toISOString(),
    };

    this.feedbacks.set(feedback.id, feedback);
    return feedback;
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
    for (const session of this.sessions.values()) {
      if (session.pageUrl === pageUrl) return session.id;
    }

    const session: Session = {
      id: randomUUID(),
      pageUrl,
      title: new URL(pageUrl).pathname || pageUrl,
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    return session.id;
  }
}
