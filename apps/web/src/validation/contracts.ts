import { z } from 'zod';

/**
 * Contract form validation schema (frontend)
 * Validates contract form inputs before submission
 */

export const ContractFormSchema = z
  .object({
    employeeId: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v === '' ? null : v)),
    employeeName: z
      .string()
      .max(200, 'Employee name too long')
      .optional()
      .nullable()
      .transform((v) => (v === '' ? null : v)),
    employeeCode: z
      .string()
      .max(50, 'Employee code too long')
      .optional()
      .nullable()
      .transform((v) => (v === '' ? null : v)),
    contractDate: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v === '' ? null : v)),
    contractDuration: z
      .string()
      .max(200, 'Contract duration too long')
      .optional()
      .nullable()
      .transform((v) => (v === '' ? null : v)),
    comments: z
      .string()
      .max(1000, 'Comments too long')
      .optional()
      .nullable()
      .transform((v) => (v === '' ? null : v)),
  })
  .refine(
    (data) => {
      // Either employeeId or employeeName must be provided
      return (
        data.employeeId !== null ||
        (data.employeeName !== null && data.employeeName !== undefined && data.employeeName.trim() !== '')
      );
    },
    {
      message: 'Either employee or employee name must be provided',
      path: ['employeeId'],
    }
  );

export type ContractFormValues = z.infer<typeof ContractFormSchema>;
