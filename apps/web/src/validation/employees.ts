import { z } from 'zod';

/**
 * Employee form validation schema
 * Focuses on key fields that affect core behavior and reports.
 */

export const EmployeeFormSchema = z.object({
  name: z
    .string()
    .min(1, 'English name is required')
    .max(200, 'Name is too long'),
  nameArabic: z
    .string()
    .max(200, 'Arabic name is too long')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v)),
  employeeCode: z
    .string()
    .max(100, 'System ID is too long')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v)),
  category: z
    .string()
    .max(100, 'Category is too long')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v)),
  jobTitle: z
    .string()
    .max(200, 'Job title is too long')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v)),
  department: z
    .string()
    .max(200, 'Department is too long')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v)),
  status: z
    .string()
    .optional()
    .default('Active'),
});

export type EmployeeFormValues = z.infer<typeof EmployeeFormSchema>;

