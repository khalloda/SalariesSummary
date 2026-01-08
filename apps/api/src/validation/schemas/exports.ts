/**
 * Export Validation Schemas
 * Schemas for export endpoint requests
 */

import { z } from 'zod';
import { YearSchema, MonthSchema, CuidSchema } from './common.js';
import { EmployeeCategorySchema } from './employees.js';

/**
 * Export format enum
 */
export const ExportFormatSchema = z.enum(['pdf', 'xlsx', 'csv']);

/**
 * Annual employee report export schema
 */
export const AnnualEmployeeExportSchema = z.object({
  employeeId: CuidSchema,
  year: YearSchema.optional(),
  format: ExportFormatSchema.optional().default('pdf'),
});

/**
 * Salary changes export schema
 */
export const SalaryChangesExportSchema = z.object({
  year: YearSchema.optional(),
  category: EmployeeCategorySchema.optional(),
  format: ExportFormatSchema.optional().default('pdf'),
});

/**
 * Category totals export schema
 */
export const CategoryTotalsExportSchema = z.object({
  year: YearSchema,
  month: MonthSchema,
  format: ExportFormatSchema.optional().default('pdf'),
});

/**
 * Monthly summary export schema
 */
export const MonthlySummaryExportSchema = z.object({
  year: YearSchema,
  month: MonthSchema,
  format: ExportFormatSchema.optional().default('pdf'),
});

/**
 * Annual bonus export schema
 */
export const AnnualBonusExportSchema = z.object({
  year: YearSchema.optional(),
  category: EmployeeCategorySchema.optional(),
  format: ExportFormatSchema.optional().default('pdf'),
});

/**
 * Additions/Deductions export schema
 */
export const AdditionsDeductionsExportSchema = z.object({
  year: YearSchema.optional(),
  month: MonthSchema.optional(),
  category: EmployeeCategorySchema.optional(),
  format: ExportFormatSchema.optional().default('pdf'),
});

/**
 * Bonus comparison export schema
 */
export const BonusComparisonExportSchema = z.object({
  year: YearSchema.optional(),
  category: EmployeeCategorySchema.optional(),
  format: ExportFormatSchema.optional().default('pdf'),
});

