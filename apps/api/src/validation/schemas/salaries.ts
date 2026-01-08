/**
 * Salary Validation Schemas
 * Schemas for salary record CRUD operations
 */

import { z } from 'zod';
import { CuidSchema, YearSchema, MonthSchema, NonNegativeNumberSchema } from './common.js';

/**
 * Base salary record creation schema (without refinements)
 * Used for .omit() operations which don't work with refinements
 */
const SalaryCreateBaseSchema = z
  .object({
    employeeId: CuidSchema,
    year: YearSchema,
    month: MonthSchema,
    monthName: z.string().max(50).optional(),
    basicSalary: NonNegativeNumberSchema,
    directAdditions: NonNegativeNumberSchema.optional().default(0),
    indirectAdditions: NonNegativeNumberSchema.optional().default(0),
    yearlyIncrease: NonNegativeNumberSchema.optional().default(0),
    bonuses: NonNegativeNumberSchema.optional().default(0),
    salaryDeductions: NonNegativeNumberSchema.optional().default(0),
    grossDeductions: NonNegativeNumberSchema.optional().default(0),
    gross: NonNegativeNumberSchema.optional(),
    net: NonNegativeNumberSchema.optional(),
    additionsBreakdown: z.record(z.any()).optional().nullable(), // JSON object
    deductionsBreakdown: z.record(z.any()).optional().nullable(), // JSON object
    paymentMethod: z.string().max(100).optional().nullable(),
    accountNumber: z.string().max(100).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    category: z.string().max(100).optional().nullable(),
    sourceFile: z.string().max(200).optional().nullable(),
  })
  .strict();

/**
 * Salary record creation schema
 * Includes all fields from SalaryRecord model with validation refinements
 */
export const SalaryCreateSchema = SalaryCreateBaseSchema.refine(
  (data) => {
    // Gross should be >= Net if both are provided
    if (data.gross !== undefined && data.net !== undefined) {
      return data.gross >= data.net;
    }
    return true;
  },
  {
    message: 'Gross salary must be greater than or equal to net salary',
    path: ['gross'],
  }
);

/**
 * Salary record update schema
 * All fields optional for partial updates
 */
export const SalaryUpdateSchema = z
  .object({
    basicSalary: NonNegativeNumberSchema.optional(),
    directAdditions: NonNegativeNumberSchema.optional(),
    indirectAdditions: NonNegativeNumberSchema.optional(),
    yearlyIncrease: NonNegativeNumberSchema.optional(),
    bonuses: NonNegativeNumberSchema.optional(),
    salaryDeductions: NonNegativeNumberSchema.optional(),
    grossDeductions: NonNegativeNumberSchema.optional(),
    gross: NonNegativeNumberSchema.optional(),
    net: NonNegativeNumberSchema.optional(),
    additionsBreakdown: z.record(z.any()).optional().nullable(),
    deductionsBreakdown: z.record(z.any()).optional().nullable(),
    paymentMethod: z.string().max(100).optional().nullable(),
    accountNumber: z.string().max(100).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    category: z.string().max(100).optional().nullable(),
  })
  .strict()
  .refine(
    (data) => {
      // Gross should be >= Net if both are provided
      if (data.gross !== undefined && data.net !== undefined) {
        return data.gross >= data.net;
      }
      return true;
    },
    {
      message: 'Gross salary must be greater than or equal to net salary',
      path: ['gross'],
    }
  );

/**
 * Salary ID parameter schema
 */
export const SalaryIdParamSchema = z.object({
  id: CuidSchema,
});

/**
 * Salary query parameters schema
 */
export const SalaryQuerySchema = z.object({
  employeeId: CuidSchema.optional(),
  year: YearSchema.optional(),
  month: MonthSchema.optional(),
});

/**
 * Bulk salary creation schema
 */
export const BulkSalaryCreateSchema = z.object({
  year: YearSchema,
  month: MonthSchema,
  salaries: z.array(SalaryCreateBaseSchema.omit({ year: true, month: true })).min(1, 'At least one salary record is required'),
});

