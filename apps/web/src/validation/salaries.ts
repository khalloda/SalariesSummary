import { z } from 'zod';

/**
 * Salary form validation schema (frontend)
 * Ensures core required fields are present and numeric fields are valid numbers.
 */

const NumberFromInput = z
  .union([z.number(), z.string()])
  .transform((value) => {
    const num = typeof value === 'number' ? value : parseFloat(value || '0');
    return Number.isFinite(num) ? num : 0;
  })
  .refine((n) => !Number.isNaN(n), { message: 'Invalid number' });

export const SalaryFormSchema = z.object({
  employeeId: z
    .string()
    .min(1, 'Employee is required'),
  year: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === 'number' ? v : parseInt(v, 10)))
    .refine((v) => Number.isInteger(v) && v >= 2000 && v <= 2100, {
      message: 'Year must be between 2000 and 2100',
    }),
  month: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === 'number' ? v : parseInt(v, 10)))
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 12, {
      message: 'Month must be between 1 and 12',
    }),
  category: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v)),
  basicSalary: NumberFromInput,
  phoneAllowance: NumberFromInput.optional(),
  transportationAllowance: NumberFromInput.optional(),
  accommodationAllowance: NumberFromInput.optional(),
  otherAllowances: NumberFromInput.optional(),
  yearlyIncrease: NumberFromInput.optional(),
  socialInsurance: NumberFromInput.optional(),
  taxes: NumberFromInput.optional(),
  medicalInsurance: NumberFromInput.optional(),
  annualBonus: NumberFromInput.optional(),
  monthlyBonus: NumberFromInput.optional(),
  medicalInsuranceDeducted: NumberFromInput.optional(),
  lawyersTaxes: NumberFromInput.optional(),
  otherBankWithdrawal: NumberFromInput.optional(),
  loansDeductions: NumberFromInput.optional(),
  phoneDeduction: NumberFromInput.optional(),
  unpaidVacation: NumberFromInput.optional(),
  lateArrivals: NumberFromInput.optional(),
  timeSheetDeductions: NumberFromInput.optional(),
  otherDeductions: NumberFromInput.optional(),
});

export type SalaryFormValues = z.infer<typeof SalaryFormSchema>;

/**
 * Lightweight validation for bulk salary year/month inputs.
 */
export const BulkSalaryMetaSchema = z.object({
  year: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === 'number' ? v : parseInt(v, 10)))
    .refine((v) => Number.isInteger(v) && v >= 2000 && v <= 2100, {
      message: 'Year must be between 2000 and 2100',
    }),
  month: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === 'number' ? v : parseInt(v, 10)))
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 12, {
      message: 'Month must be between 1 and 12',
    }),
});

