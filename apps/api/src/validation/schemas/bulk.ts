/**
 * Bulk Operations Validation Schemas
 * Schemas for bulk salary and other bulk operation endpoints
 */

import { z } from 'zod';
import { YearSchema, MonthSchema, CuidSchema } from './common.js';

/**
 * Path parameters for bulk salary last month endpoint
 */
export const BulkSalaryParamsSchema = z.object({
  year: YearSchema,
  month: MonthSchema,
});

/**
 * Individual salary record for bulk create
 */
export const BulkSalaryRecordSchema = z.object({
  employeeId: CuidSchema,
  employeeName: z.string().min(1, 'Employee name is required'),
  basicSalary: z.number().nonnegative('Basic salary must be non-negative'),
  phoneAllowance: z.number().nonnegative().optional().default(0),
  transportationAllowance: z.number().nonnegative().optional().default(0),
  accommodationAllowance: z.number().nonnegative().optional().default(0),
  otherAllowances: z.number().nonnegative().optional().default(0),
  yearlyIncrease: z.number().nonnegative().optional().default(0),
  bonuses: z.number().nonnegative().optional().default(0),
  bankWithdrawals: z.number().nonnegative().optional().default(0),
  loans: z.number().nonnegative().optional().default(0),
  phoneDeductions: z.number().nonnegative().optional().default(0),
  unpaidVacation: z.number().nonnegative().optional().default(0),
  lateArrivals: z.number().nonnegative().optional().default(0),
  timeSheet: z.number().nonnegative().optional().default(0),
  otherDeductions: z.number().nonnegative().optional().default(0),
  notes: z.string().optional().nullable(),
});

/**
 * Body schema for bulk salary create
 */
export const BulkSalaryCreateBodySchema = z.object({
  year: YearSchema,
  month: MonthSchema,
  employees: z.array(BulkSalaryRecordSchema).min(1, 'At least one employee is required'),
});
