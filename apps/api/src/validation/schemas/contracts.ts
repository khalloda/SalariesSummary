/**
 * Contract Validation Schemas
 * Schemas for contract record CRUD operations
 */

import { z } from 'zod';
import { CuidSchema, DateSchema } from './common.js';

/**
 * Contract record creation schema
 */
export const ContractCreateSchema = z
  .object({
    employeeId: CuidSchema.optional().nullable(),
    employeeName: z.string().max(200, 'Employee name too long').optional().nullable(),
    employeeCode: z.string().max(50, 'Employee code too long').optional().nullable(),
    contractDate: DateSchema.optional().nullable(),
    contractDuration: z.string().max(200, 'Contract duration too long').optional().nullable(),
    comments: z.string().max(1000, 'Comments too long').optional().nullable(),
  })
  .strict()
  .refine(
    (data) => {
      // Either employeeId or employeeName must be provided
      return data.employeeId !== null || (data.employeeName !== null && data.employeeName !== undefined);
    },
    {
      message: 'Either employeeId or employeeName must be provided',
      path: ['employeeId'],
    }
  );

/**
 * Contract record update schema
 */
export const ContractUpdateSchema = z
  .object({
    employeeId: CuidSchema.optional().nullable(),
    employeeName: z.string().max(200, 'Employee name too long').optional().nullable(),
    employeeCode: z.string().max(50, 'Employee code too long').optional().nullable(),
    contractDate: DateSchema.optional().nullable(),
    contractDuration: z.string().max(200, 'Contract duration too long').optional().nullable(),
    comments: z.string().max(1000, 'Comments too long').optional().nullable(),
  })
  .strict();

/**
 * Contract ID parameter schema
 */
export const ContractIdParamSchema = z.object({
  id: CuidSchema,
});

/**
 * Contract query parameters schema
 */
export const ContractQuerySchema = z.object({
  employeeId: CuidSchema.optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

