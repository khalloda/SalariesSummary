/**
 * Contract Record Comparison Utility
 * Compares contract records to detect duplicates and calculate similarity
 */

export interface ContractData {
  employeeId: string | null;
  employeeName: string | null;
  employeeCode: string | null;
  contractDate: Date | null;
  contractDuration: string | null;
  comments: string | null;
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
 * Compare two contract records and calculate similarity
 */
export function compareContractRecords(
  existing: ContractData,
  incoming: ContractData
): ComparisonResult {
  const differences: Array<{ field: string; existing: any; incoming: any }> = [];
  let matchingFields = 0;
  let totalFields = 0;

  const fieldsToCompare: Array<keyof ContractData> = [
    'employeeId',
    'employeeCode',
    'contractDate',
    'contractDuration',
    'comments'
  ];

  // Compare dates
  const compareDates = (a: Date | null | undefined, b: Date | null | undefined): boolean => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.getTime() === b.getTime();
  };

  for (const field of fieldsToCompare) {
    totalFields++;
    const existingValue = existing[field];
    const incomingValue = incoming[field];

    let isMatch = false;

    if (field === 'contractDate') {
      isMatch = compareDates(existingValue as Date | null, incomingValue as Date | null);
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
    similarity: Math.round(similarity * 100) / 100,
    differences
  };
}

