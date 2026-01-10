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

/**
 * Path parameter schemas for exports
 */

/**
 * Employee ID path parameter schema
 */
export const ExportEmployeeParamsSchema = z.object({
  id: CuidSchema,
});

/**
 * Query schema for employee annual export
 */
export const EmployeeAnnualExportQuerySchema = z.object({
  year: YearSchema.optional(),
  format: ExportFormatSchema.optional().default('csv'),
});

/**
 * Query schema for salary changes export
 */
export const SalaryChangesExportQuerySchema = z.object({
  year: YearSchema.optional(),
  format: ExportFormatSchema.optional().default('pdf'),
});

/**
 * Employee card body schema
 */
export const EmployeeCardBodySchema = z.object({
  employeeId: CuidSchema,
});

/**
 * Additions/Deductions export body schema
 * Validates required fields while allowing flexible nested data structures
 */
export const AdditionsDeductionsExportBodySchema = z.object({
  year: YearSchema,
  detailView: z.string().optional(),
  data: z.object({
    additions: z.any(), // Complex nested structure - allow flexible data
    deductions: z.any(), // Complex nested structure - allow flexible data
  }).passthrough(), // Allow additional properties
});

/**
 * Annual bonus export body schema
 */
export const AnnualBonusExportBodySchema = z.object({
  year: YearSchema.optional(),
  includeConsultants: z.boolean().optional(),
  viewMode: z.string().optional(),
  exportMode: z.string().optional(),
  showHalves: z.boolean().optional(),
  data: z.object({
    categoryTotals: z.any(), // Complex nested structure
  }).passthrough(), // Allow additional properties
});

/**
 * Monthly summary export body schema
 */
export const MonthlySummaryExportBodySchema = z.object({
  year: YearSchema,
  data: z.object({
    monthlyData: z.any(), // Complex nested structure
  }).passthrough(), // Allow additional properties
});

/**
 * Document compliance export body schema
 */
export const DocumentComplianceExportBodySchema = z.object({
  data: z.object({
    employees: z.array(z.any()), // Array of employee objects with complex structure
  }).passthrough(),
  categoryFilter: z.string().optional(),
  minComplianceFilter: z.number().optional(),
});

/**
 * Asset inventory export body schema
 */
export const AssetInventoryExportBodySchema = z.object({
  data: z.object({
    employees: z.array(z.any()), // Array of employee objects with complex structure
  }).passthrough(),
  categoryFilter: z.string().optional(),
  assetFilter: z.string().optional(),
});

/**
 * Personnel dashboard export body schema
 */
export const PersonnelDashboardExportBodySchema = z.object({
  data: z.any().passthrough(), // Flexible structure for dashboard data
});

/**
 * Employee tenure export body schema
 */
export const EmployeeTenureExportBodySchema = z.object({
  year: YearSchema.optional(),
  summary: z.any().optional(),
  tenureRanges: z.array(z.any()).optional(),
  categoryAverages: z.any().optional(),
  employees: z.array(z.any()).min(1, 'At least one employee is required'),
});
