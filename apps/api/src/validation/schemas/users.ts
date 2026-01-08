/**
 * User Management Validation Schemas
 * Schemas for user CRUD operations
 */

import { z } from 'zod';
import { CuidSchema, EmailSchema } from './common.js';
import { RoleNamesArraySchema } from './rbac.js';

/**
 * User creation schema
 */
export const UserCreateSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be at most 50 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    email: EmailSchema.optional(),
    fullName: z.string().min(1, 'Full name is required').max(200, 'Full name too long'),
    systemId: z.string().max(50, 'System ID too long').optional(),
    isActive: z.boolean().optional().default(true),
    roles: RoleNamesArraySchema,
  })
  .strict();

/**
 * User update schema (all fields optional except those that can't be changed)
 */
export const UserUpdateSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be at most 50 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
      .optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
      .optional(),
    email: EmailSchema.optional().nullable(),
    fullName: z.string().min(1, 'Full name is required').max(200, 'Full name too long').optional(),
    systemId: z.string().max(50, 'System ID too long').optional().nullable(),
    isActive: z.boolean().optional(),
    roles: RoleNamesArraySchema.optional(),
  })
  .strict();

/**
 * User ID parameter schema
 */
export const UserIdParamSchema = z.object({
  id: CuidSchema,
});

