import { z } from 'zod';

/**
 * Bonus form validation schema (frontend)
 * Validates bonus form inputs before submission
 */

const NumberFromInput = z
  .union([z.number(), z.string()])
  .transform((value) => {
    const num = typeof value === 'number' ? value : parseFloat(value || '0');
    return Number.isFinite(num) ? num : 0;
  })
  .refine((n) => !Number.isNaN(n), { message: 'Invalid number' });

export const BonusFormSchema = z
  .object({
    employeeId: z.string().min(1, 'Employee is required'),
    year: z
      .union([z.number(), z.string()])
      .transform((v) => (typeof v === 'number' ? v : parseInt(v, 10)))
      .refine((v) => Number.isInteger(v) && v >= 2000 && v <= 2100, {
        message: 'Year must be between 2000 and 2100',
      }),
    previousYearNet: NumberFromInput.optional(),
    previousYearGross: NumberFromInput.optional(),
    currentYearNet: NumberFromInput.optional(),
    currentYearGross: NumberFromInput.optional(),
    annualIncreaseNet: NumberFromInput.optional(),
    annualIncreaseGross: NumberFromInput.optional(),
    bonusAmount: NumberFromInput,
    bonusFirstHalf: NumberFromInput.optional().nullable(),
    bonusSecondHalf: NumberFromInput.optional().nullable(),
    previousYearBonus: NumberFromInput.optional().nullable(),
    reflectedInMonths: z
      .union([z.number(), z.string()])
      .optional()
      .nullable()
      .transform((v) => {
        if (v === null || v === undefined || v === '') return null;
        const num = typeof v === 'number' ? v : parseInt(String(v), 10);
        return Number.isFinite(num) ? num : null;
      }),
    reflectedInPercent: NumberFromInput.optional().nullable(),
    notes: z
      .string()
      .max(1000, 'Notes too long')
      .optional()
      .nullable()
      .transform((v) => (v === '' ? null : v)),
  })
  .refine(
    (data) => {
      // If both halves are provided, they should sum to bonusAmount (allow small rounding)
      if (
        data.bonusFirstHalf !== null &&
        data.bonusFirstHalf !== undefined &&
        data.bonusSecondHalf !== null &&
        data.bonusSecondHalf !== undefined
      ) {
        const total = data.bonusFirstHalf + data.bonusSecondHalf;
        const difference = Math.abs(total - data.bonusAmount);
        return difference < 0.01;
      }
      return true;
    },
    {
      message: 'First half + second half should equal the total bonus amount',
      path: ['bonusFirstHalf'],
    }
  );

export type BonusFormValues = z.infer<typeof BonusFormSchema>;
