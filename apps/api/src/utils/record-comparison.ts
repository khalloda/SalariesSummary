/**
 * Record Comparison Utility
 * Compares salary records to detect duplicates and calculate similarity
 */

export interface SalaryRecordData {
  employeeId: string;
  year: number;
  month: number;
  basicSalary: number;
  directAdditions: number;
  indirectAdditions: number;
  yearlyIncrease: number;
  bonuses: number;
  salaryDeductions: number;
  grossDeductions: number;
  gross: number;
  net: number;
  additionsBreakdown?: any;
  deductionsBreakdown?: any;
  paymentMethod?: string | null;
  accountNumber?: string | null;
  notes?: string | null;
  category?: string | null;
}

export interface ComparisonResult {
  isIdentical: boolean;
  similarity: number; // 0-100 percentage
  differences: Array<{
    field: string;
    existing: any;
    incoming: any;
  }>;
}

/**
 * Compare two salary records and calculate similarity
 */
export function compareSalaryRecords(
  existing: SalaryRecordData,
  incoming: SalaryRecordData
): ComparisonResult {
  const differences: Array<{ field: string; existing: any; incoming: any }> = [];
  let matchingFields = 0;
  let totalFields = 0;

  // Fields to compare (excluding employeeId, year, month which are identifiers)
  const fieldsToCompare: Array<keyof SalaryRecordData> = [
    'basicSalary',
    'directAdditions',
    'indirectAdditions',
    'yearlyIncrease',
    'bonuses',
    'salaryDeductions',
    'grossDeductions',
    'gross',
    'net',
    'paymentMethod',
    'accountNumber',
    'notes',
    'category'
  ];

  // Compare numeric fields with tolerance for floating point differences
  const compareNumeric = (a: number, b: number, tolerance: number = 0.01): boolean => {
    return Math.abs(a - b) < tolerance;
  };

  // Compare JSON fields
  const compareJSON = (a: any, b: any): boolean => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    try {
      const aStr = typeof a === 'string' ? a : JSON.stringify(a);
      const bStr = typeof b === 'string' ? b : JSON.stringify(b);
      return aStr === bStr;
    } catch {
      return false;
    }
  };

  for (const field of fieldsToCompare) {
    totalFields++;
    const existingValue = existing[field];
    const incomingValue = incoming[field];

    let isMatch = false;

    if (field === 'additionsBreakdown' || field === 'deductionsBreakdown') {
      isMatch = compareJSON(existingValue, incomingValue);
    } else if (typeof existingValue === 'number' && typeof incomingValue === 'number') {
      isMatch = compareNumeric(existingValue, incomingValue);
    } else {
      // String comparison (normalize null/undefined)
      const existingStr = existingValue ?? null;
      const incomingStr = incomingValue ?? null;
      isMatch = existingStr === incomingStr;
    }

    if (isMatch) {
      matchingFields++;
    } else {
      differences.push({
        field,
        existing: existingValue,
        incoming: incomingValue
      });
    }
  }

  const similarity = totalFields > 0 ? (matchingFields / totalFields) * 100 : 100;
  const isIdentical = differences.length === 0;

  return {
    isIdentical,
    similarity: Math.round(similarity * 100) / 100, // Round to 2 decimal places
    differences
  };
}

/**
 * Check if a record should be skipped (100% identical)
 */
export function shouldSkipRecord(comparison: ComparisonResult): boolean {
  return comparison.isIdentical;
}

/**
 * Check if a record needs user review (similarity < 100%)
 */
export function needsUserReview(comparison: ComparisonResult): boolean {
  return !comparison.isIdentical && comparison.similarity > 0;
}

