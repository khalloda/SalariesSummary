/**
 * Bonus Validation Schemas
 * Schemas for annual bonus CRUD operations
 */

import { z } from 'zod';
import { CuidSchema, YearSchema, NonNegativeNumberSchema } from './common.js';

/**
 * Annual bonus creation schema
 */
export const BonusCreateSchema = z
  .object({
    employeeId: CuidSchema,
    year: YearSchema,
    amount: NonNegativeNumberSchema,
    firstHalf: NonNegativeNumberSchema.optional().default(0),
    secondHalf: NonNegativeNumberSchema.optional().default(0),
    notes: z.string().max(1000, 'Notes too long').optional().nullable(),
  })
  .strict()
  .refine(
    (data) => {
      // First half + second half should approximately equal amount (allow small rounding differences)
      const total = (data.firstHalf || 0) + (data.secondHalf || 0);
      const difference = Math.abs(total - data.amount);
      return difference < 0.01; // Allow 1 cent difference for rounding
    },
    {
      message: 'First half + second half should equal the total bonus amount',
      path: ['firstHalf'],
    }
  );

/**
 * Annual bonus update schema
 * All fields optional for partial updates
 */
export const BonusUpdateSchema = z
  .object({
    previousYearNet: NonNegativeNumberSchema.optional().nullable(),
    previousYearGross: NonNegativeNumberSchema.optional().nullable(),
    currentYearNet: NonNegativeNumberSchema.optional().nullable(),
    currentYearGross: NonNegativeNumberSchema.optional().nullable(),
    annualIncreaseNet: NonNegativeNumberSchema.optional().nullable(),
    annualIncreaseGross: NonNegativeNumberSchema.optional().nullable(),
    amount: NonNegativeNumberSchema.optional(),
    firstHalf: NonNegativeNumberSchema.optional(),
    secondHalf: NonNegativeNumberSchema.optional(),
    previousYearBonus: NonNegativeNumberSchema.optional().nullable(),
    reflectedInMonths: z.coerce.number().int().min(0).max(12).optional().nullable(),
    reflectedInPercent: NonNegativeNumberSchema.optional().nullable(),
    remainingFromPrevious: NonNegativeNumberSchema.optional().nullable(),
    yearComparison: z.record(z.any()).optional().nullable(),
    notes: z.string().max(1000, 'Notes too long').optional().nullable(),
  })
  .strict()
  .refine(
    (data) => {
      // If all three are provided, validate the relationship
      if (data.amount !== undefined && data.firstHalf !== undefined && data.secondHalf !== undefined) {
        const total = data.firstHalf + data.secondHalf;
        const difference = Math.abs(total - data.amount);
        return difference < 0.01;
      }
      return true;
    },
    {
      message: 'First half + second half should equal the total bonus amount',
      path: ['firstHalf'],
    }
  );

/**
 * Bonus ID parameter schema
 */
export const BonusIdParamSchema = z.object({
  id: CuidSchema,
});

/**
 * Bonus query parameters schema
 */
export const BonusQuerySchema = z.object({
  employeeId: CuidSchema.optional(),
  year: YearSchema.optional(),
});

