/**
 * Authentication Validation Schemas
 * Schemas for authentication endpoints and JWT payloads
 */

import { z } from 'zod';
import { RoleNameSchema } from './rbac.js';

/**
 * Login request schema
 */
export const LoginRequestSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100, 'Username too long'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Auth user payload schema (JWT payload)
 * Note: JWT automatically adds iat and exp, so we use passthrough() to allow extra fields
 */
export const AuthUserPayloadSchema = z.object({
  id: z.string().cuid('Invalid user ID format'),
  username: z.string().min(1, 'Username is required'),
  fullName: z.string().optional(),
  roles: z.array(RoleNameSchema).min(1, 'User must have at least one role'),
  iat: z.number().optional(), // Issued at (JWT standard)
  exp: z.number().optional(), // Expiration (JWT standard)
}).passthrough(); // Allow additional JWT fields

/**
 * Type export for AuthUserPayload
 */
export type AuthUserPayload = z.infer<typeof AuthUserPayloadSchema>;

