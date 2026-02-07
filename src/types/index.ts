import { z } from 'zod';
import { BoundingBoxSchema, AccessibilitySchema, ViewportSchema, AreaDataSchema } from './shared-schemas.js';

// Re-export shared schemas for backward compat
export { BoundingBoxSchema, AccessibilitySchema, ViewportSchema, AreaDataSchema } from './shared-schemas.js';

// --- Enums ---

export const FeedbackIntent = z.enum(['fix', 'change', 'question', 'approve']);
export type FeedbackIntent = z.infer<typeof FeedbackIntent>;

export const FeedbackSeverity = z.enum(['blocking', 'important', 'suggestion']);
export type FeedbackSeverity = z.infer<typeof FeedbackSeverity>;

export const FeedbackStatus = z.enum(['pending', 'acknowledged', 'resolved', 'dismissed']);
export type FeedbackStatus = z.infer<typeof FeedbackStatus>;

// --- Element metadata for rich widget data ---

export const ElementSummarySchema = z.object({
  selector: z.string(),
  tagName: z.string(),
  elementPath: z.string().optional(),
  elementDescription: z.string().optional(),
  boundingBox: BoundingBoxSchema.optional(),
});
export type ElementSummary = z.infer<typeof ElementSummarySchema>;

export const FeedbackMetadataSchema = z.object({
  boundingBox: BoundingBoxSchema.optional(),
  accessibility: AccessibilitySchema.optional(),
  elementDescription: z.string().optional(),
  fullPath: z.string().optional(),
  stepNumber: z.number().optional(),
  pageCoords: z.object({ x: z.number(), y: z.number() }).optional(),
  areaData: AreaDataSchema.optional(),
  isAreaOnly: z.boolean().optional(),
  elements: z.array(ElementSummarySchema).optional(),
  viewport: ViewportSchema.optional(),
}).optional();

export type FeedbackMetadata = z.infer<typeof FeedbackMetadataSchema>;

// --- Feedback ---

export const FeedbackSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  comment: z.string(),
  element: z.string().optional(),
  elementPath: z.string().optional(),
  screenshotUrl: z.string().url().optional(),
  pageUrl: z.string().url(),
  intent: FeedbackIntent,
  severity: FeedbackSeverity,
  status: FeedbackStatus,
  externalId: z.string().optional(),
  metadata: FeedbackMetadataSchema,
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
  resolution: z.string().optional(),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

// Input schema for creating feedback via HTTP API
export const CreateFeedbackSchema = z.object({
  comment: z.string().min(1).max(10000),
  pageUrl: z.string().url(),
  element: z.string().optional(),
  elementPath: z.string().optional(),
  screenshotUrl: z.string().url().optional(),
  intent: FeedbackIntent.default('fix'),
  severity: FeedbackSeverity.default('suggestion'),
  sessionId: z.string().optional(),
  externalId: z.string().optional(),
  metadata: FeedbackMetadataSchema,
});
export type CreateFeedbackInput = z.infer<typeof CreateFeedbackSchema>;

// Input schema for partial feedback update
export const UpdateFeedbackSchema = z.object({
  comment: z.string().min(1).max(10000).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});
export type UpdateFeedbackInput = z.infer<typeof UpdateFeedbackSchema>;

// --- Session ---

export const SessionSchema = z.object({
  id: z.string(),
  pageUrl: z.string().url(),
  title: z.string(),
  createdAt: z.string().datetime(),
});
export type Session = z.infer<typeof SessionSchema>;

export interface SessionWithFeedbacks extends Session {
  feedbacks: Feedback[];
}
