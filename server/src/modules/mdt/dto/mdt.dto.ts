import { z } from 'zod';

export const createCaseSchema = z.object({
  citizenid: z.string().optional(),
  citizenName: z.string().optional(),
  plate: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  charges: z.array(z.string()).optional().default([]),
  evidenceUrls: z.array(z.string().url()).optional().default([]),
  involvedParties: z.array(z.string()).optional().default([]),
});

export const updateCaseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  status: z.enum(['OPEN', 'CLOSED', 'ARCHIVED']).optional(),
  charges: z.array(z.string()).optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
  involvedParties: z.array(z.string()).optional(),
});

export const issueWarrantSchema = z.object({
  citizenid: z.string().min(1),
  citizenName: z.string().optional(),
  plate: z.string().optional(),
  reason: z.string().min(1).max(1000),
  expiresInHours: z.number().int().positive().optional(),
});

export const searchSchema = z.object({
  query: z.string().min(1).max(100),
  type: z.enum(['citizenid', 'name', 'plate']).optional().default('citizenid'),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type IssueWarrantInput = z.infer<typeof issueWarrantSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
