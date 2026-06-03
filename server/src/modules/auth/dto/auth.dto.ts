import { z } from 'zod';

export const callbackQuerySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type CallbackQueryInput = z.infer<typeof callbackQuerySchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
