/**
 * Report Validation Schemas
 * Schemas for report query parameters and filters
 */

import { z } from 'zod';
import { YearSchema, MonthSchema, CuidSchema } from './common.js';
import { OptionalBooleanFromStringSchema } from './common.js';
import { EmployeeCategorySchema } from './employees.js';

/**
 * Base report query schema with common filters
 */
export const BaseReportQuerySchema = z.object({
  year: YearSchema.optional(),
  month: MonthSchema.optional(),
  category: EmployeeCategorySchema.optional(),
  employeeId: CuidSchema.optional(),
});

/**
 * Category totals report query schema
 */
export const CategoryTotalsQuerySchema = BaseReportQuerySchema.extend({
  year: YearSchema, // Required for category totals
  month: MonthSchema, // Required for category totals
});

/**
 * Monthly summary report query schema
 */
export const MonthlySummaryQuerySchema = BaseReportQuerySchema.extend({
  year: YearSchema, // Required for monthly summary
  month: MonthSchema, // Required for monthly summary
});

/**
 * Salary changes report query schema
 */
export const SalaryChangesQuerySchema = BaseReportQuerySchema.extend({
  year: YearSchema.optional(),
  // Can filter by category or employeeId
});

/**
 * Annual bonus report query schema
 */
export const AnnualBonusQuerySchema = BaseReportQuerySchema.extend({
  year: YearSchema.optional(),
  // Can filter by category or employeeId
});

/**
 * Employee annual report query schema
 */
export const EmployeeAnnualQuerySchema = z.object({
  employeeId: CuidSchema, // Required
  year: YearSchema.optional(),
});

/**
 * Bonus comparison query schema
 */
export const BonusComparisonQuerySchema = z.object({
  year: YearSchema.optional(),
  category: EmployeeCategorySchema.optional(),
});

/**
 * Contract renewals report query schema
 */
export const ContractRenewalsQuerySchema = z.object({
  year: YearSchema.optional(),
  month: MonthSchema.optional(),
  category: EmployeeCategorySchema.optional(),
  hideRenewed: OptionalBooleanFromStringSchema.optional(),
});

/**
 * Quick stats query schema
 */
export const QuickStatsQuerySchema = z.object({
  year: YearSchema.optional(),
  month: MonthSchema.optional(),
});

/**
 * Additions/Deductions breakdown query schema
 */
export const AdditionsDeductionsQuerySchema = BaseReportQuerySchema.extend({
  year: YearSchema.optional(),
  month: MonthSchema.optional(),
});

/**
 * Employee card query schema
 */
export const EmployeeCardQuerySchema = z.object({
  employeeId: CuidSchema, // Required
  format: z.enum(['pdf', 'xlsx']).optional().default('pdf'),
});

/**
 * Joiners and leavers report query schema
 */
export const JoinersLeaversQuerySchema = z.object({
  year: YearSchema.optional(),
});

/**
 * Bonus incentive analysis query schema
 */
export const BonusIncentiveAnalysisQuerySchema = z.object({
  year: YearSchema.optional(),
});

/**
 * Employee tenure report query schema
 */
export const EmployeeTenureQuerySchema = z.object({
  year: YearSchema.optional(),
});

/**
 * Available years query schema (no params, but schema for consistency)
 */
export const AvailableYearsQuerySchema = z.object({}).optional();