import type {
  Feedback,
  Session,
  SessionWithFeedbacks,
  CreateFeedbackInput,
  UpdateFeedbackInput,
} from '../types/index.js';

/**
 * Abstract store interface for feedback data.
 * Implementations: MemoryStore (MVP), future SQLite store.
 */
export interface Store {
  // Sessions
  listSessions(): Session[];
  getSession(sessionId: string): SessionWithFeedbacks | null;

  // Feedback CRUD
  createFeedback(input: CreateFeedbackInput): Feedback;
  updateFeedback(feedbackId: string, fields: UpdateFeedbackInput): Feedback | null;
  deleteFeedback(feedbackId: string): Feedback | null;
  getPendingFeedback(sessionId?: string): Feedback[];
  acknowledgeFeedback(feedbackId: string): Feedback | null;
  resolveFeedback(feedbackId: string, resolution: string): Feedback | null;
  dismissFeedback(feedbackId: string, reason: string): Feedback | null;

  // External ID correlation (widget feedback ID → MCP feedback ID)
  findByExternalId(externalId: string): string | undefined;
}
