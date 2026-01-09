import { z } from 'zod';

/**
 * Login form validation schema
 * Mirrors backend LoginRequestSchema but tailored for frontend UX
 */
export const LoginFormSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(100, 'Username is too long'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof LoginFormSchema>;

