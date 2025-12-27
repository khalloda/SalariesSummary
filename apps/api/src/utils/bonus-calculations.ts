/**
 * Bonus calculation utilities
 * Implements formulas from the bonus workbook analysis
 */

/**
 * Calculate bonus reflected in months
 * Formula: Bonus / Net Salary
 * Returns null if netSalary is 0
 */
export function calculateReflectedInMonths(
  bonus: number,
  netSalary: number
): number | null {
  if (!netSalary || netSalary === 0) return null;
  return bonus / netSalary;
}

/**
 * Calculate bonus reflected as percentage
 * Formula: (Bonus / Net Salary) * 100
 * Returns null if netSalary is 0
 */
export function calculateReflectedInPercent(
  bonus: number,
  netSalary: number
): number | null {
  if (!netSalary || netSalary === 0) return null;
  return (bonus / netSalary) * 100;
}

/**
 * Calculate remaining from previous year
 * Formula: currentBonus - previousBonus
 */
export function calculateRemainingFromPrevious(
  currentBonus: number,
  previousBonus: number | null
): number | null {
  if (previousBonus === null || previousBonus === undefined) return null;
  return currentBonus - previousBonus;
}

/**
 * Calculate year-over-year comparison
 * Formula: (bonusFirstHalf + bonusSecondHalf) - previousYearBonus
 */
export function calculateYearComparison(
  bonusFirstHalf: number | null,
  bonusSecondHalf: number | null,
  previousYearBonus: number | null
): number | null {
  if (previousYearBonus === null || previousYearBonus === undefined) return null;
  const first = bonusFirstHalf || 0;
  const second = bonusSecondHalf || 0;
  return (first + second) - previousYearBonus;
}

/**
 * Calculate growth ratio
 * Formula: ((current - previous) / previous) * 100
 * Returns null if previous is 0
 */
export function calculateGrowthRatio(
  current: number,
  previous: number
): number | null {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Format reflected in months as string
 * Returns "No Bonus" if bonus is 0, otherwise "X.XX Months"
 */
export function formatReflectedInMonths(
  bonus: number,
  netSalary: number
): string {
  if (!bonus || bonus === 0) return 'No Bonus';
  const months = calculateReflectedInMonths(bonus, netSalary);
  if (months === null) return 'No Bonus';
  return `${months.toFixed(2)} Months`;
}

/**
 * Format reflected in percentage as string
 * Returns "No Bonus" if bonus is 0, otherwise "XXX.XX %"
 */
export function formatReflectedInPercent(
  bonus: number,
  netSalary: number
): string {
  if (!bonus || bonus === 0) return 'No Bonus';
  const percent = calculateReflectedInPercent(bonus, netSalary);
  if (percent === null) return 'No Bonus';
  return `${percent.toFixed(2)} %`;
}

