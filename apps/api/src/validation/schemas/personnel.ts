/**
 * Personnel Validation Schemas
 * Schemas for personnel endpoints
 */

import { z } from 'zod';
import { CuidSchema, NonNegativeNumberSchema } from './common.js';
import { EmployeeCategorySchema } from './employees.js';

/**
 * Path parameters for personnel endpoints
 */
export const PersonnelParamsSchema = z.object({
  employeeId: CuidSchema,
});

/**
 * Query schema for personnel compliance report
 */
export const PersonnelComplianceQuerySchema = z.object({
  category: EmployeeCategorySchema.optional(),
  minCompliance: NonNegativeNumberSchema.optional().default(0),
});

/**
 * Query schema for personnel assets report
 */
export const PersonnelAssetsQuerySchema = z.object({
  category: EmployeeCategorySchema.optional(),
});

/**
 * Query schema for personnel dashboard
 * (No query parameters currently, but schema exists for future use)
 */
export const PersonnelDashboardQuerySchema = z.object({}).optional();

/**
 * Query schema for personnel diagnostics
 */
export const PersonnelDiagnosticsQuerySchema = z.object({
  filePath: z.string().optional(),
});
