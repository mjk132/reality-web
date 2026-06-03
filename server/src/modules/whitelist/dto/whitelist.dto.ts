import { z } from 'zod';

export const createQuestionSchema = z.object({
  question: z.string().min(10, 'Question must be at least 10 characters').max(500),
  options: z.array(z.string().min(1)).min(2, 'At least 2 options required').max(6),
  correctIndex: z.number().int().min(0),
});

export const updateQuestionSchema = createQuestionSchema.partial().extend({
  active: z.boolean().optional(),
});

export const submitTestSchema = z.object({
  answers: z.array(z.number().int().min(0)).min(1, 'Must answer all questions'),
});

export const startTestSchema = z.object({
  citizenid: z.string().min(1, 'Citizen ID is required'),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type SubmitTestInput = z.infer<typeof submitTestSchema>;
