import { z } from 'zod';

export const createLedgerEntrySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  content: z.string().min(1, 'Content is required').max(50000),
});

export const updateLedgerEntrySchema = z.object({
  title: z.string().min(3).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  pinned: z.boolean().optional(),
});

export const signEntrySchema = z.object({
  entryId: z.number().int().positive(),
});

export type CreateLedgerEntryInput = z.infer<typeof createLedgerEntrySchema>;
export type UpdateLedgerEntryInput = z.infer<typeof updateLedgerEntrySchema>;
