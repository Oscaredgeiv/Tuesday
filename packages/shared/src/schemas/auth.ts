import { z } from 'zod';

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthTokenPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(['admin', 'operator']),
  iat: z.number(),
  exp: z.number(),
});
export type AuthTokenPayload = z.infer<typeof AuthTokenPayloadSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string().datetime(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
