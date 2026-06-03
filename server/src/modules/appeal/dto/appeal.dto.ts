import { z } from 'zod';

export const submitAppealSchema = z.object({
  videoUrl: z.string().url({ message: 'A valid YouTube or Medal video URL is required' }),
  statement: z.string().min(50, 'Statement must be at least 50 characters').max(5000),
});

export const reviewAppealSchema = z.object({
  status: z.enum(['APPROVED', 'DENIED', 'UNDER_REVIEW']),
  notes: z.string().max(2000).optional(),
});

export type SubmitAppealInput = z.infer<typeof submitAppealSchema>;
