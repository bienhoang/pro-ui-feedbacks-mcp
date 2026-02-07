import { z } from 'zod';

// --- Element data from widget ---

export const SyncElementDataSchema = z.object({
  selector: z.string(),
  tagName: z.string(),
  className: z.string(),
  elementId: z.string(),
  elementPath: z.string().optional(),
  fullPath: z.string().optional(),
  elementDescription: z.string().optional(),
  boundingBox: z.object({
    x: z.number(), y: z.number(), width: z.number(), height: z.number(),
  }).optional(),
  accessibility: z.object({
    role: z.string().optional(),
    label: z.string().optional(),
  }).optional(),
});

export const AreaDataSchema = z.object({
  centerX: z.number(),
  centerY: z.number(),
  width: z.number(),
  height: z.number(),
  elementCount: z.number(),
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
    viewport: z.object({ width: z.number(), height: z.number() }),
  }),
  feedback: SyncFeedbackDataSchema.optional(),
  feedbacks: z.array(SyncFeedbackDataSchema).optional(),
  feedbackId: z.string().optional(),
  updatedContent: z.string().optional(),
});

export type SyncPayload = z.infer<typeof SyncPayloadSchema>;
export type SyncFeedbackData = z.infer<typeof SyncFeedbackDataSchema>;
