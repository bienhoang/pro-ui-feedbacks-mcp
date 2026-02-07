import { z } from 'zod';

export const BoundingBoxSchema = z.object({
  x: z.number(), y: z.number(), width: z.number(), height: z.number(),
});

export const AccessibilitySchema = z.object({
  role: z.string().optional(),
  label: z.string().optional(),
});

export const ViewportSchema = z.object({
  width: z.number(), height: z.number(),
});

export const AreaDataSchema = z.object({
  centerX: z.number(),
  centerY: z.number(),
  width: z.number(),
  height: z.number(),
  elementCount: z.number(),
});
