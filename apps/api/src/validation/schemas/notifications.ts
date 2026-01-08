/**
 * Notification Validation Schemas
 * Schemas for notification settings, email configuration, and send requests
 */

import { z } from 'zod';
import { EmailSchema } from './common.js';

/**
 * Email authentication schema
 */
export const EmailAuthSchema = z.object({
  user: z.string().min(1, 'Email user is required').max(200, 'Email user too long'),
  password: z.string().min(1, 'Email password is required').max(500, 'Email password too long'),
}).strict();

/**
 * Email configuration schema
 */
export const EmailConfigurationSchema = z.object({
  host: z.string().min(1, 'Email host is required').max(200, 'Email host too long'),
  port: z.coerce.number().int().positive().max(65535, 'Port must be between 1 and 65535'),
  secure: z.boolean().optional().default(false),
  auth: EmailAuthSchema,
}).strict();

/**
 * Notification recipient schema
 */
export const NotificationRecipientSchema = z.object({
  email: EmailSchema,
  name: z.string().max(200).optional(),
}).strict();

/**
 * Notification language schema
 */
export const NotificationLanguageSchema = z.enum(['en', 'ar']).default('en');

/**
 * Notification settings schema
 */
export const NotificationSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  contractRenewalDays: z.coerce.number().int().positive().max(365, 'Contract renewal days must be between 1 and 365').optional(),
  idExpiryDays: z.coerce.number().int().positive().max(365, 'ID expiry days must be between 1 and 365').optional(),
  recipients: z.array(NotificationRecipientSchema).min(1, 'At least one recipient is required').optional(),
  baseUrl: z.string().url('Base URL must be a valid URL').max(500, 'Base URL too long').optional(),
  language: NotificationLanguageSchema.optional(),
}).strict();

/**
 * Type exports
 */
export type EmailAuth = z.infer<typeof EmailAuthSchema>;
export type EmailConfiguration = z.infer<typeof EmailConfigurationSchema>;
export type NotificationRecipient = z.infer<typeof NotificationRecipientSchema>;
export type NotificationLanguage = z.infer<typeof NotificationLanguageSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;

