import { z } from 'zod';

export const transferSchema = z.object({
  targetCitizenid: z.string().min(1, 'Target citizen ID required'),
  amount: z.number().int().positive('Amount must be positive').max(10000000, 'Amount exceeds maximum'),
});

export type TransferInput = z.infer<typeof transferSchema>;
