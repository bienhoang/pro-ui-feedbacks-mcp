import { z } from 'zod';
import { BoundingBoxSchema, AccessibilitySchema, ViewportSchema, AreaDataSchema } from './shared-schemas.js';

// Re-export for backward compat
export { AreaDataSchema } from './shared-schemas.js';

// --- Element data from widget ---

export const SyncElementDataSchema = z.object({
  selector: z.string(),
  tagName: z.string(),
  className: z.string(),
  elementId: z.string(),
  elementPath: z.string().optional(),
  fullPath: z.string().optional(),
  elementDescription: z.string().optional(),
  boundingBox: BoundingBoxSchema.optional(),
  accessibility: AccessibilitySchema.optional(),
});

// --- Feedback data within sync payload ---

export const SyncFeedbackDataSchema = z.object({
  id: z.string(),
  stepNumber: z.number(),
  content: z.string().min(1).max(10000),
  selector: z.string(),
  pageX: z.number(),
  pageY: z.number(),
  createdAt: z.number(),
  element: SyncElementDataSchema.optional(),
  areaData: AreaDataSchema.optional(),
  isAreaOnly: z.boolean().optional(),
  elements: z.array(SyncElementDataSchema).optional(),
});

// --- Top-level sync payload from widget ---

export const SyncPayloadSchema = z.object({
  event: z.enum(['feedback.created', 'feedback.updated', 'feedback.deleted', 'feedback.batch']),
  timestamp: z.number(),
  page: z.object({
    url: z.string().url(),
    pathname: z.string(),
    viewport: ViewportSchema,
  }),
  feedback: SyncFeedbackDataSchema.optional(),
  feedbacks: z.array(SyncFeedbackDataSchema).optional(),
  feedbackId: z.string().optional(),
  updatedContent: z.string().optional(),
});

export type SyncPayload = z.infer<typeof SyncPayloadSchema>;
export type SyncFeedbackData = z.infer<typeof SyncFeedbackDataSchema>;
