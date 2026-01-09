import { z } from 'zod';

/**
 * Frontend user form validation schemas
 * These roughly mirror the backend Zod schemas but are optimized for UX.
 */

const BaseUserSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(100, 'Username is too long'),
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(200, 'Full name is too long'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v)),
  systemId: z
    .string()
    .max(100, 'System ID is too long')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v)),
  isActive: z.boolean().optional().default(true),
  roles: z
    .array(z.string())
    .min(1, 'At least one role is required'),
});

export const UserCreateFormSchema = BaseUserSchema.extend({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string().min(8, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const UserUpdateFormSchema = BaseUserSchema.extend({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .optional()
    .or(z.literal('')),
  confirmPassword: z
    .string()
    .optional()
    .or(z.literal('')),
}).refine(
  (data) =>
    // If password is provided, confirmPassword must match
    !data.password ||
    data.password === (data.confirmPassword ?? ''),
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  },
);

export type UserFormCreateValues = z.infer<typeof UserCreateFormSchema>;
export type UserFormUpdateValues = z.infer<typeof UserUpdateFormSchema>;

