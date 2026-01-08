/**
 * Common Validation Schemas
 * Shared schemas used across multiple endpoints
 */

import { z } from 'zod';

/**
 * CUID validation (Prisma default ID format)
 */
export const CuidSchema = z.string().cuid();

/**
 * Email validation
 */
export const EmailSchema = z.string().email('Invalid email format');

/**
 * Year validation (2000-2100)
 */
export const YearSchema = z.coerce
  .number()
  .int('Year must be an integer')
  .min(2000, 'Year must be >= 2000')
  .max(2100, 'Year must be <= 2100');

/**
 * Month validation (1-12)
 */
export const MonthSchema = z.coerce
  .number()
  .int('Month must be an integer')
  .min(1, 'Month must be >= 1')
  .max(12, 'Month must be <= 12');

/**
 * Date string validation (ISO format)
 */
export const DateStringSchema = z.string().datetime({ message: 'Invalid date format' });

/**
 * Date validation (accepts Date objects or ISO strings)
 */
export const DateSchema = z.union([
  z.date(),
  z.string().datetime().transform((str) => new Date(str)),
]);

/**
 * Positive number validation
 */
export const PositiveNumberSchema = z.coerce.number().positive('Must be a positive number');

/**
 * Non-negative number validation
 */
export const NonNegativeNumberSchema = z.coerce
  .number()
  .nonnegative('Must be a non-negative number');

/**
 * Boolean from string (for query parameters)
 */
export const BooleanFromStringSchema = z
  .string()
  .transform((val) => val === 'true')
  .or(z.boolean());

/**
 * Optional boolean from string
 */
export const OptionalBooleanFromStringSchema = z
  .string()
  .optional()
  .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined))
  .or(z.boolean().optional());

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Sort order schema
 */
export const SortOrderSchema = z.enum(['asc', 'desc']);

